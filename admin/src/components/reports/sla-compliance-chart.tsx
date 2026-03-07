'use client';

import React from 'react';
import ChartWidget from './chart-widget';
import { AdminSlaCompliancePoint } from '@/lib/admin-report-types';
import { useSlaTickerStore } from '@/stores/use-sla-ticker-store';

interface SLAComplianceChartProps {
  points: AdminSlaCompliancePoint[];
  generatedAt: string | null;
}

function formatFreshness(generatedAt: string | null, now: number): string {
  if (!generatedAt) {
    return 'Freshness unavailable';
  }

  const generatedMs = Date.parse(generatedAt);

  if (Number.isNaN(generatedMs)) {
    return 'Freshness unavailable';
  }

  const diffSeconds = Math.max(Math.floor((now - generatedMs) / 1000), 0);

  if (diffSeconds < 60) {
    return `Updated ${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  return `Updated ${diffMinutes}m ago`;
}

function SLAComplianceChartImpl({ points, generatedAt }: SLAComplianceChartProps) {
  const now = useSlaTickerStore((state) => state.now);
  const highlightLatest = Math.floor(now / 1000) % 2 === 0;

  return (
    <ChartWidget
      title="SLA Compliance Trend"
      subtitle={`${formatFreshness(generatedAt, now)} • Delivery on-time performance across the last 7 days`}
    >
      <div className="flex w-full items-end gap-2 px-4">
        {points.map((point, index) => {
          const isLatest = index === points.length - 1;
          const isBreachedBand = point.compliancePercent < 85;
          const barHeight = Math.max(point.compliancePercent * 1.2, 8);

          return (
            <div key={point.bucketDate} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full flex-col items-center">
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    isBreachedBand
                      ? 'bg-gradient-to-t from-red to-red/70'
                      : 'bg-gradient-to-t from-teal to-teal-neon'
                  } ${
                    isLatest && highlightLatest
                      ? 'shadow-[0_0_22px_rgba(0,255,209,0.28)]'
                      : ''
                  }`}
                  style={{ height: `${barHeight}px` }}
                />
              </div>
              <p className="text-xs font-medium text-slate">{point.bucketLabel}</p>
              <p className={`text-xs font-bold ${isBreachedBand ? 'text-red' : 'text-teal'}`}>
                {point.compliancePercent.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </ChartWidget>
  );
}

const SLAComplianceChart = React.memo(SLAComplianceChartImpl);

export default SLAComplianceChart;
