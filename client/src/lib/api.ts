import type { VendorAPI, VendorCatalogAPI } from "@/types/vendor";
import type { ZoneAPI } from "@/types/zone";

interface ApiCollectionResponse<T> {
  data: T[];
}

interface ApiItemResponse<T> {
  data: T;
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

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

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

export async function getVendorCatalog(vendorId: number): Promise<VendorCatalogAPI> {
  const payload = await fetchJSON<ApiItemResponse<VendorCatalogAPI> | VendorCatalogAPI>(`/vendors/${vendorId}/catalog`);

  if (hasDataItem<VendorCatalogAPI>(payload)) {
    return payload.data;
  }

  if (isRecord(payload)) {
    return payload as VendorCatalogAPI;
  }

  throw new Error("Unexpected vendor catalog response shape.");
}
