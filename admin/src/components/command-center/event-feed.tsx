interface Event {
  id: string;
  type: 'order' | 'delivery' | 'alert' | 'system';
  title: string;
  description: string;
  timestamp: string;
  zone?: string;
}

const mockEvents: Event[] = [
  {
    id: 'evt-001',
    type: 'alert',
    title: 'SLA Breach Alert',
    description: 'Order ORD-4892 exceeding delivery SLA',
    timestamp: '2 min ago',
    zone: 'Downtown Central',
  },
  {
    id: 'evt-002',
    type: 'delivery',
    title: 'Order Delivered',
    description: 'ORD-4891 successfully delivered by V-2847',
    timestamp: '5 min ago',
    zone: 'Riverside District',
  },
  {
    id: 'evt-003',
    type: 'order',
    title: 'New Order Received',
    description: 'ORD-4893 from Vendor V-1003 to address on Pine St',
    timestamp: '7 min ago',
    zone: 'North Park Area',
  },
  {
    id: 'evt-004',
    type: 'system',
    title: 'System Update',
    description: 'Routing algorithms updated to v2.4.1',
    timestamp: '12 min ago',
  },
  {
    id: 'evt-005',
    type: 'delivery',
    title: 'Order Delivered',
    description: 'ORD-4890 successfully delivered by V-3122',
    timestamp: '18 min ago',
    zone: 'Harbor Bay Zone',
  },
  {
    id: 'evt-006',
    type: 'order',
    title: 'New Order Received',
    description: 'ORD-4892 from Vendor V-2156 to address on Oak Ave',
    timestamp: '24 min ago',
    zone: 'Downtown Central',
  },
  {
    id: 'evt-007',
    type: 'alert',
    title: 'Zone Degradation',
    description: 'North Park Area experiencing high load (142% capacity)',
    timestamp: '31 min ago',
    zone: 'North Park Area',
  },
  {
    id: 'evt-008',
    type: 'delivery',
    title: 'Order Delivered',
    description: 'ORD-4889 successfully delivered by V-1902',
    timestamp: '37 min ago',
    zone: 'Industrial Estate',
  },
];

function getEventIcon(type: Event['type']) {
  return {
    order: '📦',
    delivery: '✅',
    alert: '⚠️',
    system: '⚙️',
  }[type];
}

function getEventColor(type: Event['type']) {
  return {
    order: 'text-blue-400',
    delivery: 'text-emerald',
    alert: 'text-warning',
    system: 'text-slate',
  }[type];
}

export default function EventFeed() {
  return (
    <div className="bg-surface border border-border rounded-[18px] overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Live Event Feed</h2>
        <p className="text-sm text-slate mt-1">Real-time operations and system events</p>
      </div>

      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {mockEvents.map((event) => (
          <div
            key={event.id}
            className="px-6 py-3.5 hover:bg-navy/50 transition-colors h-11 flex items-center gap-4"
          >
            <div className="text-lg flex-shrink-0 w-6">
              {getEventIcon(event.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {event.title}
              </p>
              <p className="text-xs text-slate truncate">
                {event.description}
                {event.zone && ` • ${event.zone}`}
              </p>
            </div>
            <span className="text-xs text-slate flex-shrink-0 whitespace-nowrap">
              {event.timestamp}
            </span>
          </div>
        ))}
      </div>

      <div className="px-6 py-3 border-t border-border bg-navy/50">
        <button className="text-xs font-semibold text-emerald hover:text-emerald/80 transition-colors">
          View all events →
        </button>
      </div>
    </div>
  );
}
