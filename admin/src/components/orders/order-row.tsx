'use client';

import React from 'react';
import { AdminOrderRowModel } from '@/lib/admin-order-types';
import { useSlaTickerStore } from '@/stores/use-sla-ticker-store';

interface OrderRowProps {
  order: AdminOrderRowModel;
}

function resolveDeadline(order: AdminOrderRowModel): string | null {
  switch (order.status) {
    case 'awaiting_provider_ack':
      return order.ackDeadlineAt;
    case 'dispatched':
      return order.slaDispatchBy;
    case 'in_transit':
      return order.slaDeliveryBy;
    default:
      return null;
  }
}

function formatCountdown(targetIso: string | null, now: number): string {
  if (targetIso === null) {
    return 'No active SLA';
  }

  const target = Date.parse(targetIso);

  if (Number.isNaN(target)) {
    return 'Invalid SLA';
  }

  const diffSeconds = Math.round((target - now) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const hours = Math.floor(absoluteSeconds / 3600);
  const minutes = Math.floor((absoluteSeconds % 3600) / 60);
  const seconds = absoluteSeconds % 60;
  const prefix = diffSeconds < 0 ? '-' : '';

  if (hours > 0) {
    return `${prefix}${hours}h ${minutes}m`;
  }

  return `${prefix}${minutes}m ${seconds}s`;
}

function OrderRowImpl({ order }: OrderRowProps) {
  const now = useSlaTickerStore((state) => state.now);
  const deadline = resolveDeadline(order);
  const deadlineMs = deadline ? Date.parse(deadline) : null;
  const isBreached = deadlineMs !== null && !Number.isNaN(deadlineMs) && now > deadlineMs;
  const isManual = order.needsManualIntervention;

  return (
    <article
      className={`min-h-[56px] rounded-[18px] border px-4 py-3 transition-colors ${
        isManual || isBreached
          ? 'border-red/30 bg-red/10'
          : 'border-border bg-surface'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{order.orderNumber}</h3>
            <span className="rounded-[10px] bg-navy px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate">
              {order.status.replace(/_/g, ' ')}
            </span>
            <span className="rounded-[10px] bg-navy px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate">
              {order.kind}
            </span>
          </div>
          <p className="text-xs text-slate">
            {order.customerName ?? 'Anonymous customer'}
            {' • '}
            {order.zoneName ?? 'Unassigned zone'}
            {' • '}
            {order.providerName ?? order.vendorName ?? 'No provider'}
          </p>
          <p className="text-xs text-slate">
            {order.itemsCount} items
            {' • '}
            {order.currency} {order.totalAmount.toFixed(2)}
          </p>
        </div>

        <div className="text-right space-y-1 flex-shrink-0">
          <p className={`text-sm font-semibold ${isManual || isBreached ? 'text-red' : 'text-emerald'}`}>
            {formatCountdown(deadline, now)}
          </p>
          <p className="text-[11px] text-slate">
            {isManual ? 'Manual intervention' : deadline ? 'Active SLA window' : 'No countdown'}
          </p>
        </div>
      </div>
    </article>
  );
}

function areOrderRowPropsEqual(previousProps: OrderRowProps, nextProps: OrderRowProps): boolean {
  const previous = previousProps.order;
  const next = nextProps.order;

  return previous.id === next.id
    && previous.orderNumber === next.orderNumber
    && previous.kind === next.kind
    && previous.status === next.status
    && previous.totalAmount === next.totalAmount
    && previous.currency === next.currency
    && previous.itemsCount === next.itemsCount
    && previous.receivedAt === next.receivedAt
    && previous.ackDeadlineAt === next.ackDeadlineAt
    && previous.slaDispatchBy === next.slaDispatchBy
    && previous.slaDeliveryBy === next.slaDeliveryBy
    && previous.needsManualIntervention === next.needsManualIntervention
    && previous.escalationState === next.escalationState
    && previous.providerId === next.providerId
    && previous.providerName === next.providerName
    && previous.vendorId === next.vendorId
    && previous.vendorName === next.vendorName
    && previous.zoneId === next.zoneId
    && previous.zoneName === next.zoneName
    && previous.customerId === next.customerId
    && previous.customerName === next.customerName;
}

const OrderRow = React.memo(OrderRowImpl, areOrderRowPropsEqual);

export default OrderRow;
