'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminApiError, fetchAdminZoneHealth } from '@/lib/admin-api';
import { AdminZoneHealthModel } from '@/lib/admin-zone-types';
import OmegaEmptyState from '@/components/shared/omega-empty-state';
import OmegaErrorPanel from '@/components/shared/omega-error-panel';

function formatMinutes(minutes: number | null): string {
  if (minutes === null) {
    return 'No data';
  }

  return `${Math.round(minutes)} min`;
}

function formatPercent(percent: number | null): string {
  if (percent === null) {
    return 'No data';
  }

  return `${percent.toFixed(1)}%`;
}

function getStatusBadge(status: AdminZoneHealthModel['status']) {
  return {
    healthy: { bg: 'bg-emerald/10', text: 'text-emerald', label: 'Healthy' },
    degraded: { bg: 'bg-slate/10', text: 'text-slate', label: 'Degraded' },
    critical: { bg: 'bg-red/10', text: 'text-red', label: 'Critical' },
  }[status];
}

export default function ZoneHealthTable() {
  const [zones, setZones] = useState<AdminZoneHealthModel[]>([]);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadZones = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    setIsLoading(true);

    try {
      const payload = await fetchAdminZoneHealth(signal);
      setZones(payload.data);
    } catch (caughtError) {
      if (signal?.aborted) {
        return;
      }

      setError(
        caughtError instanceof AdminApiError
          ? caughtError
          : new AdminApiError('Failed to load zone health.', 500),
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    void loadZones(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [loadZones]);

  return (
    <div className="bg-surface border border-border rounded-[18px] overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Zone Health Status</h2>
        <p className="text-sm text-slate mt-1">Real-time performance metrics across all operational zones</p>
      </div>

      {error ? (
        <div className="p-6">
          <OmegaErrorPanel
            status={error.status}
            message={error.message}
            onRetry={() => {
              void loadZones();
            }}
          />
        </div>
      ) : isLoading ? (
        <div className="px-6 py-10 text-sm text-slate">Loading zone health…</div>
      ) : zones.length === 0 ? (
        <div className="p-6">
          <OmegaEmptyState
            title="No zones to summarize"
            message="Once operational zones exist, their live health metrics will appear here."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-navy/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate uppercase tracking-wider">
                  Zone
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate uppercase tracking-wider">
                  Active Orders
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate uppercase tracking-wider">
                  Avg Delivery
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate uppercase tracking-wider">
                  SLA Compliance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {zones.map((zone) => {
                const statusBadge = getStatusBadge(zone.status);

                return (
                  <tr
                    key={zone.id}
                    className="h-14 transition-colors hover:bg-navy/50"
                  >
                    <td className="px-6 py-3 text-sm font-medium text-foreground">
                      <div className="space-y-1">
                        <p>{zone.name}</p>
                        <p className="text-xs text-slate">Manual interventions: {zone.manualInterventionCount}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`omega-badge inline-flex items-center px-3 py-2 text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-foreground">
                      {zone.activeOrders}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-slate">
                      {formatMinutes(zone.avgDeliveryMinutes)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm">
                      <span className={`font-semibold ${
                        zone.slaCompliancePercent !== null && zone.slaCompliancePercent >= 95
                          ? 'text-emerald'
                          : zone.slaCompliancePercent !== null && zone.slaCompliancePercent >= 85
                            ? 'text-slate'
                            : 'text-red'
                      }`}
                      >
                        {formatPercent(zone.slaCompliancePercent)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
