export interface AdminVendorListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface AdminVendorRowModel {
  id: number;
  name: string;
  avatar: string;
  providerType: string;
  providerStatus: string;
  vendorId: number | null;
  vendorName: string | null;
  zoneId: number | null;
  zoneName: string | null;
  connectionStatus: 'connected' | 'degraded' | 'disconnected';
  orderVolume24h: number;
  lastDispatchAt: string | null;
  efficiencyScore: number | null;
  phone: string | null;
  whatsappNumber: string | null;
}

export interface AdminVendorListResponse {
  data: AdminVendorRowModel[];
  meta: AdminVendorListMeta;
}

interface AdminProviderSummaryPayload {
  id: number;
  type: string;
  vendor_id: number | null;
  zone_id: number | null;
  display_name: string;
  primary_contact_phone: string | null;
  whatsapp_number: string | null;
  status: string;
  order_volume_24h: number;
  last_dispatch_at: string | null;
  efficiency_score: number | null;
  connection_status: 'connected' | 'degraded' | 'disconnected';
  vendor: { id: number; name: string } | null;
  zone: { id: number; name: string } | null;
}

interface AdminVendorListApiPayload {
  data: AdminProviderSummaryPayload[];
  meta: AdminVendorListMeta;
}

function buildInitials(value: string): string {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'NA';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function mapAdminVendorListResponse(payload: AdminVendorListApiPayload): AdminVendorListResponse {
  return {
    data: payload.data.map((provider) => ({
      id: provider.id,
      name: provider.display_name,
      avatar: buildInitials(provider.display_name),
      providerType: provider.type,
      providerStatus: provider.status,
      vendorId: provider.vendor?.id ?? provider.vendor_id,
      vendorName: provider.vendor?.name ?? null,
      zoneId: provider.zone?.id ?? provider.zone_id,
      zoneName: provider.zone?.name ?? null,
      connectionStatus: provider.connection_status,
      orderVolume24h: Number(provider.order_volume_24h ?? 0),
      lastDispatchAt: provider.last_dispatch_at,
      efficiencyScore: provider.efficiency_score !== null ? Number(provider.efficiency_score) : null,
      phone: provider.primary_contact_phone,
      whatsappNumber: provider.whatsapp_number,
    })),
    meta: payload.meta,
  };
}
