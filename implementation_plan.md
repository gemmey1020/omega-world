# Phase 6.2: V3.1 "Impatience & Accessibility" Patch — Execution Blueprint

**Source of Truth:** CANON V3.0 + [OMEGA_WORLD_MASTER_DESIGN_SYSTEM_V3.md](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/OMEGA_WORLD_MASTER_DESIGN_SYSTEM_V3.md)

---

## TASK 1: UI/UX Hardening

### 1.1 The V3 Design Token Migration

> [!IMPORTANT]
> Current [globals.css](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/globals.css) uses V1 palette (`#0F172A` navy, `#fafafa` bg, Geist fonts). V3 mandates: `#1E293B` navy, `#F8FAFC` bg, system fonts, `18px/10px` radii, and the `omega-pulse` keyframe.

#### [MODIFY] [globals.css](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/globals.css)

Replace the current theme block entirely with V3 tokens:

```css
@import "tailwindcss";

@theme inline {
  /* V3 Color Palette */
  --color-omega-bg: #F8FAFC;
  --color-omega-navy: #1E293B;
  --color-omega-slate: #E2E8F0;
  --color-omega-orange: #EA580C;
  --color-omega-emerald: #10B981;
  --color-omega-red: #DC2626;
  --color-omega-grey: #9CA3AF;

  /* Radii */
  --radius-primary: 18px;
  --radius-secondary: 10px;

  /* Shadows */
  --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  --shadow-sticky: 0 -4px 12px -2px rgba(0, 0, 0, 0.15);

  /* Spacing (Dead Zone) */
  --space-dead-zone: 20px;
  --space-gutter-mobile: 16px;
  --space-gutter-desktop: 32px;

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  --font-mono: ui-monospace, 'SF Mono', 'Liberation Mono', monospace;
}

@keyframes omega-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); opacity: 1; }
  50%  { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); opacity: 0.85; }
  100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); opacity: 1; }
}
```

### 1.2 The 20px Dead Zone Shield

All interactive element containers use `gap-5` (20px). This exceeds the V3 spec's 12px minimum to match the Grok adversarial feedback for "impatient tapping."

- **Vendor card button areas:** `gap-5` between "Add to Cart" and adjacent elements
- **Form field groups:** `space-y-5` on `/join` and all future forms
- **Checkout bar:** 20px internal padding between price and checkout button

**Enforcement:** No utility class override. Define a `gap-interactive` token in [globals.css](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/globals.css) mapped to `20px`.

### 1.3 The Scrim Patch (Waiting States)

Replace the V3 gradient overlay (`from-[#F8FAFC] to-[#E2E8F0] opacity-60`) with a high-visibility scrim:

#### [MODIFY] [vendor-card.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/components/omega/vendor-card.tsx)

```diff
- <div className="absolute inset-0 bg-gradient-to-br from-[#F8FAFC] to-[#E2E8F0] opacity-60 ...">
-   <motion.span>Waiting for Update</motion.span>
+ <div className="absolute inset-0 bg-[#E2E8F0]/70 flex flex-col items-center justify-center gap-2">
+   <Clock className="h-12 w-12 text-[#1E293B]" />
+   <motion.span animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 4, repeat: Infinity }}
+     className="text-[#1E293B] text-sm font-semibold">
+     Waiting for Update
+   </motion.span>
```

### 1.4 Haptic Utility

#### [NEW] [src/lib/haptic.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/lib/haptic.ts)

```typescript
export function triggerHaptic(duration: 50 | 80 | 100 | 150 = 50): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(duration);
  }
}
```

| Duration | Semantic |
|---|---|
| `50` | Success (item added) |
| `80` | Checkout proceed |
| `100` | Blocked (vendor inactive) |
| `150` | Error (validation fail) |

Apply `triggerHaptic(50)` on `touchstart` for [VendorCard](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/components/omega/vendor-card.tsx#20-134) add button, [StickyCheckoutBar](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/components/omega/sticky-checkout-bar.tsx#14-108) checkout button.

---

## TASK 2: The Logic Bridge (JWT Cart Token)

### 2.1 Cart Share Token — Architecture

**Goal:** User can share their vendor cart via WhatsApp as a URL. Recipient opens link → cart auto-merges if their own cart is empty.

#### [NEW] [api/app/Http/Controllers/Api/CartTokenController.php](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/api/app/Http/Controllers/Api/CartTokenController.php)

**Endpoints:**

| Method | Path | Throttle | Purpose |
|---|---|---|---|
| `POST` | `/api/cart/token` | `10/min` | Encode current cart → JWT (24h expiry) |
| `GET` | `/api/cart/token/{token}` | `30/min` | Decode JWT → return cart payload |

**JWT Payload:**
```json
{
  "vendor_id": 5,
  "vendor_name": "Ahmed's Market",
  "items": [
    { "product_id": 12, "title": "Tomatoes", "price": 8.5, "quantity": 2, "image_url": null }
  ],
  "iat": 1741254000,
  "exp": 1741340400
}
```

**Signing:** Use Laravel's `encrypt()` / `decrypt()` (symmetric AES-256 via `APP_KEY`). No external JWT library needed — this is a self-issued, self-consumed token.

#### [NEW] [src/lib/cart-token.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/lib/cart-token.ts)

```typescript
export async function generateCartShareURL(cart: CartState): Promise<string> // POST /api/cart/token → returns token
export async function resolveCartToken(token: string): Promise<CartState>  // GET /api/cart/token/{token}
```

#### [MODIFY] [whatsapp.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/lib/whatsapp.ts)

Add to checkout message:
```
Share your cart: https://omega.world/cart/{token}
```

### 2.2 Recovery Prompt

#### [MODIFY] [CartContext.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/context/CartContext.tsx)

On mount, check `URLSearchParams` for `?cart_token=xxx`. If present **and** local cart is empty → call `resolveCartToken()` → auto-populate [CartState](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/context/CartContext.tsx#24-30). If local cart has items → show a modified [ClearCartModal](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/components/cart/ClearCartModal.tsx#12-61) with copy: "You received a shared cart. Merge or keep your current items?"

---

## TASK 3: Virtual Bundle Queue (Multi-Vendor Staging)

### 3.1 Architecture — Respecting Isolated Cart Canon

> [!WARNING]
> CANON §3: "Checkout locked to ONE vendor per transaction." The staging area does NOT violate this — it queues multiple **separate** single-vendor carts for serial handoff.

```
StagingContext
├── bundles: StagedBundle[]     // Array of frozen single-vendor carts
│   ├── bundle[0] { vendor_id: 3, vendor_name: "Ahmed", items: [...], status: "pending" }
│   ├── bundle[1] { vendor_id: 7, vendor_name: "Fatima", items: [...], status: "pending" }
├── activeBundleIndex: number   // Current position in the handoff sequence
```

#### [NEW] [src/context/StagingContext.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/context/StagingContext.tsx)

```typescript
interface StagedBundle {
  vendor_id: number;
  vendor_name: string;
  whatsapp_number: string;
  items: CartItem[];
  status: "pending" | "sent" | "skipped";
}

interface StagingContextValue {
  bundles: StagedBundle[];
  stageCurrentCart: () => void;     // Freezes CartContext → pushes to bundles
  startBatchHandoff: () => void;    // Begins serial WhatsApp sequence
  advanceHandoff: () => void;       // Marks current as "sent", moves to next
  skipBundle: (index: number) => void;
  clearStaging: () => void;
}
```

### 3.2 Batch Order Flow UI

#### [NEW] [src/app/checkout/page.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/checkout/page.tsx)

**Layout:**

```
┌─ Batch Checkout ────────────────────────────┐
│ "Your Orders" (H1)                          │
│                                              │
│ ┌─ Bundle 1: Ahmed's Market ──────────────┐ │
│ │ 3 items • EGP 45.00   [Send ✓] [Skip]  │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─ Bundle 2: Fatima's Spice Shop ─────────┐ │
│ │ 1 item • EGP 18.99    [Queued]          │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ Progress: [████░░] 1 of 2 sent              │
└──────────────────────────────────────────────┘
```

User taps "Send" → [buildWhatsAppCheckoutURL()](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/lib/whatsapp.ts#13-41) for that bundle → redirect to WhatsApp → return → status flips to "sent" → next bundle activates.

---

## File Manifest

| Action | Path | Category |
|---|---|---|
| MODIFY | [client/src/app/globals.css](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/globals.css) | Theme → V3 tokens |
| NEW | `client/src/lib/haptic.ts` | Utility |
| MODIFY | [client/src/components/omega/vendor-card.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/components/omega/vendor-card.tsx) | Scrim patch + haptic |
| MODIFY | [client/src/components/omega/sticky-checkout-bar.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/components/omega/sticky-checkout-bar.tsx) | Haptic + dead zone |
| MODIFY | [client/src/components/cart/ClearCartModal.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/components/cart/ClearCartModal.tsx) | Merge prompt variant |
| MODIFY | [client/src/context/CartContext.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/context/CartContext.tsx) | Cart token recovery |
| NEW | `client/src/context/StagingContext.tsx` | Multi-vendor staging |
| NEW | `client/src/lib/cart-token.ts` | Share URL builder |
| MODIFY | [client/src/lib/whatsapp.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/lib/whatsapp.ts) | Add share link to message |
| MODIFY | [client/src/app/providers.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/providers.tsx) | Wrap StagingProvider |
| NEW | `client/src/app/checkout/page.tsx` | Batch handoff UI |
| NEW | `api/app/Http/Controllers/Api/CartTokenController.php` | JWT encode/decode |
| MODIFY | [api/routes/api.php](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/api/routes/api.php) | Cart token routes |
| MODIFY | [api/app/Providers/AppServiceProvider.php](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/api/app/Providers/AppServiceProvider.php) | Cart token rate limiters |

## Component Refactor List (V3 → V3.1)

| Component | Current State | V3.1 Change |
|---|---|---|
| [vendor-card.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/components/omega/vendor-card.tsx) | Gradient waiting overlay | → `#E2E8F0/70` scrim + 48px Clock icon |
| [vendor-card.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/components/omega/vendor-card.tsx) | No haptic | → `triggerHaptic(50)` on add, [(100)](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/api/app/Providers/AppServiceProvider.php#20-50) on blocked |
| [sticky-checkout-bar.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/components/omega/sticky-checkout-bar.tsx) | 12px internal gaps | → 20px dead zones |
| [sticky-checkout-bar.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/components/omega/sticky-checkout-bar.tsx) | No haptic | → `triggerHaptic(80)` on checkout |
| [ClearCartModal.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/components/cart/ClearCartModal.tsx) | Vendor-switch only | → Add "merge shared cart" variant |
| [globals.css](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/globals.css) | V1 palette | → Full V3 token set |
| [VendorCatalogClient.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/components/vendors/VendorCatalogClient.tsx) | 12px card gaps | → 20px dead zones |

## Verification Plan

### Automated
1. `pnpm run build` — exit 0
2. `grep -riE '(gap-3|gap-2|space-y-3|space-y-2)' client/src/components/omega/` — zero hits (dead zones enforced)
3. `grep -rn 'omega-pulse' client/src/app/globals.css` — confirms keyframe present

### Manual (Browser — `pnpm run dev`)
1. **20px Gap Test:** Open `/omega-v3-demo` → DevTools → measure gap between "Add to Cart" buttons → must be ≥ 20px
2. **Scrim Test:** Set a vendor to `isWaiting: true` → confirm solid `#E2E8F0` scrim with Clock icon (no gradient)
3. **Haptic Test:** Android device → tap "Add to Cart" → feel 50ms vibration
4. **Join Dwell Time:** Open `/join` → start timer → confirm WhatsApp redirect does NOT trigger before form validation clears (min 2s interaction time enforced by cooldown + session init)
5. **Cart Share:** Add items → generate share URL → open in incognito → confirm cart merges
6. **Batch Handoff:** Stage 2 vendor carts → navigate to `/checkout` → send first → confirm second activates
