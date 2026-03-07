'use client';

import React from 'react';
import ChartWidget from './chart-widget';

function SLAComplianceChartImpl() {
  const dataPoints = [
    { day: 'Mon', compliance: 98 },
    { day: 'Tue', compliance: 96 },
    { day: 'Wed', compliance: 94 },
    { day: 'Thu', compliance: 99 },
    { day: 'Fri', compliance: 97 },
    { day: 'Sat', compliance: 95 },
    { day: 'Sun', compliance: 92 },
  ];

  return (
    <ChartWidget
      title="SLA Compliance Trend"
      subtitle="Last 7 days - Delivery on time performance"
    >
      <div className="w-full flex items-end gap-2 px-4">
        {dataPoints.map((point) => (
          <div key={point.day} className="flex-1 flex flex-col items-center gap-2">
            <div className="relative w-full flex flex-col items-center">
              <div
                className="w-full bg-gradient-to-t from-teal to-teal-neon rounded-t-sm transition-all hover:shadow-lg hover:shadow-teal/40"
                style={{ height: `${point.compliance * 1.2}px` }}
              />
            </div>
            <p className="text-xs text-slate font-medium">{point.day}</p>
            <p className="text-xs font-bold text-teal">{point.compliance}%</p>
          </div>
        ))}
      </div>
    </ChartWidget>
  );
}

const SLAComplianceChart = React.memo(SLAComplianceChartImpl);

export default SLAComplianceChart;
