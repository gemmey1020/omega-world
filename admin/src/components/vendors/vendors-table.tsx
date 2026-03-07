'use client';

import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  avatar: string;
  connectionStatus: 'connected' | 'disconnected' | 'degraded';
  orderVolume: number;
  lastDispatch: string;
  efficiency: number;
}

interface VendorsTableProps {
  vendors: Vendor[];
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
      bgColor: 'bg-yellow-400/10',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-400/30',
      icon: AlertCircle,
    },
  };

  return (
    <div className="rounded-[18px] border border-teal/20 backdrop-blur-lg overflow-hidden bg-gradient-to-br from-surface/50 to-navy/50">
      {/* Glassmorphic Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-surface/80 to-surface/40 backdrop-blur-md border-b border-teal/10">
        <div className="grid grid-cols-12 gap-4 px-6 py-4">
          <div className="col-span-3 text-xs font-semibold uppercase tracking-wider text-slate">
            Vendor
          </div>
          <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate">
            Status
          </div>
          <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate">
            Volume (24h)
          </div>
          <div className="col-span-3 text-xs font-semibold uppercase tracking-wider text-slate">
            Last Dispatch
          </div>
          <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate">
            Efficiency
          </div>
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-border/30">
        {vendors.map((vendor) => {
          const config = statusConfig[vendor.connectionStatus];
          const StatusIcon = config.icon;

          return (
            <div
              key={vendor.id}
              className="min-h-16 grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-surface/30 transition-colors group"
            >
              {/* Vendor Info */}
              <div className="col-span-3 flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal/30 to-navy flex-shrink-0 flex items-center justify-center border border-teal/20 text-sm font-bold text-teal">
                  {vendor.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{vendor.name}</p>
                  <p className="text-xs text-slate truncate">{vendor.id}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="col-span-2">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-[10px] ${config.bgColor} border ${config.borderColor}`}
                >
                  <StatusIcon className={`w-3 h-3 ${config.textColor}`} />
                  <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
                </div>
              </div>

              {/* Order Volume Bar */}
              <div className="col-span-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-teal">{vendor.orderVolume}</p>
                    <TrendingUp className="w-3 h-3 text-emerald" />
                  </div>
                  <div className="w-full h-1.5 bg-navy rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal to-teal-neon rounded-full"
                      style={{ width: `${Math.min((vendor.orderVolume / 100) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Last Dispatch */}
              <div className="col-span-3">
                <p className="text-sm text-slate font-mono">{vendor.lastDispatch}</p>
              </div>

              {/* Efficiency Score */}
              <div className="col-span-2 text-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[10px] bg-emerald/10 border border-emerald/20">
                  <p className="text-sm font-bold text-emerald">{vendor.efficiency}%</p>
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
