import type {
  CategoryAPI,
  CatalogLinksAPI,
  CatalogMetaAPI,
  ProductAPI,
  VendorAPI,
  VendorCatalogAPI,
  VendorCatalogPageAPI,
} from "@/types/vendor";
import type { GeoJSONPoint, ZoneAPI } from "@/types/zone";

interface ApiCollectionResponse<T> {
  data: T[];
}

interface ApiItemResponse<T> {
  data: T;
}

interface ApiValidationErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasDataArray<T>(value: unknown): value is ApiCollectionResponse<T> {
  return isRecord(value) && Array.isArray(value.data);
}

function hasDataItem<T>(value: unknown): value is ApiItemResponse<T> {
  return isRecord(value) && "data" in value && !Array.isArray(value.data);
}

function isGeoJSONPoint(value: unknown): value is GeoJSONPoint {
  if (!isRecord(value)) {
    return false;
  }

  if (value.type !== "Point" || !Array.isArray(value.coordinates) || value.coordinates.length !== 2) {
    return false;
  }

  const [lng, lat] = value.coordinates;
  return typeof lng === "number" && Number.isFinite(lng) && typeof lat === "number" && Number.isFinite(lat);
}

function isCatalogMeta(value: unknown): value is CatalogMetaAPI {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.current_page === "number" &&
    typeof value.last_page === "number" &&
    typeof value.per_page === "number" &&
    typeof value.total === "number" &&
    (typeof value.from === "number" || value.from === null) &&
    (typeof value.to === "number" || value.to === null)
  );
}

function isCatalogLinks(value: unknown): value is CatalogLinksAPI {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (typeof value.next === "string" || value.next === null) &&
    (typeof value.prev === "string" || value.prev === null)
  );
}

function parseProduct(value: unknown): ProductAPI | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== "number" || !Number.isFinite(value.id)) {
    return null;
  }

  const externalId = value.external_id;
  const normalizedExternalId = typeof externalId === "string"
    ? externalId.trim()
    : typeof externalId === "number" && Number.isFinite(externalId)
      ? String(externalId)
      : "";

  if (normalizedExternalId === "") {
    return null;
  }

  if (typeof value.title !== "string") {
    return null;
  }

  const title = value.title.trim();

  if (title === "") {
    return null;
  }

  const rawPrice = value.price;
  const normalizedPrice = typeof rawPrice === "number"
    ? rawPrice
    : typeof rawPrice === "string" && rawPrice.trim() !== ""
      ? Number(rawPrice)
      : Number.NaN;

  if (!Number.isFinite(normalizedPrice)) {
    return null;
  }

  const imageUrl = value.image_url;

  if (!(typeof imageUrl === "string" || imageUrl === null)) {
    return null;
  }

  return {
    id: value.id,
    external_id: normalizedExternalId,
    title,
    price: normalizedPrice,
    image_url: imageUrl,
  };
}

function parseCategory(value: unknown): CategoryAPI | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== "number" || !Number.isFinite(value.id) || typeof value.name !== "string") {
    return null;
  }

  const name = value.name.trim();

  if (name === "") {
    return null;
  }

  if (!Array.isArray(value.products)) {
    return null;
  }

  const products: ProductAPI[] = [];

  value.products.forEach((product) => {
    const parsedProduct = parseProduct(product);

    if (parsedProduct !== null) {
      products.push(parsedProduct);
    }
  });

  return {
    id: value.id,
    name,
    products,
  };
}

function parseVendorSubscription(value: unknown): VendorCatalogAPI["subscription"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const status = value.status;
  const reason = value.reason;
  const expiresAt = value.expires_at;

  if (!(typeof status === "string" || status === null)) {
    return null;
  }

  if (!(typeof reason === "string" || reason === null)) {
    return null;
  }

  if (!(typeof expiresAt === "string" || expiresAt === null)) {
    return null;
  }

  return {
    status,
    reason,
    expires_at: expiresAt,
  };
}

function parseVendorCatalog(value: unknown): VendorCatalogAPI | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== "number" ||
    !Number.isFinite(value.id) ||
    typeof value.zone_id !== "number" ||
    !Number.isFinite(value.zone_id) ||
    typeof value.name !== "string" ||
    typeof value.whatsapp_number !== "string" ||
    typeof value.is_active !== "boolean" ||
    typeof value.is_checkout_available !== "boolean"
  ) {
    return null;
  }

  if (!(typeof value.primary_category === "string" || value.primary_category === null)) {
    return null;
  }

  const coordinates = value.coordinates;

  if (!(coordinates === null || isGeoJSONPoint(coordinates))) {
    return null;
  }

  const subscription = parseVendorSubscription(value.subscription);

  if (subscription === null) {
    return null;
  }

  if (!Array.isArray(value.categories)) {
    return null;
  }

  const categories: CategoryAPI[] = [];

  value.categories.forEach((category) => {
    const parsedCategory = parseCategory(category);

    if (parsedCategory !== null) {
      categories.push(parsedCategory);
    }
  });

  return {
    id: value.id,
    zone_id: value.zone_id,
    name: value.name,
    primary_category: value.primary_category,
    whatsapp_number: value.whatsapp_number,
    coordinates,
    is_active: value.is_active,
    subscription,
    is_checkout_available: value.is_checkout_available,
    categories,
  };
}

function extractApiErrorMessage(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const message = typeof value.message === "string" ? value.message.trim() : "";
  if (message) {
    return message;
  }

  if (!isRecord(value.errors)) {
    return null;
  }

  for (const fieldErrors of Object.values(value.errors)) {
    if (Array.isArray(fieldErrors)) {
      const firstError = fieldErrors.find((fieldError) => typeof fieldError === "string" && fieldError.trim() !== "");
      if (typeof firstError === "string") {
        return firstError;
      }
    }
  }

  return null;
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

async function requestApi(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    credentials: init?.credentials ?? "same-origin",
  });

  if (!response.ok) {
    let payload: ApiValidationErrorResponse | null = null;

    try {
      payload = (await response.json()) as ApiValidationErrorResponse;
    } catch {
      payload = null;
    }

    const message = extractApiErrorMessage(payload) ?? `API request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return response;
}

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await requestApi(path, init);
  return (await response.json()) as T;
}

export async function getZones(): Promise<ZoneAPI[]> {
  const payload = await fetchJSON<ApiCollectionResponse<ZoneAPI> | ZoneAPI[]>("/zones");

  if (hasDataArray<ZoneAPI>(payload)) {
    return payload.data;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  throw new Error("Unexpected zones response shape.");
}

export async function getVendorsByZone(zoneId: number): Promise<VendorAPI[]> {
  const payload = await fetchJSON<ApiCollectionResponse<VendorAPI> | VendorAPI[]>(`/vendors?zone_id=${zoneId}`);

  if (hasDataArray<VendorAPI>(payload)) {
    return payload.data;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  throw new Error("Unexpected vendors response shape.");
}

export async function getVendorCatalog(vendorId: number, page = 1): Promise<VendorCatalogPageAPI> {
  const payload = await fetchJSON<
    | {
      data: unknown;
      meta?: unknown;
      links?: unknown;
    }
    | ApiItemResponse<unknown>
    | unknown
  >(`/vendors/${vendorId}/catalog?page=${page}`);

  let vendorCandidate: unknown = payload;
  let vendor: VendorCatalogAPI | null = null;
  let meta: CatalogMetaAPI | null = null;
  let links: CatalogLinksAPI | null = null;

  if (isRecord(payload) && "data" in payload && !Array.isArray(payload.data)) {
    vendorCandidate = payload.data;
    meta = isCatalogMeta(payload.meta) ? payload.meta : null;
    links = isCatalogLinks(payload.links) ? payload.links : null;
  } else if (hasDataItem<unknown>(payload)) {
    vendorCandidate = payload.data;
  }

  vendor = parseVendorCatalog(vendorCandidate);

  if (vendor === null) {
    throw new Error("Unexpected vendor catalog response shape.");
  }

  const fallbackTotal = vendor.categories.reduce(
    (sum, category) => sum + category.products.length,
    0,
  );

  const resolvedMeta: CatalogMetaAPI = meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: 30,
    total: fallbackTotal,
    from: fallbackTotal > 0 ? 1 : null,
    to: fallbackTotal > 0 ? fallbackTotal : null,
  };

  const resolvedLinks: CatalogLinksAPI = links ?? {
    next: null,
    prev: null,
  };

  return {
    vendor,
    meta: resolvedMeta,
    links: resolvedLinks,
  };
}

export async function createJoinSession(): Promise<void> {
  await requestApi("/join/session", { method: "GET" });
}

interface JoinLeadPayload {
  business_name: string;
  owner_name: string;
  whatsapp_number: string;
  zone_id: number;
  device_hash: string;
  company_website: string;
}

export async function submitJoinLead(payload: JoinLeadPayload): Promise<string> {
  const response = await fetchJSON<ApiItemResponse<{ redirect_url: string }>>("/join/lead", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!hasDataItem<{ redirect_url: string }>(response) || typeof response.data.redirect_url !== "string") {
    throw new Error("Unexpected join lead response shape.");
  }

  return response.data.redirect_url;
}
