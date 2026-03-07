'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminApiError, fetchAdminSlaCompliance } from '@/lib/admin-api';
import { AdminSlaCompliancePoint } from '@/lib/admin-report-types';
import OmegaEmptyState from '@/components/shared/omega-empty-state';
import OmegaErrorPanel from '@/components/shared/omega-error-panel';
import EfficiencyDonutChart from './efficiency-donut-chart';
import PeakVolumeChart from './peak-volume-chart';
import SLAComplianceChart from './sla-compliance-chart';

export default function ReportsPageClient() {
  const [points, setPoints] = useState<AdminSlaCompliancePoint[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSlaCompliance = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    setIsLoading(true);

    try {
      const payload = await fetchAdminSlaCompliance(7, signal);
      setPoints(payload.data);
      setGeneratedAt(payload.meta.generatedAt);
    } catch (caughtError) {
      if (signal?.aborted) {
        return;
      }

      setError(
        caughtError instanceof AdminApiError
          ? caughtError
          : new AdminApiError('Failed to load SLA compliance.', 500),
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    void loadSlaCompliance(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [loadSlaCompliance]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
        <p className="text-sm text-slate">Operational telemetry for the Command Center.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Total Orders (24h)" value="4,287" trend={12} />
        <MetricCard label="Avg Delivery Time" value="2h 14m" trend={-5} />
        <MetricCard label="SLA Compliance" value="96.4%" trend={2} />
        <MetricCard label="Active Vendors" value="24/28" trend={0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {error ? (
          <OmegaErrorPanel
            status={error.status}
            message={error.message}
            onRetry={() => {
              void loadSlaCompliance();
            }}
          />
        ) : isLoading ? (
          <div className="rounded-[18px] border border-border bg-surface px-6 py-10 text-sm text-slate">
            Loading SLA compliance…
          </div>
        ) : points.length === 0 ? (
          <OmegaEmptyState
            title="No SLA buckets available"
            message="The SLA compliance chart will populate after delivered orders are available in the selected window."
            actionLabel="Retry"
            onAction={() => {
              void loadSlaCompliance();
            }}
          />
        ) : (
          <SLAComplianceChart points={points} generatedAt={generatedAt} />
        )}
        <PeakVolumeChart />
      </div>

      <EfficiencyDonutChart />

      <div className="overflow-hidden rounded-[18px] border border-teal/20 bg-gradient-to-br from-surface/50 to-navy/50 p-6 backdrop-blur-lg">
        <h3 className="text-lg font-semibold text-foreground">System Alerts</h3>
        <div className="mt-4 space-y-3">
          <AlertItem
            type="critical"
            title="Vendor Connection Degraded"
            message="An upstream provider is missing dispatch acknowledgements inside the current SLA window."
            time="8 minutes ago"
          />
          <AlertItem
            type="info"
            title="SLA Breach Detected"
            message="Three active orders are past their effective deadline and require intervention."
            time="25 minutes ago"
          />
          <AlertItem
            type="success"
            title="System Capacity Stable"
            message="All other monitored zones remain within their expected throughput thresholds."
            time="1 hour ago"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: number;
}) {
  return (
    <div className="rounded-[18px] border border-teal/20 bg-gradient-to-br from-surface/50 to-navy/50 p-4 backdrop-blur-lg">
      <p className="mb-2 text-xs uppercase tracking-wider text-slate">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-teal">{value}</p>
        {trend !== 0 && (
          <p className={`text-xs font-semibold ${trend > 0 ? 'text-emerald' : 'text-red'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </p>
        )}
      </div>
    </div>
  );
}

function AlertItem({
  type,
  title,
  message,
  time,
}: {
  type: 'info' | 'critical' | 'success';
  title: string;
  message: string;
  time: string;
}) {
  const typeConfig = {
    info: { bgColor: 'bg-slate/10', borderColor: 'border-slate/20', textColor: 'text-slate' },
    critical: { bgColor: 'bg-red/10', borderColor: 'border-red/20', textColor: 'text-red' },
    success: { bgColor: 'bg-emerald/10', borderColor: 'border-emerald/20', textColor: 'text-emerald' },
  };

  const config = typeConfig[type];

  return (
    <div className={`flex items-start gap-3 rounded-[10px] border p-4 ${config.bgColor} ${config.borderColor}`}>
      <div className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${config.textColor} bg-current`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-slate">{message}</p>
        <p className="mt-2 text-xs text-slate/50">{time}</p>
      </div>
    </div>
  );
}
