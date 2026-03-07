'use client';

import React from 'react';
import VendorsTable from './vendors-table';

const MOCK_VENDORS = [
  {
    id: 'VENDOR-001',
    name: 'Swift Logistics',
    avatar: 'SL',
    connectionStatus: 'connected' as const,
    orderVolume: 87,
    lastDispatch: '2025-03-07T18:42:15Z',
    efficiency: 98,
  },
  {
    id: 'VENDOR-002',
    name: 'Urban Express',
    avatar: 'UE',
    connectionStatus: 'connected' as const,
    orderVolume: 64,
    lastDispatch: '2025-03-07T18:39:22Z',
    efficiency: 94,
  },
  {
    id: 'VENDOR-003',
    name: 'Metro Dispatch',
    avatar: 'MD',
    connectionStatus: 'degraded' as const,
    orderVolume: 42,
    lastDispatch: '2025-03-07T18:35:08Z',
    efficiency: 82,
  },
  {
    id: 'VENDOR-004',
    name: 'Fleet Central',
    avatar: 'FC',
    connectionStatus: 'connected' as const,
    orderVolume: 71,
    lastDispatch: '2025-03-07T18:41:03Z',
    efficiency: 96,
  },
  {
    id: 'VENDOR-005',
    name: 'Quantum Couriers',
    avatar: 'QC',
    connectionStatus: 'disconnected' as const,
    orderVolume: 0,
    lastDispatch: '2025-03-07T16:12:45Z',
    efficiency: 0,
  },
  {
    id: 'VENDOR-006',
    name: 'Velocity Routes',
    avatar: 'VR',
    connectionStatus: 'connected' as const,
    orderVolume: 56,
    lastDispatch: '2025-03-07T18:40:19Z',
    efficiency: 91,
  },
];

export default function VendorsPageClient() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Vendor Management</h1>
        <p className="text-sm text-slate">Monitor vendor connections, order volume, and operational efficiency</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Vendors" value={MOCK_VENDORS.length.toString()} />
        <StatCard
          label="Connected"
          value={MOCK_VENDORS.filter((v) => v.connectionStatus === 'connected').length.toString()}
        />
        <StatCard
          label="Avg Efficiency"
          value={`${Math.round(MOCK_VENDORS.reduce((sum, v) => sum + v.efficiency, 0) / MOCK_VENDORS.length)}%`}
        />
        <StatCard
          label="24h Orders"
          value={MOCK_VENDORS.reduce((sum, v) => sum + v.orderVolume, 0).toString()}
        />
      </div>

      {/* Vendors Table */}
      <VendorsTable vendors={MOCK_VENDORS} />
    </div>
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
