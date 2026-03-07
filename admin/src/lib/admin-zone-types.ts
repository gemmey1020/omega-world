export interface AdminZoneHealthModel {
  id: number;
  name: string;
  coordinates: {
    type: string;
    coordinates: unknown;
  } | null;
  activeOrders: number;
  manualInterventionCount: number;
  breachCount: number;
  avgDeliveryMinutes: number | null;
  slaCompliancePercent: number | null;
  status: 'healthy' | 'degraded' | 'critical';
}

export interface AdminZoneHealthResponse {
  data: AdminZoneHealthModel[];
}

interface AdminZoneHealthPayload {
  id: number;
  name: string;
  coordinates: {
    type: string;
    coordinates: unknown;
  } | null;
  active_orders: number;
  manual_intervention_count: number;
  breach_count: number;
  avg_delivery_minutes: number | null;
  sla_compliance_percent: number | null;
  status: 'healthy' | 'degraded' | 'critical';
}

interface AdminZoneHealthApiPayload {
  data: AdminZoneHealthPayload[];
}

export function mapAdminZoneHealthResponse(payload: AdminZoneHealthApiPayload): AdminZoneHealthResponse {
  return {
    data: payload.data.map((zone) => ({
      id: zone.id,
      name: zone.name,
      coordinates: zone.coordinates,
      activeOrders: Number(zone.active_orders ?? 0),
      manualInterventionCount: Number(zone.manual_intervention_count ?? 0),
      breachCount: Number(zone.breach_count ?? 0),
      avgDeliveryMinutes: zone.avg_delivery_minutes !== null ? Number(zone.avg_delivery_minutes) : null,
      slaCompliancePercent: zone.sla_compliance_percent !== null ? Number(zone.sla_compliance_percent) : null,
      status: zone.status,
    })),
  };
}
