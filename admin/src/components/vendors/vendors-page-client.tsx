'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AdminApiError, fetchAdminVendorsPage } from '@/lib/admin-api';
import { AdminVendorListMeta, AdminVendorRowModel } from '@/lib/admin-vendor-types';
import OmegaEmptyState from '@/components/shared/omega-empty-state';
import OmegaErrorPanel from '@/components/shared/omega-error-panel';
import VendorsTable from './vendors-table';

const PAGE_SIZE = 100;

function formatAverageEfficiency(vendors: AdminVendorRowModel[]): string {
  const values = vendors
    .map((vendor) => vendor.efficiencyScore)
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return 'No data';
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return `${average.toFixed(1)}%`;
}

export default function VendorsPageClient() {
  const [vendors, setVendors] = useState<AdminVendorRowModel[]>([]);
  const [meta, setMeta] = useState<AdminVendorListMeta | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const nextPageRef = useRef(1);

  const loadPage = useCallback(async (page: number, replace: boolean, signal?: AbortSignal) => {
    const payload = await fetchAdminVendorsPage(page, PAGE_SIZE, signal);

    setMeta(payload.meta);
    setVendors((current) => {
      if (replace) {
        return payload.data;
      }

      const seenIds = new Set(current.map((vendor) => vendor.id));
      const merged = [...current];

      for (const vendor of payload.data) {
        if (!seenIds.has(vendor.id)) {
          merged.push(vendor);
          seenIds.add(vendor.id);
        }
      }

      return merged;
    });
    nextPageRef.current = page + 1;
  }, []);

  const loadInitial = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    setIsLoading(true);

    try {
      await loadPage(1, true, signal);
    } catch (caughtError) {
      if (!signal?.aborted) {
        setError(
          caughtError instanceof AdminApiError
            ? caughtError
            : new AdminApiError('Failed to load vendors.', 500),
        );
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [loadPage]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadInitial(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [loadInitial]);

  const hasMore = meta !== null && nextPageRef.current <= meta.last_page;

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) {
      return;
    }

    setError(null);
    setIsLoadingMore(true);

    try {
      await loadPage(nextPageRef.current, false);
    } catch (caughtError) {
      setError(
        caughtError instanceof AdminApiError
          ? caughtError
          : new AdminApiError('Failed to load more vendors.', 500),
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadPage]);

  const connectedCount = vendors.filter((vendor) => vendor.connectionStatus === 'connected').length;
  const totalOrders24h = vendors.reduce((sum, vendor) => sum + vendor.orderVolume24h, 0);

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Vendor Management</h1>
        <p className="text-sm text-slate">
          Operational truth for merchant providers, dispatch freshness, and seven-day delivery efficiency.
        </p>
      </div>

      {error && (
        <OmegaErrorPanel
          status={error.status}
          message={error.message}
          onRetry={() => {
            void loadInitial();
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total Vendors" value={String(meta?.total ?? vendors.length)} />
        <StatCard label="Connected" value={String(connectedCount)} />
        <StatCard label="Avg Efficiency" value={formatAverageEfficiency(vendors)} />
        <StatCard label="24h Orders" value={String(totalOrders24h)} />
      </div>

      {isLoading ? (
        <div className="rounded-[18px] border border-border bg-surface px-6 py-10 text-sm text-slate">
          Loading vendors…
        </div>
      ) : vendors.length === 0 ? (
        <OmegaEmptyState
          title="No vendors available"
          message="Merchant providers will appear here when the backend has active provider records."
          actionLabel="Retry"
          onAction={() => {
            void loadInitial();
          }}
        />
      ) : (
        <div className="space-y-4">
          <VendorsTable vendors={vendors} />
          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  void loadMore();
                }}
                className="omega-control inline-flex items-center justify-center border border-teal/30 bg-teal/10 px-6 text-sm font-semibold text-teal transition-colors hover:bg-teal/15"
              >
                {isLoadingMore ? 'Loading more vendors…' : 'Load more vendors'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-teal/20 bg-gradient-to-br from-surface/50 to-navy/50 p-4 backdrop-blur-lg">
      <p className="text-xs text-slate uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-teal">{value}</p>
    </div>
  );
}
