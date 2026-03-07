# Phase 6: The Living Pulse & Lead Acquisition — Execution Blueprint

> **Codex Execution Checklist.** Every item below is a discrete, auditable unit of work. No item may be skipped or reordered without Founder override.

---

## 1. API Integration Layer — Kill the Mocks

### 1.1 Align Client Types to Live API Contracts

> [!IMPORTANT]
> The current [Vendor](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/types/vendor.ts#13-26) interface in [src/types/vendor.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/types/vendor.ts) has fields (`category_id`, `isOpenNow`, `offersFastDelivery`, `rating`, `delivery_time_mins`) that DO NOT exist in the live [VendorResource](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/api/app/Http/Resources/VendorResource.php). This is **Type Drift** and must be resolved first.

**Live `GET /api/zones` response shape** (from [ZoneResource](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/api/app/Http/Resources/ZoneResource.php)):
```typescript
// src/types/zone.ts [NEW]
interface ZoneAPI {
  id: number;          // ← integer, NOT string
  name: string;
  coordinates: GeoJSON.Point | null;
}
```

**Live `GET /api/vendors?zone_id={id}` response shape** (from [VendorResource](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/api/app/Http/Resources/VendorResource.php)):
```typescript
// src/types/vendor.ts [REWRITE]
interface VendorAPI {
  id: number;          // ← integer, NOT string
  zone_id: number;
  name: string;
  coordinates: GeoJSON.Point | null;
  is_active: boolean;
  subscription: {
    status: string | null;    // 'active' | 'expired' | 'suspended'
    reason: string | null;    // SUBSCRIPTION_EXPIRED | ADMIN_BLOCK | etc.
    expires_at: string | null;
  };
  is_checkout_available: boolean;
}
```

**Live `GET /api/vendors/{id}/catalog` response shape** (from [VendorCatalogResource](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/api/app/Http/Resources/VendorCatalogResource.php)):
```typescript
interface VendorCatalogAPI extends VendorAPI {
  categories: {
    id: number;
    name: string;
    products: {
      id: number;
      external_id: string;
      title: string;
      price: number;
      image_url: string | null;
    }[];
  }[];
}
```

#### [MODIFY] [vendor.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/types/vendor.ts)
- Rewrite all interfaces to match the API shapes above exactly.
- Remove phantom fields: `category_id`, `isOpenNow`, `offersFastDelivery`, `rating`, `delivery_time_mins`, `image_url`.
- Add `VendorCatalogAPI`, `ProductAPI`, `CategoryAPI`.

#### [NEW] [zone.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/types/zone.ts)
- Extract [Zone](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/hooks/useZone.ts#4-8) interface from [useZone.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/hooks/useZone.ts) into a dedicated type file. Use `number` for `id`.

---

### 1.2 Next.js API Proxy (Rewrites)

The client currently fetches `/api/zones` and `/api/vendors` which hits Next.js itself (404). We need to proxy these to the Laravel backend.

#### [MODIFY] [next.config.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/next.config.ts)
```typescript
const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
};
```

#### [NEW] [.env.local](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### 1.3 Refactor Data Fetching in Existing Pages

#### [MODIFY] [useZone.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/hooks/useZone.ts)
- Change `Zone.id` from `string` to `number`.
- Cookie stores `zone_id` as string but parse to number on read.

#### [MODIFY] [page.tsx (Zone Selection)](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/page.tsx)
- Remove mock fallback array. If API fails, show an error state (not fake data).
- Map `ZoneAPI` response to display. The API only returns zones with active vendors, so no need for `status` field.

#### [MODIFY] [page.tsx (Vendors Feed)](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/vendors/page.tsx)
- Remove `mockVendors` and `mockCategories` imports entirely.
- Adapt card rendering to use `VendorAPI` shape (no `isOpenNow`, no `rating`, no `delivery_time_mins`).
- **Decision Required:** The `category_id` field does not exist on [VendorResource](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/api/app/Http/Resources/VendorResource.php#8-41). Categories are only available on the `/catalog` endpoint. The Tier-1 category filter either needs a backend change (add category to vendor list response) or must be removed from the vendor list page and moved to the catalog page.

> [!WARNING]
> **Founder Decision Required:** The current Vendor list API does not expose category information. Options:
> 1. **Backend change**: Add a `category_name` or `primary_category` field to [VendorResource](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/api/app/Http/Resources/VendorResource.php#8-41).
> 2. **Remove Tier-1 filter from `/vendors`** and move category filtering to the individual vendor catalog page.
> 3. **Add a separate `GET /api/categories` endpoint** and cross-reference client-side.

---

## 2. GEI Implementation — JSON-LD & Dynamic SSR Metadata

### 2.1 JSON-LD Schema Component

#### [NEW] [JsonLd.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/components/seo/JsonLd.tsx)
A reusable Server Component that injects `<script type="application/ld+json">` into the `<head>`.

```typescript
// Schema.org LocalBusiness structure
interface LocalBusinessLD {
  "@context": "https://schema.org";
  "@type": "LocalBusiness";
  name: string;
  address: {
    "@type": "PostalAddress";
    addressLocality: string; // Zone name
    addressCountry: "EG";
  };
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  isAccessibleForFree: boolean;
  potentialAction?: {
    "@type": "OrderAction";
    target: string; // WhatsApp deep link
  };
}
```

### 2.2 Dynamic SSR Metadata via `generateMetadata`

#### [NEW] [app/vendors/[id]/page.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/vendors/[id]/page.tsx)
- This is the **individual vendor catalog page** (Server Component).
- Uses `generateMetadata()` to fetch vendor data server-side and produce `<title>`, `<meta description>`, and the JSON-LD block.
- Renders the product catalog with categories.

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const vendor = await fetchVendorCatalog(params.id);
  return {
    title: `${vendor.name} | OMEGA World`,
    description: `Order from ${vendor.name}. Hyper-local delivery within your secure perimeter.`,
  };
}
```

---

## 3. Lead Gen — `/join` Page Architecture

### 3.1 Page Structure & Psychology

#### [NEW] [app/join/page.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/join/page.tsx)

**Layout Sections (Top-Down):**

| Section | Content | Psychology |
|---|---|---|
| Hero | "Join the OMEGA Family" + Shield icon | Trust anchor |
| Scarcity Counter | "Only **{N}** seats left for Free Trial" | FOMO trigger |
| Form | 4 fields (below) | Low friction |
| Social Proof | "Trusted by vendors in {Zone}" | Authority |
| CTA | "Apply Now → WhatsApp" | Action clarity |

**Form Fields:**
1. `business_name` — text, required
2. `owner_name` — text, required
3. `whatsapp_number` — tel, required, Egyptian format validation (`+20`)
4. `zone_id` — pre-filled from cookie (read-only if set, dropdown if not)

**State Management:**
- `remainingSeats`: Initialize from `localStorage` or API. Decrement visually on submit (client-side illusion; backend is source of truth).
- On submit: Construct a WhatsApp deep link: `https://wa.me/20XXXXXXXXX?text=...` with pre-filled enrollment message containing form data.
- Redirect user to the WhatsApp link.

### 3.2 Scarcity Counter Logic

```typescript
// src/hooks/useScarcityCounter.ts [NEW]
// Reads initial count from API or falls back to localStorage cache.
// On form submit, decrements the displayed count.
// The counter is NOT authoritative — it's a UX device.
```

---

## 4. Isolated Cart — `CartContext` & Vendor Lock

### 4.1 Cart State Architecture

#### [NEW] [src/context/CartContext.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/context/CartContext.tsx)

```typescript
interface CartItem {
  product_id: number;
  title: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

interface CartState {
  vendor_id: number | null;    // LOCK: only one vendor at a time
  vendor_name: string | null;
  items: CartItem[];
  device_hash: string;
}

interface CartContextValue extends CartState {
  addItem: (vendor: { id: number; name: string }, item: CartItem) => void;
  removeItem: (product_id: number) => void;
  updateQuantity: (product_id: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
}
```

**Vendor Lock Logic:**
- `addItem()` checks if `state.vendor_id` is `null` or matches the incoming `vendor.id`.
- If mismatch → trigger the **"Clear Cart" Warning Modal** (Framer Motion).
- User must explicitly confirm clearing the existing cart before switching vendors.

**Persistence:** Cart state serialized to `localStorage` keyed by `device_hash`.

### 4.2 Clear Cart Warning Modal

#### [NEW] [src/components/cart/ClearCartModal.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/components/cart/ClearCartModal.tsx)

- Framer Motion `AnimatePresence` overlay.
- Copy: "You have items from **{vendor_name}**. Starting a new order will clear your current cart."
- Two buttons: **"Keep Cart"** (dismiss) | **"Clear & Switch"** (destructive, Deep Navy bg).
- No orange. Destructive state uses a muted red (`#EF4444` / Tailwind `red-500`).

### 4.3 WhatsApp Handoff

#### [NEW] [src/lib/whatsapp.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/lib/whatsapp.ts)

```typescript
function buildWhatsAppCheckoutURL(vendor: VendorAPI, cart: CartItem[]): string {
  // Constructs: https://wa.me/{vendor.whatsapp_number}?text={encoded_order_summary}
  // Order summary includes: item list, quantities, total, device_hash for tracking
}
```

> [!IMPORTANT]
> The `whatsapp_number` field exists on the [Vendor](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/types/vendor.ts#13-26) model but is NOT exposed in [VendorResource](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/api/app/Http/Resources/VendorResource.php#8-41). A backend modification is required to add `whatsapp_number` to the catalog response.

---

## 5. Device Identity — `device_hash`

#### [NEW] [src/lib/device.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/lib/device.ts)

```typescript
// Generates a persistent anonymous device identifier.
// Strategy:
// 1. Check localStorage for existing 'omega_device_hash'.
// 2. If not found, generate a UUID v4 (crypto.randomUUID()).
// 3. Store in localStorage.
// 4. Return the hash.
//
// This hash is attached to:
// - Cart state (for persistence)
// - WhatsApp handoff payload (for order tracking)
// - Future: analytics events

export function getDeviceHash(): string { ... }
```

---

## File Manifest (New & Modified)

| Action | Path | Type |
|---|---|---|
| MODIFY | [client/next.config.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/next.config.ts) | Config |
| NEW | `client/.env.local` | Config |
| MODIFY | [client/src/types/vendor.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/types/vendor.ts) | Types |
| NEW | `client/src/types/zone.ts` | Types |
| MODIFY | [client/src/hooks/useZone.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/hooks/useZone.ts) | Hook |
| MODIFY | [client/src/app/page.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/page.tsx) | Page |
| MODIFY | [client/src/app/vendors/page.tsx](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/app/vendors/page.tsx) | Page |
| NEW | `client/src/app/vendors/[id]/page.tsx` | Page (SSR) |
| NEW | `client/src/app/join/page.tsx` | Page |
| NEW | `client/src/components/seo/JsonLd.tsx` | Component |
| NEW | `client/src/components/cart/ClearCartModal.tsx` | Component |
| NEW | `client/src/context/CartContext.tsx` | Context |
| NEW | `client/src/hooks/useScarcityCounter.ts` | Hook |
| NEW | `client/src/lib/device.ts` | Utility |
| NEW | `client/src/lib/whatsapp.ts` | Utility |
| DELETE | [client/src/mocks/vendors.ts](file:///opt/lampp/htdocs/2nd_epoche/new_yg_system/omega-world/client/src/mocks/vendors.ts) | Mock data |

---

## Audit Criteria (Opus Checklist)

Phase 6 will be approved **only** if ALL of the following pass:

| # | Criterion | Method |
|---|---|---|
| A1 | `next build` exits with code 0 | `pnpm run build` |
| A2 | Zero `any` types in new/modified files | `grep -r ': any' src/` should return zero hits (excluding `IconMap` if justified) |
| A3 | No orange hex codes (`#FF`, `#ff`, `orange`) in any CSS/TSX | `grep -riE '(orange\|#ff[a-f0-9]{4}\|#ffa)' src/` |
| A4 | `VendorAPI` interface matches `VendorResource::toArray()` 1:1 | Manual diff |
| A5 | `ZoneAPI` interface matches `ZoneResource::toArray()` 1:1 | Manual diff |
| A6 | JSON-LD output validates at [Schema.org validator](https://validator.schema.org/) | Browser test on `/vendors/{id}` |
| A7 | Cart Vendor Lock prevents cross-vendor item addition | Browser test: add item from Vendor A, attempt add from Vendor B → modal appears |
| A8 | `device_hash` persists across page reloads | Browser test: check `localStorage` before and after reload |
| A9 | WhatsApp redirect constructs valid `wa.me` URL | Browser test on cart checkout |
| A10 | `/join` form validates Egyptian phone format | Browser test: submit with invalid number → error shown |
| A11 | No mock data imported anywhere in production code | `grep -r 'mocks/' src/app/` returns zero hits |
| A12 | `generateMetadata` produces correct `<title>` for vendor pages | View page source on `/vendors/{id}` |

---

## Verification Plan

### Automated
1. **Build Verification**: `cd client && pnpm run build` — must exit 0.
2. **Type Safety Audit**: `cd client && npx tsc --noEmit` — must exit 0 with zero errors.
3. **Orange Ban Grep**: `grep -riE '(orange|#ff[a-f0-9]{4}|#ffa)' client/src/` — must return empty.
4. **Mock Purge Grep**: `grep -r 'mocks/' client/src/app/` — must return empty.

### Manual (Browser — Requires `pnpm run dev`)
1. Navigate to `/` → Verify zones load from API (or show error state, not mock data).
2. Select a zone → Navigate to `/vendors` → Verify vendor cards render from live API.
3. Navigate to `/vendors/{id}` → View page source → Confirm JSON-LD `<script>` block and `<title>` tag.
4. Add a product to cart → Attempt adding from a different vendor → Confirm modal appears.
5. Reload page → Confirm cart state persists via `device_hash` in `localStorage`.
6. Navigate to `/join` → Fill form → Confirm WhatsApp redirect opens with pre-filled message.

> [!CAUTION]
> Manual browser tests require the Laravel API to be running (`php artisan serve`) with seeded data. If the API is not available, verification is limited to build + type checks.
