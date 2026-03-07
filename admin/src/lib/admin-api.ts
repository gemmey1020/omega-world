import { AdminOrdersResponse, mapAdminOrdersResponse } from '@/lib/admin-order-types';

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function fetchAdminOrdersPage(
  page: number,
  perPage: number,
  signal?: AbortSignal,
): Promise<AdminOrdersResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  const response = await fetch(`/api/admin/orders?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof payload?.message === 'string'
      ? payload.message
      : 'Failed to load admin orders.';

    throw new AdminApiError(message, response.status);
  }

  return mapAdminOrdersResponse(payload as Parameters<typeof mapAdminOrdersResponse>[0]);
}
