'use client';

import React from 'react';
import { Activity, AlertCircle, CheckCircle } from '@/lib/icons';
import { AdminZoneHealthModel } from '@/lib/admin-zone-types';
import { useSlaTickerStore } from '@/stores/use-sla-ticker-store';

interface ZoneCardProps {
  zone: AdminZoneHealthModel;
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) {
    return 'No data';
  }

  return `${Math.round(minutes)} min`;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return 'No data';
  }

  return `${value.toFixed(1)}%`;
}

function ZoneCardImpl({ zone }: ZoneCardProps) {
  const now = useSlaTickerStore((state) => state.now);
  const pulseEnabled = zone.status === 'critical'
    ? Math.floor(now / 1000) % 2 === 0
    : zone.status === 'degraded'
      ? Math.floor(now / 2000) % 2 === 0
      : false;

  const healthConfig = {
    healthy: {
      accent: 'text-emerald',
      border: 'border-emerald/30',
      background: 'from-emerald/10 to-surface/70',
      overlay: 'bg-emerald/5',
      icon: CheckCircle,
      label: 'Healthy',
    },
    degraded: {
      accent: 'text-slate',
      border: 'border-slate/40',
      background: 'from-slate/15 to-surface/70',
      overlay: 'bg-slate/10',
      icon: AlertCircle,
      label: 'Degraded',
    },
    critical: {
      accent: 'text-red',
      border: 'border-red/30',
      background: 'from-red/10 to-surface/70',
      overlay: 'bg-red/10',
      icon: AlertCircle,
      label: 'Critical',
    },
  }[zone.status];

  const HealthIcon = healthConfig.icon;

  return (
    <article
      className={`relative overflow-hidden rounded-[18px] border bg-gradient-to-br ${healthConfig.background} p-6 backdrop-blur-lg transition-shadow duration-300 hover:shadow-[0_18px_50px_rgba(0,255,209,0.08)] ${healthConfig.border}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 rounded-[18px] transition-opacity duration-500 ${healthConfig.overlay} ${
          pulseEnabled ? 'opacity-100' : 'opacity-20'
        }`}
      />

      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">
              Zone {zone.id}
            </p>
            <h3 className="text-lg font-semibold text-foreground">{zone.name}</h3>
            <p className="text-xs text-slate">
              {zone.coordinates ? 'Geo-linked coverage shape attached' : 'No spatial geometry available'}
            </p>
          </div>
          <div className={`omega-badge inline-flex items-center gap-2 border px-3 py-2 ${healthConfig.border} bg-navy/60`}>
            <HealthIcon className={`h-4 w-4 ${healthConfig.accent}`} />
            <span className={`text-xs font-semibold uppercase tracking-[0.12em] ${healthConfig.accent}`}>
              {healthConfig.label}
            </span>
          </div>
        </div>

        <div className="rounded-[10px] border border-teal/15 bg-navy/60 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-teal/20 bg-teal/10">
              <Activity className="h-5 w-5 text-teal" />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-slate">Live load</p>
              <p className="text-2xl font-bold text-teal">{zone.activeOrders}</p>
              <p className="text-xs text-slate">
                {zone.breachCount} active breach{zone.breachCount === 1 ? '' : 'es'} across this zone
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[10px] border border-border bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate">SLA Compliance</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{formatPercent(zone.slaCompliancePercent)}</p>
          </div>
          <div className="rounded-[10px] border border-border bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate">Avg Delivery</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{formatMinutes(zone.avgDeliveryMinutes)}</p>
          </div>
          <div className="rounded-[10px] border border-border bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate">Manual Interventions</p>
            <p className={`mt-2 text-lg font-semibold ${zone.manualInterventionCount > 0 ? 'text-red' : 'text-foreground'}`}>
              {zone.manualInterventionCount}
            </p>
          </div>
          <div className="rounded-[10px] border border-border bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate">Breach Pressure</p>
            <p className={`mt-2 text-lg font-semibold ${zone.breachCount > 0 ? healthConfig.accent : 'text-foreground'}`}>
              {zone.breachCount}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

const ZoneCard = React.memo(ZoneCardImpl);

export default ZoneCard;
