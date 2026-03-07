'use client';

import React from 'react';
import SLAComplianceChart from './sla-compliance-chart';
import PeakVolumeChart from './peak-volume-chart';
import EfficiencyDonutChart from './efficiency-donut-chart';

export default function ReportsPageClient() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
        <p className="text-sm text-slate">Data visualization hub for operational insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Total Orders (24h)" value="4,287" trend={12} />
        <MetricCard label="Avg Delivery Time" value="2h 14m" trend={-5} />
        <MetricCard label="SLA Compliance" value="96.4%" trend={2} />
        <MetricCard label="Active Vendors" value="24/28" trend={0} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SLAComplianceChart />
        <PeakVolumeChart />
      </div>

      {/* Full Width Chart */}
      <EfficiencyDonutChart />

      {/* Recent Activity */}
      <div className="rounded-[18px] border border-teal/20 backdrop-blur-lg overflow-hidden bg-gradient-to-br from-surface/50 to-navy/50 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">System Alerts</h3>
        <div className="space-y-3">
          <AlertItem
            type="warning"
            title="Vendor Connection Degraded"
            message="Metro Dispatch experiencing 30% packet loss"
            time="8 minutes ago"
          />
          <AlertItem
            type="info"
            title="SLA Breach Detected"
            message="3 orders exceeded delivery window"
            time="25 minutes ago"
          />
          <AlertItem
            type="success"
            title="System Capacity Optimal"
            message="All zones operating at normal capacity"
            time="1 hour ago"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: number;
}) {
  return (
    <div className="rounded-[18px] border border-teal/20 bg-gradient-to-br from-surface/50 to-navy/50 p-4 backdrop-blur-lg">
      <p className="text-xs text-slate uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-teal">{value}</p>
        {trend !== 0 && (
          <p className={`text-xs font-semibold ${trend > 0 ? 'text-emerald' : 'text-red'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </p>
        )}
      </div>
    </div>
  );
}

function AlertItem({
  type,
  title,
  message,
  time,
}: {
  type: 'info' | 'warning' | 'success';
  title: string;
  message: string;
  time: string;
}) {
  const typeConfig = {
    info: { bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400' },
    warning: { bgColor: 'bg-yellow-400/10', borderColor: 'border-yellow-400/20', textColor: 'text-yellow-400' },
    success: { bgColor: 'bg-emerald/10', borderColor: 'border-emerald/20', textColor: 'text-emerald' },
  };

  const config = typeConfig[type];

  return (
    <div className={`rounded-[10px] border p-4 ${config.bgColor} ${config.borderColor} flex items-start gap-3`}>
      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${config.textColor} bg-current`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-slate mt-1">{message}</p>
        <p className="text-xs text-slate/50 mt-2">{time}</p>
      </div>
    </div>
  );
}
