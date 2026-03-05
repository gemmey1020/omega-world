# OMEGA_WORLD_ARCHITECTURE_CANON

**Status:** ACTIVE / FROZEN FOR EXECUTION
**Governing System:** OMEGA (Ω)
**Version:** 2.0 (Post-Phase 2 Validation)

## 1. SYSTEM PURPOSE

A B2B2C Hyper-Local Marketplace & SaaS Platform. It empowers local vendors (grocers, butchers, etc.) with individual Vite-based digital stores while aggregating them into a unified, search-driven discovery engine for compound residents. Strictly delivered as a Mobile-First PWA.

## 2. AGENT TOPOLOGY & AUTHORITY

- **Jemy (Founder & Chief Systems Architect):** Absolute authority. Defines state and approves progression.
- **Thinking Node (Gemini):** System architecture, schema definition, and progression logic.
- **Execution Node (Codex):** Writes the physical code. Must not bypass architectural constraints.
- **Audit Node (Opus):** Reviews code against this Canon. Rejects any architectural drift.

## 3. STRICT ARCHITECTURAL CONSTRAINTS

- **Backend:** Laravel 12 (Headless API) + PostgreSQL (with PostGIS).
- **Frontend:** Next.js (App Router) + Tailwind CSS + Framer Motion.
- **The "No Orange" Rule:** The color ORANGE is globally banned from all UI palettes.
- **Geographical Hierarchy:** Zones follow a strict nested structure: [City] -> [District/Settlement] -> [Mahallya] -> [Region].
- **Geo-Locking:** Users only see vendors within their specific geographical boundary unless manually expanded.
- **Persistence (Soft Deletes):** `SoftDeletes` is mandatory for `users`, `zones`, `vendors`, `categories`, and `products` to ensure data recovery and audit trails.
- **Isolated Cart:** Checkout is locked to ONE vendor per transaction. Handoff is via serialized WhatsApp Business API payload.
- **Auth Engine:** Anonymous-First (`device_hash`) with optional Google OAuth upgrade.

## 4. SAAS & SUBSCRIPTION LOGIC

- **State Persistence:** Suspended vendors (inactive/expired) MUST preserve their catalogs.
- **"Waiting" Mode:** UI must replace product images/buy buttons with "Waiting/Placeholder" states for vendors in a non-active status.
- **Locked Reason Codes:** The `reason` field in `vendor_subscriptions` MUST only use:
  - `SUBSCRIPTION_EXPIRED`
  - `ADMIN_BLOCK`
  - `PENDING_SETUP`
  - `MANUAL_PAUSE`
  - `INITIAL_TRIAL`

## 5. THE ADAPTER (INGESTION ENGINE)

- **Mechanism:** Laravel fetches `store.config.json` from vendor `config_url`.
- **Mapping:** External JSON is parsed, sanitized, and mapped to internal `categories` and `products` tables.
- **Sync Policy:** Next.js never hits external vendor URLs. Data is served exclusively through the internal OMEGA API.

## 6. THE ANTI-DRIFT CONTRACT

1. **No Assumptions:** If a requirement is missing, STOP and ask the Architect.
2. **Audit Before Trust:** Opus must audit every commit against these constraints.
3. **No UI Without Engine:** Backend contracts must be finalized before building UI.
4. **Language Policy:** Reasoning in Arabic. Technical output, code, and documentation in English.

## 7. CURRENT ACTIVE PHASE

**[PHASE 5]: Frontend PWA Scaffolding & Zone Discovery.**
Task: Initialize Next.js 15 inside `/client` with Tailwind (Hard-blocked Orange). Build the Splash Screen (Ω) and the Zone Selection landing page using Framer Motion to consume the `/api/zones` endpoint.
