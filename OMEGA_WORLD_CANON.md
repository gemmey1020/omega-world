# OMEGA_WORLD_ARCHITECTURE_CANON

**Status:** ACTIVE / FROZEN FOR EXECUTION
**Governing System:** OMEGA (Ω)
**Version:** 3.0 (Post-Phase 5.2 - The Intelligent Growth Update)

## 1. SYSTEM PURPOSE

A B2B2C Hyper-Local Marketplace & SaaS Platform. It empowers local vendors (grocers, butchers, etc.) with digital presence while aggregating them into a GEI-optimized (Generative Engine Intelligence) discovery engine for residents. Strictly delivered as a Mobile-First PWA.

## 2. AGENT TOPOLOGY & AUTHORITY

- **Jemy (Founder & Chief Systems Architect):** Absolute authority. Defines state and approves progression.
- **Thinking Node (Gemini):** System architecture, schema definition, and progression logic.
- **Execution Node (Codex):** Writes the physical code.
- **Audit Node (Opus):** Reviews code against this Canon. Rejects any architectural drift.

## 3. STRICT ARCHITECTURAL CONSTRAINTS

- **Backend:** Laravel 12 (Headless API) + PostgreSQL (with PostGIS).
- **Frontend:** Next.js (App Router) + Tailwind CSS + Framer Motion.
- **AI-First Indexing (GEI/GEO):** All frontend pages MUST implement JSON-LD (Schema.org) using `@type: LocalBusiness` to ensure Generative AI engines (Gemini/ChatGPT) can index and recommend vendors.
- **The "No Orange" Rule:** The color ORANGE is globally banned from all UI palettes.
- **Geographical Hierarchy:** [City] -> [District] -> [Mahallya] -> [Region].
- **Geo-Locking:** Users only see vendors within their specific geographical boundary.
- **Persistence (Soft Deletes):** Mandatory for `users`, `zones`, `vendors`, `categories`, and `products`.
- **Isolated Cart:** Checkout locked to ONE vendor per transaction. Handoff via WhatsApp Business API payload.
- **Auth Engine:** Anonymous-First (`device_hash`) with optional Google OAuth.

## 4. SAAS & SUBSCRIPTION LOGIC

- **State Persistence:** Suspended vendors MUST preserve their catalogs.
- **"Waiting" Mode:** UI replaces buy buttons with "Waiting/Placeholder" states for non-active vendors.
- **"Join the Family" Lead Gen:** A high-conversion enrollment page integrated into the PWA using scarcity triggers (e.g., "10 Seats Left for Free Trial").
- **Locked Reason Codes:** `SUBSCRIPTION_EXPIRED`, `ADMIN_BLOCK`, `PENDING_SETUP`, `MANUAL_PAUSE`, `INITIAL_TRIAL`.

## 5. THE ADAPTER (INGESTION ENGINE)

- **Mechanism:** Laravel fetches `store.config.json` from vendor `config_url`.
- **Sync Policy:** Next.js never hits external vendor URLs. Data served exclusively through OMEGA API.

## 6. THE ANTI-DRIFT CONTRACT

1. **No Assumptions:** If a requirement is missing, STOP and ask the Architect.
2. **Audit Before Trust:** Every commit is audited against these constraints.
3. **No UI Without Engine:** Backend contracts must be finalized before building UI.
4. **Language Policy:** Reasoning in Arabic. Technical output in English.

## 7. CURRENT ACTIVE PHASE

**[PHASE 6]: The Living Pulse & Lead Acquisition.**
Task:

1. Replace frontend mocks with Live API integration.
2. Build the "Join the Family" (Enrollment) page with psychological triggers and WhatsApp redirection.
3. Implement GEI Optimization (JSON-LD) for all vendor pages.
4. Finalize the Isolated Cart with `device_hash` persistence and WhatsApp handoff.
