export interface AdminOrdersMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface AdminOrderRowModel {
  id: number;
  orderNumber: string;
  kind: string;
  status: string;
  totalAmount: number;
  currency: string;
  itemsCount: number;
  receivedAt: string | null;
  ackDeadlineAt: string | null;
  slaDispatchBy: string | null;
  slaDeliveryBy: string | null;
  needsManualIntervention: boolean;
  escalationState: string | null;
  providerId: number | null;
  providerName: string | null;
  vendorId: number | null;
  vendorName: string | null;
  zoneId: number | null;
  zoneName: string | null;
  customerId: number | null;
  customerName: string | null;
}

export interface AdminOrdersResponse {
  data: AdminOrderRowModel[];
  meta: AdminOrdersMeta;
}

interface AdminOrderSummaryPayload {
  id: number;
  order_number: string;
  kind: string;
  status: string;
  total_amount: number;
  currency: string;
  items_count: number;
  received_at: string | null;
  ack_deadline_at: string | null;
  sla_dispatch_by: string | null;
  sla_delivery_by: string | null;
  needs_manual_intervention: boolean;
  escalation_state: string | null;
  provider: { id: number; display_name: string } | null;
  vendor: { id: number; name: string } | null;
  zone: { id: number; name: string } | null;
  customer: { id: number; name: string | null } | null;
}

interface AdminOrdersApiPayload {
  data: AdminOrderSummaryPayload[];
  meta: AdminOrdersMeta;
}

export function mapAdminOrdersResponse(payload: AdminOrdersApiPayload): AdminOrdersResponse {
  return {
    data: payload.data.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      kind: order.kind,
      status: order.status,
      totalAmount: order.total_amount,
      currency: order.currency,
      itemsCount: order.items_count,
      receivedAt: order.received_at,
      ackDeadlineAt: order.ack_deadline_at,
      slaDispatchBy: order.sla_dispatch_by,
      slaDeliveryBy: order.sla_delivery_by,
      needsManualIntervention: order.needs_manual_intervention,
      escalationState: order.escalation_state,
      providerId: order.provider?.id ?? null,
      providerName: order.provider?.display_name ?? null,
      vendorId: order.vendor?.id ?? null,
      vendorName: order.vendor?.name ?? null,
      zoneId: order.zone?.id ?? null,
      zoneName: order.zone?.name ?? null,
      customerId: order.customer?.id ?? null,
      customerName: order.customer?.name ?? null,
    })),
    meta: payload.meta,
  };
}
