'use client';

import React from 'react';
import ChartWidget from './chart-widget';

function PeakVolumeChartImpl() {
  const dataPoints = [
    { hour: '00:00', orders: 8 },
    { hour: '06:00', orders: 15 },
    { hour: '12:00', orders: 45 },
    { hour: '18:00', orders: 78 },
    { hour: '20:00', orders: 62 },
    { hour: '23:00', orders: 28 },
  ];

  const maxOrders = Math.max(...dataPoints.map((p) => p.orders));

  return (
    <ChartWidget
      title="Peak Volume Distribution"
      subtitle="24-hour order pattern - Area view"
    >
      <div className="w-full flex items-end gap-1 px-4">
        {dataPoints.map((point, idx) => {
          const height = (point.orders / maxOrders) * 180;
          const isNext = idx < dataPoints.length - 1;
          const nextHeight = isNext ? (dataPoints[idx + 1].orders / maxOrders) * 180 : height;

          return (
            <div key={point.hour} className="flex-1 flex flex-col items-center gap-2 relative">
              <svg className="absolute -top-6 left-0 right-0 h-1" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#20B2AA" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#00FFD1" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 0 ${6 - height / 30} L 100 ${6 - nextHeight / 30}`}
                  stroke="url(#grad-0)"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>

              <div
                className="w-full bg-gradient-to-t from-emerald/50 to-teal rounded-t-sm transition-all hover:shadow-lg hover:shadow-teal/40"
                style={{ height: `${height}px` }}
              />
              <p className="text-xs text-slate">{point.hour}</p>
              <p className="text-xs font-bold text-emerald">{point.orders}K</p>
            </div>
          );
        })}
      </div>
    </ChartWidget>
  );
}

const PeakVolumeChart = React.memo(PeakVolumeChartImpl);

export default PeakVolumeChart;
