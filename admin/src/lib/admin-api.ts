import {
  AdminCustomerListResponse,
  AdminRegisteredUser,
  AdminStaffListResponse,
  RegisterAdminPayload,
  mapAdminCustomerListResponse,
  mapAdminRegisteredUser,
  mapAdminStaffListResponse,
} from '@/lib/admin-user-types';
import {
  AdminSlaComplianceResponse,
  mapAdminSlaComplianceResponse,
} from '@/lib/admin-report-types';
import { AdminVendorListResponse, mapAdminVendorListResponse } from '@/lib/admin-vendor-types';
import { AdminZoneHealthResponse, mapAdminZoneHealthResponse } from '@/lib/admin-zone-types';
import { AdminOrdersResponse, mapAdminOrdersResponse } from '@/lib/admin-order-types';

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string[]> = {},
    public readonly payload: unknown = null,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${name}=`;
  const target = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(prefix));

  if (!target) {
    return null;
  }

  return decodeURIComponent(target.slice(prefix.length));
}

function resolveErrorMessage(
  payload: unknown,
  status: number,
  fallbackMessage: string,
): string {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }

    const errors = (payload as { errors?: unknown }).errors;
    if (errors && typeof errors === 'object') {
      const firstField = Object.values(errors as Record<string, unknown>)[0];
      if (Array.isArray(firstField) && typeof firstField[0] === 'string') {
        return firstField[0];
      }
    }
  }

  return fallbackMessage || `Admin API request failed with status ${status}.`;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.trim() === '') {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function adminFetchJson<T>(
  input: string,
  init: RequestInit = {},
  mapper?: (payload: unknown) => T,
): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();

  headers.set('Accept', 'application/json');

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (method !== 'GET' && method !== 'HEAD') {
    headers.set('X-Requested-With', 'XMLHttpRequest');

    const xsrfToken = readCookie('XSRF-TOKEN');
    if (xsrfToken) {
      headers.set('X-XSRF-TOKEN', xsrfToken);
    }
  }

  const response = await fetch(input, {
    ...init,
    method,
    headers,
    cache: 'no-store',
    credentials: 'same-origin',
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const fieldErrors = payload && typeof payload === 'object' && 'errors' in payload
      ? ((payload as { errors?: Record<string, string[]> }).errors ?? {})
      : {};

    throw new AdminApiError(
      resolveErrorMessage(payload, response.status, 'Failed to complete the admin request.'),
      response.status,
      fieldErrors,
      payload,
    );
  }

  return mapper ? mapper(payload) : (payload as T);
}

function buildSearchParams(params: Record<string, string | number | boolean | null | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams.toString();
}

export async function fetchAdminOrdersPage(
  page: number,
  perPage: number,
  signal?: AbortSignal,
): Promise<AdminOrdersResponse> {
  const query = buildSearchParams({
    page,
    per_page: perPage,
  });

  return adminFetchJson(
    `/api/admin/orders?${query}`,
    { method: 'GET', signal },
    (payload) => mapAdminOrdersResponse(payload as Parameters<typeof mapAdminOrdersResponse>[0]),
  );
}

export async function fetchAdminVendorsPage(
  page: number,
  perPage: number,
  signal?: AbortSignal,
): Promise<AdminVendorListResponse> {
  const query = buildSearchParams({
    type: 'merchant',
    include_operational_metrics: 1,
    page,
    per_page: perPage,
  });

  return adminFetchJson(
    `/api/admin/providers?${query}`,
    { method: 'GET', signal },
    (payload) => mapAdminVendorListResponse(payload as Parameters<typeof mapAdminVendorListResponse>[0]),
  );
}

export async function fetchAdminCustomersPage(
  page: number,
  perPage: number,
  search = '',
  signal?: AbortSignal,
): Promise<AdminCustomerListResponse> {
  const query = buildSearchParams({
    page,
    per_page: perPage,
    search,
  });

  return adminFetchJson(
    `/api/admin/customers?${query}`,
    { method: 'GET', signal },
    (payload) => mapAdminCustomerListResponse(payload as Parameters<typeof mapAdminCustomerListResponse>[0]),
  );
}

export async function fetchAdminStaffPage(
  page: number,
  perPage: number,
  search = '',
  signal?: AbortSignal,
): Promise<AdminStaffListResponse> {
  const query = buildSearchParams({
    page,
    per_page: perPage,
    search,
  });

  return adminFetchJson(
    `/api/admin/staff?${query}`,
    { method: 'GET', signal },
    (payload) => mapAdminStaffListResponse(payload as Parameters<typeof mapAdminStaffListResponse>[0]),
  );
}

export async function fetchAdminZoneHealth(signal?: AbortSignal): Promise<AdminZoneHealthResponse> {
  return adminFetchJson(
    '/api/admin/zones/health',
    { method: 'GET', signal },
    (payload) => mapAdminZoneHealthResponse(payload as Parameters<typeof mapAdminZoneHealthResponse>[0]),
  );
}

export async function fetchAdminSlaCompliance(
  days = 7,
  signal?: AbortSignal,
): Promise<AdminSlaComplianceResponse> {
  const query = buildSearchParams({ days });

  return adminFetchJson(
    `/api/admin/reports/sla-compliance?${query}`,
    { method: 'GET', signal },
    (payload) => mapAdminSlaComplianceResponse(payload as Parameters<typeof mapAdminSlaComplianceResponse>[0]),
  );
}

export async function registerAdmin(payload: RegisterAdminPayload): Promise<AdminRegisteredUser> {
  return adminFetchJson(
    '/api/admin/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
        role: payload.role,
        phone: payload.phone,
        zone_id: payload.zoneId,
      }),
    },
    (responsePayload) => mapAdminRegisteredUser(responsePayload as Parameters<typeof mapAdminRegisteredUser>[0]),
  );
}
