interface Zone {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  activeOrders: number;
  avgDeliveryTime: string;
  satisfactionScore: number;
}

const mockZones: Zone[] = [
  {
    id: 'zone-01',
    name: 'Downtown Central',
    status: 'healthy',
    activeOrders: 342,
    avgDeliveryTime: '24 min',
    satisfactionScore: 98,
  },
  {
    id: 'zone-02',
    name: 'Riverside District',
    status: 'healthy',
    activeOrders: 287,
    avgDeliveryTime: '26 min',
    satisfactionScore: 96,
  },
  {
    id: 'zone-03',
    name: 'North Park Area',
    status: 'degraded',
    activeOrders: 156,
    avgDeliveryTime: '31 min',
    satisfactionScore: 92,
  },
  {
    id: 'zone-04',
    name: 'Harbor Bay Zone',
    status: 'healthy',
    activeOrders: 198,
    avgDeliveryTime: '25 min',
    satisfactionScore: 97,
  },
  {
    id: 'zone-05',
    name: 'Industrial Estate',
    status: 'critical',
    activeOrders: 89,
    avgDeliveryTime: '42 min',
    satisfactionScore: 78,
  },
];

function getStatusBadge(status: Zone['status']) {
  return {
    healthy: { bg: 'bg-emerald/10', text: 'text-emerald', label: 'Healthy' },
    degraded: { bg: 'bg-slate/10', text: 'text-slate', label: 'Degraded' },
    critical: { bg: 'bg-red/10', text: 'text-red', label: 'Critical' },
  }[status];
}

export default function ZoneHealthTable() {
  return (
    <div className="bg-surface border border-border rounded-[18px] overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Zone Health Status</h2>
        <p className="text-sm text-slate mt-1">Real-time performance metrics across all operational zones</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-navy/50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate uppercase tracking-wider">
                Zone
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate uppercase tracking-wider">
                Active Orders
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate uppercase tracking-wider">
                Avg Delivery
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate uppercase tracking-wider">
                Satisfaction
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockZones.map((zone) => {
              const statusBadge = getStatusBadge(zone.status);
              return (
                <tr
                  key={zone.id}
                  className="hover:bg-navy/50 transition-colors h-12"
                >
                  <td className="px-6 py-3 text-sm font-medium text-foreground">
                    {zone.name}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-[10px] text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
                    >
                      {statusBadge.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-right text-foreground">
                    {zone.activeOrders}
                  </td>
                  <td className="px-6 py-3 text-sm text-right text-slate">
                    {zone.avgDeliveryTime}
                  </td>
                  <td className="px-6 py-3 text-sm text-right">
                    <span
                      className={`font-semibold ${
                        zone.satisfactionScore >= 95
                          ? 'text-emerald'
                          : zone.satisfactionScore >= 85
                          ? 'text-slate'
                          : 'text-red'
                      }`}
                    >
                      {zone.satisfactionScore}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
