# OMEGA_WORLD_ARCHITECTURE_CANON

**Status:** ACTIVE / FROZEN FOR EXECUTION
**Governing System:** OMEGA (Ω)

## 1. SYSTEM PURPOSE

A B2B2C Hyper-Local Marketplace & Search Engine for compound residents (e.g., New Cairo). It centralizes local vendor catalogs into a single, unified search experience with an isolated checkout flow. Delivered strictly as a Mobile-First PWA (Progressive Web App).

## 2. AGENT TOPOLOGY & AUTHORITY

- **Jemy (Founder & Chief Systems Architect):** Absolute authority. Defines state, constraints, and approves progression.
- **Thinking Node (Gemini):** System architecture, schema definition, and progression logic.
- **Execution Node (Codex):** Writes the physical code. STRICT RULE: Codex must not invent features, change schemas, or bypass constraints.
- **Audit Node (Opus):** Reviews code against this Canon file. Rejects any architectural drift.
- **UI/UX Node (Gemini Antigravity):** Generates components and copy.

## 3. STRICT ARCHITECTURAL CONSTRAINTS

- **Backend Stack:** Laravel 12 (Headless API & Ingestion Engine) + PostgreSQL (with PostGIS for Geo-fencing). NO Blade or Livewire for user views.
- **Frontend Stack:** Next.js (App Router, React) + Tailwind CSS + Framer Motion (for UI micro-interactions). No external SEO libraries; rely strictly on Next.js native Metadata API.
- **Delivery Model:** Mobile-First PWA. Desktop views must be constrained to a mobile-like container.
- **The "No Orange" Rule:** The color ORANGE (and all its direct variants) is globally banned from the UI palette.
- **Geographic Fencing (Geo-Lock):** Vendors and users are strictly bound to specific `zones`. No cross-zone visibility is permitted.
- **Isolated Cart:** The cart (`currentVendorId`) must lock checkout to a SINGLE vendor per transaction.
- **Checkout Handoff:** Transactions are NOT processed on the platform. The cart state is serialized and handed off to WhatsApp Business API.
- **Auth Engine:** Zero-friction Google OAuth via NextAuth (Client) integrated with Laravel Socialite & Sanctum (API), followed by a progressive Framer Motion multi-step onboarding.
- **Anonymous-First State:** Users default to a `device_hash` identity to build AI predictive history without friction.
- **Analytics Engine:** User journey (Search -> Click -> Checkout Intent) MUST be tracked in `vendor_analytics` to empower B2B value.
- **Privacy-First UI:** The system must enforce a "Trust Center" approach. Micro-copy reassuring data isolation (between vendor and user) and financial safety must be visible at critical interaction points (Login, Checkout, Profile)

## 4. OMEGA MART LITE INTEGRATION CONTRACT (THE ADAPTER)

- **Source of Truth:** External vendors operate on Vite SPAs with NO APIs.
- **Data Ingestion:** Laravel acts as the Ingestion Engine via a Scheduled Command. It fetches the static `store.config.json` from external vendor URLs.
- **Data Mapping:** Laravel parses the external JSON, sanitizes it (preventing SSRF & XSS), maps it to relational `products` and `categories`, and serves it via strict internal API endpoints.
- **Next.js Role:** The Frontend NEVER fetches data directly from vendor URLs. It ONLY queries the internal Laravel API.

## 5. THE ANTI-DRIFT CONTRACT (For LLM Agents)

1. **No Assumptions:** If a requirement is missing, STOP and ask the Architect.
2. **Audit Before Trust:** Opus must audit every Codex PR/Commit against these constraints.
3. **No UI Without Engine:** Do not build interactive UI components unless the underlying state/API contract is explicitly defined.
4. **Freeze Before Scale:** Complete one phase entirely and get Architect approval before moving to the next.
5. **Language Policy:** Technical output, code, schemas, and documentation must be in English.

## 6. CURRENT ACTIVE PHASE

**[PHASE 1]: Environment Monorepo Scaffolding.**
Task: Initialize Laravel 12 (API only) and Next.js (App Router) client within `omega-world`. Configure PostgreSQL connections.
