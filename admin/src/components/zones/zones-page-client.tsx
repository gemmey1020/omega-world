'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminApiError, fetchAdminZoneHealth } from '@/lib/admin-api';
import { AdminZoneHealthModel } from '@/lib/admin-zone-types';
import OmegaEmptyState from '@/components/shared/omega-empty-state';
import OmegaErrorPanel from '@/components/shared/omega-error-panel';
import ZoneCard from './zone-card';

export default function ZonesPageClient() {
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
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Zone Operations</h1>
        <p className="text-sm text-slate">
          Real operational health, breach pressure, and delivery pace across every active zone.
        </p>
      </div>

      {error && (
        <OmegaErrorPanel
          status={error.status}
          message={error.message}
          onRetry={() => {
            void loadZones();
          }}
        />
      )}

      {isLoading ? (
        <div className="rounded-[18px] border border-border bg-surface px-6 py-10 text-sm text-slate">
          Loading zone health…
        </div>
      ) : zones.length === 0 ? (
        <OmegaEmptyState
          title="No operational zones found"
          message="Zone health becomes visible here once the backend has active zones to summarize."
          actionLabel="Retry"
          onAction={() => {
            void loadZones();
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {zones.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      )}
    </section>
  );
}
