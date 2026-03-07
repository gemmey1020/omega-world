'use client';

import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import OrdersVirtualList from '@/components/orders/orders-virtual-list';
import { OmegaErrorPanel } from '@/components/shared/omega-error-panel';
import { AdminApiError, fetchAdminOrdersPage } from '@/lib/admin-api';
import { AdminOrderRowModel, AdminOrdersMeta } from '@/lib/admin-order-types';

const PAGE_SIZE = 100;

export default function OrdersPageClient() {
  const [orders, setOrders] = useState<AdminOrderRowModel[]>([]);
  const [meta, setMeta] = useState<AdminOrdersMeta | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const nextPageRef = useRef(1);

  const loadPage = useCallback(async (page: number, replace: boolean) => {
    const payload = await fetchAdminOrdersPage(page, PAGE_SIZE);

    startTransition(() => {
      setMeta(payload.meta);
      setOrders((currentOrders) => {
        if (replace) {
          return payload.data;
        }

        const seenIds = new Set(currentOrders.map((order) => order.id));
        const mergedOrders = [...currentOrders];

        for (const order of payload.data) {
          if (!seenIds.has(order.id)) {
            mergedOrders.push(order);
            seenIds.add(order.id);
          }
        }

        return mergedOrders;
      });
      nextPageRef.current = page + 1;
    });
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const run = async () => {
      setIsInitialLoading(true);
      setError(null);

      try {
        const payload = await fetchAdminOrdersPage(1, PAGE_SIZE, abortController.signal);

        startTransition(() => {
          setOrders(payload.data);
          setMeta(payload.meta);
          nextPageRef.current = 2;
        });
      } catch (caughtError) {
        if (!abortController.signal.aborted) {
          setError(
            caughtError instanceof AdminApiError
              ? caughtError
              : new AdminApiError('Failed to load orders.', 500),
          );
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsInitialLoading(false);
        }
      }
    };

    void run();

    return () => {
      abortController.abort();
    };
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || meta === null || nextPageRef.current > meta.last_page) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      await loadPage(nextPageRef.current, false);
    } catch (caughtError) {
      setError(
        caughtError instanceof AdminApiError
          ? caughtError
          : new AdminApiError('Failed to load more orders.', 500),
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, loadPage, meta]);

  const hasMore = meta !== null && nextPageRef.current <= meta.last_page;
  const handleVirtualLoadMore = useCallback(() => {
    void handleLoadMore();
  }, [handleLoadMore]);

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
          <p className="mt-2 text-sm text-slate">
            Virtualized live order queue with a single global SLA ticker.
          </p>
        </div>
        <div className="rounded-[18px] border border-border bg-surface px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate">Loaded Orders</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{orders.length}</p>
        </div>
      </div>

      {error && (
        <OmegaErrorPanel
          status={error.status}
          message={error.message}
        />
      )}

      {isInitialLoading ? (
        <div className="rounded-[18px] border border-border bg-surface px-6 py-10 text-sm text-slate">
          Loading orders…
        </div>
      ) : (
        <>
          <OrdersVirtualList
            orders={orders}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleVirtualLoadMore}
          />
          <div className="flex items-center justify-between text-xs text-slate">
            <span>
              {meta ? `Page ${meta.current_page} of ${meta.last_page}` : 'No pagination state'}
            </span>
            <span>
              {isLoadingMore ? 'Loading more…' : hasMore ? 'Scroll to load more' : 'All orders loaded'}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
