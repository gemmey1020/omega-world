'use client';

import React from 'react';
import { Activity, AlertCircle, CheckCircle } from 'lucide-react';

interface ZoneCardProps {
  zoneId: string;
  zoneName: string;
  activeOrders: number;
  health: 'healthy' | 'warning' | 'critical';
  mapSvg?: string;
}

function ZoneCardImpl({ zoneId, zoneName, activeOrders, health }: ZoneCardProps) {
  const healthConfig = {
    healthy: {
      color: 'text-emerald',
      bgColor: 'bg-emerald/10',
      borderColor: 'border-emerald/30',
      icon: CheckCircle,
      label: 'Healthy',
    },
    warning: {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/30',
      icon: AlertCircle,
      label: 'Warning',
    },
    critical: {
      color: 'text-red',
      bgColor: 'bg-red/10',
      borderColor: 'border-red/30',
      icon: AlertCircle,
      label: 'Critical',
    },
  };

  const config = healthConfig[health];
  const HealthIcon = config.icon;

  return (
    <article
      className={`group relative rounded-[18px] border p-6 backdrop-blur-lg transition-all duration-300 ${
        config.borderColor
      } ${config.bgColor} hover:shadow-lg hover:shadow-teal/20`}
    >
      {/* Glassmorphic Overlay */}
      <div className="absolute inset-0 rounded-[18px] bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">{zoneName}</h3>
            <p className="text-xs text-slate">Zone ID: {zoneId}</p>
          </div>
          <div className={`${config.color}`}>
            <HealthIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="h-32 rounded-[10px] bg-gradient-to-br from-teal/20 to-transparent border border-teal/20 flex items-center justify-center">
          <svg
            className="w-16 h-16 text-teal/40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[10px] bg-navy/50 p-3 border border-teal/10">
            <p className="text-xs text-slate mb-1">Active Orders</p>
            <p className="text-lg font-bold text-teal">{activeOrders}</p>
          </div>
          <div className="rounded-[10px] bg-navy/50 p-3 border border-teal/10">
            <p className="text-xs text-slate mb-1">Status</p>
            <p className={`text-xs font-semibold uppercase tracking-wide ${config.color}`}>
              {config.label}
            </p>
          </div>
        </div>

        {/* Neon Pulse Effect for Critical */}
        {health === 'critical' && (
          <div className="absolute inset-0 rounded-[18px] animate-pulse bg-red/5" />
        )}
      </div>
    </article>
  );
}

const ZoneCard = React.memo(ZoneCardImpl);

export default ZoneCard;
