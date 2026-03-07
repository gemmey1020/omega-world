'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AdminOrderRowModel } from '@/lib/admin-order-types';
import OrderRow from '@/components/orders/order-row';

interface OrdersVirtualListProps {
  orders: AdminOrderRowModel[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export default function OrdersVirtualList({
  orders,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: OrdersVirtualListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
    getItemKey: (index) => orders[index]?.id ?? index,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastVirtualItem = useMemo(
    () => virtualItems[virtualItems.length - 1] ?? null,
    [virtualItems],
  );

  useEffect(() => {
    if (!hasMore || isLoadingMore || lastVirtualItem === null) {
      return;
    }

    if (lastVirtualItem.index >= orders.length - 10) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, lastVirtualItem, onLoadMore, orders.length]);

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-120px)] overflow-y-auto rounded-[18px] border border-border bg-navy/40"
      style={{ contain: 'strict' }}
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualItem) => {
          const order = orders[virtualItem.index];

          if (!order) {
            return null;
          }

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              className="absolute left-0 top-0 w-full px-3 py-1.5"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <OrderRow order={order} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
