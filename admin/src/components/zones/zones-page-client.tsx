'use client';

import React from 'react';
import ZoneCard from './zone-card';

const MOCK_ZONES = [
  { zoneId: 'ZONE-NYC-01', zoneName: 'Manhattan Central', activeOrders: 45, health: 'healthy' as const },
  { zoneId: 'ZONE-NYC-02', zoneName: 'Brooklyn South', activeOrders: 28, health: 'healthy' as const },
  { zoneId: 'ZONE-NYC-03', zoneName: 'Queens Midtown', activeOrders: 52, health: 'warning' as const },
  { zoneId: 'ZONE-NYC-04', zoneName: 'Bronx North', activeOrders: 12, health: 'healthy' as const },
  { zoneId: 'ZONE-NYC-05', zoneName: 'Staten Island', activeOrders: 8, health: 'critical' as const },
  { zoneId: 'ZONE-NYC-06', zoneName: 'Downtown Grid', activeOrders: 67, health: 'healthy' as const },
];

export default function ZonesPageClient() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Zone Operations</h1>
        <p className="text-sm text-slate">Real-time zone health and order distribution across your network</p>
      </div>

      {/* Zone Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_ZONES.map((zone) => (
          <ZoneCard
            key={zone.zoneId}
            zoneId={zone.zoneId}
            zoneName={zone.zoneName}
            activeOrders={zone.activeOrders}
            health={zone.health}
          />
        ))}
      </div>
    </div>
  );
}
