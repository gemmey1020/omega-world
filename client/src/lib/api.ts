import type { VendorAPI, VendorCatalogAPI } from "@/types/vendor";
import type { ZoneAPI } from "@/types/zone";

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
