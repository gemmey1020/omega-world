export interface AdminSlaCompliancePoint {
  bucketLabel: string;
  bucketDate: string;
  compliancePercent: number;
  deliveredCount: number;
  breachedCount: number;
}

export interface AdminSlaComplianceMeta {
  days: number;
  generatedAt: string;
}

export interface AdminSlaComplianceResponse {
  data: AdminSlaCompliancePoint[];
  meta: AdminSlaComplianceMeta;
}

interface AdminSlaCompliancePointPayload {
  bucket_label: string;
  bucket_date: string;
  compliance_percent: number;
  delivered_count: number;
  breached_count: number;
}

interface AdminSlaComplianceMetaPayload {
  days: number;
  generated_at: string;
}

interface AdminSlaComplianceApiPayload {
  data: AdminSlaCompliancePointPayload[];
  meta: AdminSlaComplianceMetaPayload;
}

export function mapAdminSlaComplianceResponse(
  payload: AdminSlaComplianceApiPayload,
): AdminSlaComplianceResponse {
  return {
    data: payload.data.map((point) => ({
      bucketLabel: point.bucket_label,
      bucketDate: point.bucket_date,
      compliancePercent: Number(point.compliance_percent ?? 0),
      deliveredCount: Number(point.delivered_count ?? 0),
      breachedCount: Number(point.breached_count ?? 0),
    })),
    meta: {
      days: payload.meta.days,
      generatedAt: payload.meta.generated_at,
    },
  };
}
