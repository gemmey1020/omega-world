'use client';

import KPICard from './kpi-card';
import SLABreachCard from './sla-breach-card';
import ZoneHealthTable from './zone-health-table';
import EventFeed from './event-feed';
import { BarChart3, CheckCircle, Package } from '@/lib/icons';

export default function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Overview</h1>
        <p className="text-slate mt-2">Real-time operations dashboard</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          label="Orders Received"
          value="1,248"
          trend={{ direction: 'up', percentage: 12 }}
          icon={<Package className="h-8 w-8 text-teal" />}
        />
        <KPICard
          label="Orders Dispatched"
          value="987"
          trend={{ direction: 'up', percentage: 8 }}
          icon={<BarChart3 className="h-8 w-8 text-emerald" />}
        />
        <KPICard
          label="Deliveries Completed"
          value="764"
          trend={{ direction: 'up', percentage: 15 }}
          icon={<CheckCircle className="h-8 w-8 text-emerald" />}
        />
      </div>

      {/* SLA Breach Alert */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <SLABreachCard count={23} percentage={4.2} />
        </div>

        {/* Quick Stats */}
        <div className="md:col-span-3 grid grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-[18px] p-6">
            <p className="text-sm text-slate mb-2">Avg Response Time</p>
            <p className="text-2xl font-bold text-emerald">2.4s</p>
            <p className="text-xs text-slate mt-1">System latency</p>
          </div>
          <div className="bg-surface border border-border rounded-[18px] p-6">
            <p className="text-sm text-slate mb-2">System Health</p>
            <p className="text-2xl font-bold text-emerald">99.8%</p>
            <p className="text-xs text-slate mt-1">Uptime</p>
          </div>
          <div className="bg-surface border border-border rounded-[18px] p-6">
            <p className="text-sm text-slate mb-2">Active Vendors</p>
            <p className="text-2xl font-bold text-blue-400">47</p>
            <p className="text-xs text-slate mt-1">Online now</p>
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 gap-6">
        <ZoneHealthTable />
      </div>

      {/* Event Feed */}
      <div className="grid grid-cols-1 gap-6">
        <EventFeed />
      </div>
    </div>
  );
}
