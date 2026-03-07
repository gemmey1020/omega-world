'use client';

import React from 'react';
import { AlertCircle, CheckCircle, TrendingUp } from '@/lib/icons';
import { AdminVendorRowModel } from '@/lib/admin-vendor-types';

interface VendorsTableProps {
  vendors: AdminVendorRowModel[];
}

function formatDispatchTimestamp(value: string | null): string {
  if (!value) {
    return 'No dispatch yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function VendorsTableImpl({ vendors }: VendorsTableProps) {
  const statusConfig = {
    connected: {
      label: 'Connected',
      bgColor: 'bg-emerald/10',
      textColor: 'text-emerald',
      borderColor: 'border-emerald/30',
      icon: CheckCircle,
    },
    disconnected: {
      label: 'Disconnected',
      bgColor: 'bg-red/10',
      textColor: 'text-red',
      borderColor: 'border-red/30',
      icon: AlertCircle,
    },
    degraded: {
      label: 'Degraded',
      bgColor: 'bg-slate/10',
      textColor: 'text-slate',
      borderColor: 'border-slate/30',
      icon: AlertCircle,
    },
  } as const;

  return (
    <div className="overflow-hidden rounded-[18px] border border-teal/20 bg-gradient-to-br from-surface/50 to-navy/50 backdrop-blur-lg">
      <div className="sticky top-0 z-10 border-b border-teal/10 bg-gradient-to-b from-surface/80 to-surface/40 backdrop-blur-md">
        <div className="grid grid-cols-12 gap-4 px-6 py-4">
          <div className="col-span-3 text-xs font-semibold uppercase tracking-wider text-slate">Vendor</div>
          <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate">Status</div>
          <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate">Volume (24h)</div>
          <div className="col-span-3 text-xs font-semibold uppercase tracking-wider text-slate">Last Dispatch</div>
          <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate">Efficiency</div>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {vendors.map((vendor) => {
          const config = statusConfig[vendor.connectionStatus];
          const StatusIcon = config.icon;

          return (
            <div
              key={vendor.id}
              className="grid min-h-[72px] grid-cols-12 items-center gap-4 px-6 py-4 transition-colors hover:bg-surface/30 group"
            >
              <div className="col-span-3 flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-teal/20 bg-gradient-to-br from-teal/30 to-navy text-sm font-bold text-teal">
                  {vendor.avatar}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{vendor.name}</p>
                  <p className="truncate text-xs text-slate">
                    {vendor.zoneName ?? 'No zone'} • Provider #{vendor.id}
                  </p>
                </div>
              </div>

              <div className="col-span-2">
                <div className={`omega-badge inline-flex items-center gap-2 border px-3 py-2 ${config.bgColor} ${config.borderColor}`}>
                  <StatusIcon className={`h-3.5 w-3.5 ${config.textColor}`} />
                  <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
                </div>
              </div>

              <div className="col-span-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-teal">{vendor.orderVolume24h}</p>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald" />
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal to-teal-neon"
                      style={{ width: `${Math.min((vendor.orderVolume24h / 100) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-3 space-y-1">
                <p className="text-sm font-medium text-foreground">{formatDispatchTimestamp(vendor.lastDispatchAt)}</p>
                <p className="text-xs text-slate">
                  {vendor.whatsappNumber ?? vendor.phone ?? 'No contact number'}
                </p>
              </div>

              <div className="col-span-2 text-right">
                <div className={`omega-badge inline-flex items-center gap-2 border px-3 py-2 ${
                  vendor.efficiencyScore !== null && vendor.efficiencyScore >= 95
                    ? 'border-emerald/20 bg-emerald/10'
                    : vendor.efficiencyScore !== null && vendor.efficiencyScore >= 85
                      ? 'border-slate/20 bg-slate/10'
                      : 'border-red/20 bg-red/10'
                }`}
                >
                  <p className={`text-sm font-bold ${
                    vendor.efficiencyScore !== null && vendor.efficiencyScore >= 95
                      ? 'text-emerald'
                      : vendor.efficiencyScore !== null && vendor.efficiencyScore >= 85
                        ? 'text-slate'
                        : 'text-red'
                  }`}
                  >
                    {vendor.efficiencyScore !== null ? `${vendor.efficiencyScore.toFixed(1)}%` : 'No data'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const VendorsTable = React.memo(VendorsTableImpl);

export default VendorsTable;
