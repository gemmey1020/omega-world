'use client';

import React from 'react';
import ChartWidget from './chart-widget';

function EfficiencyDonutChartImpl() {
  const segments = [
    { label: 'On-Time', value: 87, color: '#059669' }, // emerald
    { label: 'Delayed <1h', value: 10, color: '#20B2AA' }, // teal
    { label: 'Delayed >1h', value: 3, color: '#dc2626' }, // red
  ];

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let currentAngle = -90;

  const paths = segments.map((segment) => {
    const sliceAngle = (segment.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    const radius = 60;
    const innerRadius = 40;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);

    const ix1 = 100 + innerRadius * Math.cos(startRad);
    const iy1 = 100 + innerRadius * Math.sin(startRad);
    const ix2 = 100 + innerRadius * Math.cos(endRad);
    const iy2 = 100 + innerRadius * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;

    currentAngle = endAngle;

    return { path, color: segment.color, label: segment.label, value: segment.value };
  });

  return (
    <ChartWidget
      title="Dispatcher Efficiency"
      subtitle="Order completion performance distribution"
    >
      <div className="flex items-center justify-center gap-8">
        <svg viewBox="0 0 200 200" className="w-32 h-32">
          {paths.map((p, idx) => (
            <path
              key={idx}
              d={p.path}
              fill={p.color}
              opacity="0.8"
              className="hover:opacity-100 transition-opacity cursor-pointer"
            />
          ))}
          <circle cx="100" cy="100" r="35" fill="#0f172a" />
          <text
            x="100"
            y="95"
            textAnchor="middle"
            className="text-xs font-bold fill-teal"
          >
            87%
          </text>
          <text
            x="100"
            y="108"
            textAnchor="middle"
            className="text-xs fill-slate"
          >
            On Time
          </text>
        </svg>

        <div className="space-y-3">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
              <div>
                <p className="text-xs font-semibold text-foreground">{segment.label}</p>
                <p className="text-xs text-slate">{segment.value}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartWidget>
  );
}

const EfficiencyDonutChart = React.memo(EfficiencyDonutChartImpl);

export default EfficiencyDonutChart;
