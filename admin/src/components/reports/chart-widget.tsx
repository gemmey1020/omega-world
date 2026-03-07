'use client';

import React from 'react';

interface ChartWidgetProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function ChartWidgetImpl({ title, subtitle, children }: ChartWidgetProps) {
  return (
    <div className="rounded-[18px] border border-teal/20 backdrop-blur-lg overflow-hidden bg-gradient-to-br from-surface/50 to-navy/50 p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-slate">{subtitle}</p>}
      </div>

      {/* Chart Content */}
      <div className="w-full h-64 flex items-center justify-center">{children}</div>
    </div>
  );
}

const ChartWidget = React.memo(ChartWidgetImpl);

export default ChartWidget;
