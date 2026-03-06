export interface SharedCartItem {
  product_id: number;
  title: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

export interface SharedCartState {
  vendor_id: number;
  vendor_name: string;
  items: SharedCartItem[];
}

interface TokenIssueResponse {
  data: {
    token: string;
    expires_at: string;
  };
}

interface TokenResolveResponse {
  data: SharedCartState;
}

function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    return `/api${normalizedPath}`;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBase) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  return `${apiBase.replace(/\/+$/, "")}/api${normalizedPath}`;
}

function normalizeBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return configuredSiteUrl && configuredSiteUrl.length > 0
    ? configuredSiteUrl
    : "http://localhost:3000";
}

function isSharedCartItem(value: unknown): value is SharedCartItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.product_id === "number" &&
    typeof item.title === "string" &&
    typeof item.price === "number" &&
    typeof item.quantity === "number" &&
    (typeof item.image_url === "string" || item.image_url === null)
  );
}

function isSharedCartState(value: unknown): value is SharedCartState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const state = value as Record<string, unknown>;

  return (
    typeof state.vendor_id === "number" &&
    typeof state.vendor_name === "string" &&
    Array.isArray(state.items) &&
    state.items.every((item) => isSharedCartItem(item))
  );
}

export async function generateCartToken(
  cart: SharedCartState,
): Promise<{ token: string; expires_at: string }> {
  const response = await fetch(resolveApiUrl("/cart/token"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cart),
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Unable to generate cart token (${response.status}).`);
  }

  const payload = (await response.json()) as TokenIssueResponse;

  if (
    !payload ||
    typeof payload !== "object" ||
    !payload.data ||
    typeof payload.data.token !== "string" ||
    typeof payload.data.expires_at !== "string"
  ) {
    throw new Error("Unexpected cart token response shape.");
  }

  return payload.data;
}

export async function resolveCartToken(token: string): Promise<SharedCartState> {
  const response = await fetch(resolveApiUrl(`/cart/token/${encodeURIComponent(token)}`), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Unable to resolve shared cart (${response.status}).`);
  }

  const payload = (await response.json()) as TokenResolveResponse;

  if (!payload || typeof payload !== "object" || !isSharedCartState(payload.data)) {
    throw new Error("Unexpected shared cart response shape.");
  }

  return payload.data;
}

export async function generateCartShareURL(cart: SharedCartState): Promise<string> {
  const { token } = await generateCartToken(cart);
  const baseUrl = normalizeBaseUrl().replace(/\/+$/, "");
  const shareUrl = new URL(`/vendors/${cart.vendor_id}`, baseUrl);

  shareUrl.searchParams.set("cart_token", token);

  return shareUrl.toString();
}
