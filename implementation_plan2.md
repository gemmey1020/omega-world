# OMEGA World Command Center Implementation Plan

## Summary
- Build the Command Center as a separate Next.js 16 app at `admin/`, backed by the existing Laravel 12 API under a new `/api/admin/*` surface.
- Preserve the current public PWA and catalog stack, but change checkout from client-only WhatsApp handoff to server-recorded order creation before redirect; without this, tracking, SLA, dispatch, and reporting cannot be authoritative.
- Introduce a unified operations domain that supports both retail merchants and service providers without renaming existing `vendors`; retail vendors will map 1:1 into a new `providers` table with `type=merchant`.
- Use `SSE + polling fallback` for live dashboards, Leaflet + OpenStreetMap for maps, and PostGIS for spatial filtering, zone overlays, density summaries, and provider/order clustering.
- Treat the Opus audit as a hard constraint: every high-cardinality admin list or grid must be virtualized, large datasets must live in mutable stores rather than naïve component state, and all admin rate limits must return structured retry metadata that the UI handles gracefully.

## Acknowledged Constraints And Architectural Trade-Offs
- Separate admin app: better isolation, security boundaries, and deploy independence; higher auth/CORS complexity and some duplicated shell/theme setup.
- Unified retail + service schema: more schema work in Batch 1; avoids a second disruptive rewrite when non-retail dispatch goes live.
- SSE + polling fallback: simpler and cheaper than WebSockets; one-way live telemetry is enough for dispatch and analytics, while mutations remain idempotent HTTP actions.
- Predictive insights in v1: heuristic scoring and time-series forecasting only; no ML training pipeline in the first implementation batch.
- “In-place mutation” from the audit will be implemented inside dedicated data stores with explicit versioning, not by mutating React state objects directly; this preserves render correctness while still reducing GC churn.
- No orange in the Command Center UI; even though the public storefront reserves `Action Laser` for checkout, the dashboard has no checkout CTA and will stay navy/slate/emerald/red only.

## Important Changes To Public APIs, Interfaces, And Types
- New frontend surface: `admin/` as a sibling app to `client/`, using Next.js 16, React 19, Tailwind 4, and the same typography/spacing canon.
- New auth stack: Laravel Sanctum for SPA auth plus `spatie/laravel-permission` on a dedicated `admin` guard.
- New public checkout contract: `POST /api/checkout/orders` returns `{ data: { order_id, status, redirect_url } }`; the public PWA stops constructing the WhatsApp URL on the client.
- New admin API namespaces:
  - `/api/admin/auth/*`
  - `/api/admin/live/stream`
  - `/api/admin/orders*`
  - `/api/admin/providers*`
  - `/api/admin/customers*`
  - `/api/admin/analytics*`
  - `/api/admin/reports/export`
  - `/api/admin/settings/sla*`
  - `/api/admin/settings/integrations*`
- New canonical enums:
  - `ProviderType = merchant | service_provider`
  - `OrderKind = retail | service`
  - `OrderStatus = received | awaiting_provider_ack | dispatched | in_transit | delivered | cancelled | failed | manual_intervention_required`
  - `AssignmentStatus = pending_ack | accepted | rejected | timed_out | cancelled | completed`
  - `NotificationChannel = whatsapp | sms | phone`
  - `AdminAlertSeverity = info | warning | critical`
- New persistence objects:
  - `providers` with optional `vendor_id` bridge, zone, geo, status, capabilities, SLA profile, escalation policy
  - `orders`, `order_items`, `dispatch_assignments`, `provider_notifications`, `order_events`
  - `customer_metrics`, `analytics_events`, `order_metrics_daily`, `provider_metrics_daily`, `product_metrics_daily`, `insight_snapshots`
  - `admin_audit_logs`
- Compatibility rule: existing `zones`, `vendors`, `products`, `vendor_subscriptions`, `users`, and `vendor_analytics` remain intact during rollout; `vendor_analytics` dual-writes into `analytics_events` for one release window before deprecation.

## PHASE 1: Core Architecture & Data Models
- Batch 1.1: Create `admin/` as a separate app with its own `.env`, route groups, deployment target, and shared design-token mirror from the storefront canon; do not extract a shared package in this phase.
- Batch 1.2: Add Laravel Sanctum and `spatie/laravel-permission`; define roles `super_admin`, `ops_dispatcher`, `support_analyst`, `catalog_manager`, and `merchant_success`; require role-based middleware on every `/api/admin/*` route.
- Batch 1.3: Add `providers` as the operational backbone with fields `id`, `type`, `vendor_id`, `zone_id`, `display_name`, `primary_contact_phone`, `whatsapp_number`, `status`, `coordinates`, `capabilities_json`, `sla_profile_id`, `escalation_policy_id`, `metadata_json`, timestamps, and soft deletes.
- Batch 1.4: Backfill one `providers` row per existing `vendors` row with `type=merchant`; add `vendors.provider_id` unique nullable FK, then backfill and enforce non-null for active vendors.
- Batch 1.5: Add `orders` with immutable `order_number`, `kind`, `source_channel`, `customer_user_id`, `zone_id`, `provider_id`, `vendor_id`, `status`, `received_at`, `acknowledged_at`, `dispatched_at`, `in_transit_at`, `delivered_at`, `cancelled_at`, `total_amount`, `currency`, `delivery_point`, `sla_dispatch_by`, `sla_delivery_by`, `needs_manual_intervention`, `escalation_state`, and `metadata_json`.
- Batch 1.6: Add `order_items` with `order_id`, `item_type`, `product_id`, snapshot title/sku/category fields, quantity, unit_price, total_price, and metadata; retail orders store product snapshots so catalog edits never mutate historical orders.
- Batch 1.7: Add `dispatch_assignments`, `provider_notifications`, and `order_events`; these become the authoritative timeline for SLA calculations, retries, and manual intervention.
- Batch 1.8: Add `customer_metrics` keyed by `user_id` for denormalized CRM values such as `lifetime_value`, `order_count`, `last_order_at`, `average_order_value`, `delivery_success_rate`, `cancellation_rate`, and `risk_flags_json`.
- Batch 1.9: Add `analytics_events` as an append-only event table; dual-write from browse/cart/checkout/order/dispatch flows and backfill the current `vendor_analytics` rows into the new shape.
- Batch 1.10: Refactor the public checkout flow so the PWA calls `POST /api/checkout/orders`; Laravel persists the order, generates order events, then returns the WhatsApp redirect URL. Retail checkout remains single-vendor to stay canon-compliant.

## PHASE 2: Dispatch & Map Tracking Engine
- Batch 2.1: Implement the order state machine with allowed transitions `received -> awaiting_provider_ack -> dispatched -> in_transit -> delivered`; failure branches are `timed_out`, `cancelled`, `failed`, and `manual_intervention_required`.
- Batch 2.2: Introduce `sla_profiles` and `escalation_policies`; default retail profiles track `time_to_ack`, `time_to_dispatch`, and `time_to_deliver`, while service profiles track `response_time`, `arrival_time`, and `resolution_time`.
- Batch 2.3: Build the escalation engine as queued jobs: on order creation, compute deadlines; if provider does not acknowledge in time, send WhatsApp alert; if still unacknowledged, send SMS; if still unresolved, flag `manual_intervention_required` and create a critical admin alert for direct phone follow-up.
- Batch 2.4: Add notification idempotency; each outbound alert stores `order_id + provider_id + channel + attempt_no` so retries never duplicate sends or confuse SLA accounting.
- Batch 2.5: Expose `/api/admin/live/stream` over SSE with event types `order.updated`, `assignment.updated`, `provider.location.updated`, `sla.breached`, and `alert.created`; if SSE disconnects, the admin app falls back to polling summaries every 15s and the live dispatch board every 5s while focused.
- Batch 2.6: Implement `/api/admin/map/overview?bbox=&zoom=&layers=` backed by PostGIS; return clustered providers, active orders, zone polygons, heatmap weights, and SLA breach markers scoped to the current viewport.
- Batch 2.7: Use Leaflet with OpenStreetMap raster tiles in the admin app; layer order is zones first, heatmaps second, provider/order markers third, manual-intervention alerts last.
- Batch 2.8: Add explicit admin actions `assign`, `reassign`, `mark-dispatched`, `mark-in-transit`, `mark-delivered`, `force-escalate`, and `resolve-manual-intervention`; every mutation requires `X-Idempotency-Key` and writes to `order_events` plus `admin_audit_logs`.
- Batch 2.9: Support service-provider dispatch without another workflow fork; service jobs use the same `orders` and `dispatch_assignments` tables, but `order_items.item_type=service_task` and SLA rules come from service-specific profiles.

## PHASE 3: Analytics & Reporting Aggregation
- Batch 3.1: Create incremental aggregation jobs that roll `analytics_events` and `order_events` into `order_metrics_daily`, `provider_metrics_daily`, `product_metrics_daily`, and zone-level summaries; refresh operational aggregates every minute and long-range aggregates nightly.
- Batch 3.2: Ship prebuilt reports rather than free-form query builders; first-class reports are `Top Selling Products`, `Lowest Performing Products`, `Top Performing Merchants`, `Inactive/Lagging Providers`, `SLA Breach Trends`, `Zone Demand Heat`, `Repeat Customer Cohorts`, and `Checkout Drop-Off`.
- Batch 3.3: Define “lowest performing” as low conversion plus high impressions over a selectable lookback window; define “lagging provider” as high timeout/reject ratio, slow acknowledgment, or sustained SLA breach rate.
- Batch 3.4: Add `insight_snapshots` generated nightly from heuristics: demand acceleration, customer churn risk, provider fatigue risk, dead-stock risk, and zone saturation. Each insight must include `reason_codes`, `evidence_window`, and a numeric `confidence_score`.
- Batch 3.5: Support CSV export on all report endpoints via `/api/admin/reports/export`; exports are signed, permission-gated, auditable, and time-limited.
- Batch 3.6: Preserve analytical continuity by mapping retail vendor performance from `providers.type=merchant` and service-provider performance from `providers.type=service_provider`; dashboard filters can compare them together or separately.

## PHASE 4: UI/UX Component Specifications
- Command Center information architecture:
  - `/login`
  - `/overview`
  - `/dispatch/live`
  - `/orders`
  - `/providers`
  - `/customers`
  - `/analytics`
  - `/settings/sla`
  - `/settings/integrations`
- Global shell: fixed left navigation on desktop, collapsible rail on tablet, top command bar for search and filters, persistent critical-alert tray, and one detail drawer system reused across orders/providers/customers.
- `/overview`: KPI cards, zone health summary, SLA breach counters, today’s received/dispatched/delivered totals, and a compact live event feed.
- `/dispatch/live`: split layout with map panel and virtualized live queue; queue grouping defaults to `manual intervention`, `awaiting ack`, `dispatched`, and `in transit`.
- `/orders`: virtualized data grid with filters for `status`, `kind`, `zone`, `provider`, `SLA state`, and date range; row click opens the order drawer with timeline, customer summary, item list, notification attempts, and admin actions.
- `/providers`: virtualized grid plus map mode; detail drawer includes response-time trend, acceptance rate, subscription state for merchants, service capabilities for providers, and current escalation policy.
- `/customers`: virtualized CRM list with lifetime value, order count, last order, zone, churn risk, and recent issues; detail drawer shows history and flagged incidents.
- `/analytics`: dashboard sections for product, provider, customer, and zone performance; every chart must be backed by a precomputed report endpoint, not client-side ad hoc joins.
- Visual rules for v0 generation:
  - No orange anywhere; use navy for structure, slate for chrome, emerald for positive state, red for breach/error, and neutral gray for disabled.
  - Minimum tap target `56px`, `12px` dead-zone spacing, `18px` primary radii, `10px` secondary radii, and large readable type from the existing canon.
  - Replace long segmented progress bars with text such as `3 of 20 orders sent`; if a stepper is needed, cap visible segments at five.
  - Use badges and icon + label pairs; never communicate state with color alone.
  - Keep motion functional only: row insertion fade, drawer slide, map marker pulse for critical breaches; no decorative animation on dense data screens.
- Virtual Scroll mandate for v0:
  - Use `@tanstack/react-virtual` for every table/list with unknown or high cardinality.
  - Prefer fixed row heights in primary grids; use expandable drawers, not auto-height rows, to avoid measurement churn.
  - DOM budget target is `<150` rendered rows/cards per screen even with `10k+` records available.

## PHASE 5: Security & Performance Constraints
- Admin auth: Sanctum cookie auth, dedicated `admin` guard, CSRF protection, secure cookies, strict CORS allowlist, and TOTP 2FA mandatory for `super_admin` and `ops_dispatcher`.
- Admin authorization: every endpoint enforced by role + permission middleware; phone numbers, exports, and manual intervention actions require explicit permissions, not just page access.
- Auditability: every admin mutation writes an `admin_audit_logs` row containing actor, permission, target entity, before/after delta, IP, user-agent, and correlation ID.
- Rate limiting: split read and mutation limits; reads return structured `429` bodies with `retry_after_seconds`, `limit_scope`, and `request_id`; the admin UI must disable repeated actions, show a retry countdown, and never auto-retry non-idempotent mutations.
- Data handling: customer PII is masked in list views, only revealed in drawers for authorized roles; exports are signed URLs with short TTL and audit logs.
- Performance model: large datasets live in mutable normalized stores using `useSyncExternalStore` or an equivalent store boundary; filters/sort state can remain React state, but row arrays and map entity collections must mutate in place with version bumps to minimize GC.
- Caching strategy: operational summaries cache `5–15s`, heavy analytics cache `30–60s`, report exports are async jobs, and live order detail reads bypass cache when an order is open in the dispatch board.
- Queueing strategy: all notification sending, escalations, aggregate refreshes, and predictive snapshot jobs run through Laravel queues with retry policies and dead-letter visibility.
- Observability: emit metrics for SSE reconnect rate, order state latency, SLA breaches per zone, notification failure rate, 429 frequency, and admin auth failures; surface these in the overview page and in server logs.

## Test Cases And Scenarios
- Migration and backfill: existing `vendors`, `products`, `zones`, and public catalog APIs continue working after `providers` and `orders` are introduced.
- Checkout capture: a public retail checkout creates one authoritative order, item snapshots, an order event timeline, and a valid WhatsApp redirect URL.
- Service dispatch: a service job enters `received`, gets assigned, escalates on missed acknowledgment, and reaches `manual_intervention_required` when the policy exhausts automated channels.
- SLA engine: dispatch and delivery deadlines compute correctly per profile, breach at the right thresholds, and stop breaching once the order transitions or is cancelled.
- SSE fallback: disconnect the stream and verify the admin app falls back to polling without duplicate list rows or stale counts.
- Virtualization: load `10k` orders and verify rendered DOM rows stay below target, scroll remains smooth, and filters do not remount the full dataset.
- 429 handling: hammer a mutation endpoint and verify the UI blocks repeated actions, displays retry timing, preserves unsent operator intent, and never logs the admin out.
- Authorization: each role can see only the intended modules and actions; masked PII and export permissions are enforced server-side.
- Map queries: bbox filters, zone overlays, cluster summaries, and breach markers return correct counts and acceptable latency.
- Reporting: top/bottom product rankings, provider performance, inactive-provider detection, and churn/demand insights match seeded fixtures and rollup expectations.

## Assumptions And Defaults
- The admin app will live at `admin/` in the current repo, not as an external repository.
- The public customer PWA remains anonymous-first and continues using `device_hash`; no customer login requirement is introduced for the first Command Center release.
- Retail checkout remains single-vendor and WhatsApp-final, but order persistence happens before the redirect.
- Service providers are first-class citizens in schema and dashboard filters from day one, even if the first live traffic remains merchant-heavy.
- Predictive insights in the first release are heuristic and explanation-first; model training infrastructure is explicitly out of scope.
- WebSockets are out of scope for the first production plan; revisit only if SSE throughput becomes a measured bottleneck.
