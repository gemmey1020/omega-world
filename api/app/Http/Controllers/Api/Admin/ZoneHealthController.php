<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DispatchAssignment;
use App\Models\Order;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ZoneHealthController extends Controller
{
    public function index(): JsonResponse
    {
        $metricsByZone = $this->loadZoneMetrics();

        $zones = Zone::query()
            ->select(['zones.id', 'zones.name'])
            ->selectRaw('ST_AsGeoJSON(zones.coordinates) as coordinates_geojson')
            ->whereNull('zones.deleted_at')
            ->orderBy('zones.name')
            ->get();

        return response()->json([
            'data' => $zones->map(function (Zone $zone) use ($metricsByZone): array {
                $metrics = $metricsByZone[$zone->id] ?? [
                    'active_orders' => 0,
                    'manual_intervention_count' => 0,
                    'breach_count' => 0,
                    'avg_delivery_minutes' => null,
                    'delivered_window_count' => 0,
                    'on_time_delivery_count' => 0,
                ];

                $slaCompliancePercent = null;

                if ((int) $metrics['delivered_window_count'] > 0) {
                    $slaCompliancePercent = round(
                        ((int) $metrics['on_time_delivery_count'] / (int) $metrics['delivered_window_count']) * 100,
                        2
                    );
                }

                return [
                    'id' => $zone->id,
                    'name' => $zone->name,
                    'coordinates' => $zone->coordinates_geojson !== null ? json_decode((string) $zone->coordinates_geojson, true) : null,
                    'active_orders' => (int) $metrics['active_orders'],
                    'manual_intervention_count' => (int) $metrics['manual_intervention_count'],
                    'breach_count' => (int) $metrics['breach_count'],
                    'avg_delivery_minutes' => $metrics['avg_delivery_minutes'] !== null ? (float) $metrics['avg_delivery_minutes'] : null,
                    'sla_compliance_percent' => $slaCompliancePercent,
                    'status' => $this->resolveZoneStatus(
                        (int) $metrics['manual_intervention_count'],
                        (int) $metrics['breach_count'],
                        $slaCompliancePercent
                    ),
                ];
            })->values()->all(),
        ]);
    }

    /**
     * @return array<int, array<string, int|float|null>>
     */
    private function loadZoneMetrics(): array
    {
        $now = now();
        $last24Hours = now()->subDay();
        $activeStatusesSql = $this->quoteStringList([
            Order::STATUS_RECEIVED,
            Order::STATUS_AWAITING_PROVIDER_ACK,
            Order::STATUS_DISPATCHED,
            Order::STATUS_IN_TRANSIT,
            Order::STATUS_MANUAL_INTERVENTION_REQUIRED,
        ]);

        $latestAssignmentsSubquery = DB::table('dispatch_assignments')
            ->select('dispatch_assignments.order_id')
            ->selectRaw('MAX(dispatch_assignments.attempt_no) as latest_attempt_no')
            ->groupBy('dispatch_assignments.order_id');

        $rows = DB::table('orders')
            ->leftJoinSub($latestAssignmentsSubquery, 'latest_assignment_refs', function ($join): void {
                $join->on('latest_assignment_refs.order_id', '=', 'orders.id');
            })
            ->leftJoin('dispatch_assignments as latest_assignments', function ($join): void {
                $join
                    ->on('latest_assignments.order_id', '=', 'latest_assignment_refs.order_id')
                    ->on('latest_assignments.attempt_no', '=', 'latest_assignment_refs.latest_attempt_no');
            })
            ->select('orders.zone_id')
            ->selectRaw("SUM(CASE WHEN orders.status IN ({$activeStatusesSql}) THEN 1 ELSE 0 END) as active_orders")
            ->selectRaw(
                "SUM(CASE WHEN orders.status = ? OR orders.needs_manual_intervention = TRUE THEN 1 ELSE 0 END) as manual_intervention_count",
                [Order::STATUS_MANUAL_INTERVENTION_REQUIRED]
            )
            ->selectRaw(
                "SUM(CASE
                    WHEN orders.status = ? OR orders.needs_manual_intervention = TRUE THEN 1
                    WHEN orders.status = ? AND latest_assignments.ack_deadline_at IS NOT NULL AND latest_assignments.ack_deadline_at < ? THEN 1
                    WHEN orders.status IN (?, ?) AND orders.sla_dispatch_by IS NOT NULL AND orders.sla_dispatch_by < ? THEN 1
                    WHEN orders.status = ? AND orders.sla_delivery_by IS NOT NULL AND orders.sla_delivery_by < ? THEN 1
                    ELSE 0
                END) as breach_count",
                [
                    Order::STATUS_MANUAL_INTERVENTION_REQUIRED,
                    Order::STATUS_AWAITING_PROVIDER_ACK,
                    $now,
                    Order::STATUS_RECEIVED,
                    Order::STATUS_DISPATCHED,
                    $now,
                    Order::STATUS_IN_TRANSIT,
                    $now,
                ]
            )
            ->selectRaw(
                sprintf(
                    'ROUND(AVG(CASE
                        WHEN orders.status = ? AND orders.delivered_at IS NOT NULL AND orders.received_at IS NOT NULL AND orders.delivered_at >= ?
                        THEN %s
                        ELSE NULL
                    END), 2) as avg_delivery_minutes',
                    $this->deliveryDurationMinutesExpression()
                ),
                [Order::STATUS_DELIVERED, $last24Hours]
            )
            ->selectRaw(
                'SUM(CASE WHEN orders.status = ? AND orders.delivered_at IS NOT NULL AND orders.delivered_at >= ? THEN 1 ELSE 0 END) as delivered_window_count',
                [Order::STATUS_DELIVERED, $last24Hours]
            )
            ->selectRaw(
                'SUM(CASE
                    WHEN orders.status = ? AND orders.delivered_at IS NOT NULL AND orders.delivered_at >= ? AND orders.sla_delivery_by IS NOT NULL AND orders.delivered_at <= orders.sla_delivery_by
                    THEN 1
                    ELSE 0
                END) as on_time_delivery_count',
                [Order::STATUS_DELIVERED, $last24Hours]
            )
            ->whereNotNull('orders.zone_id')
            ->groupBy('orders.zone_id')
            ->get();

        $metrics = [];

        foreach ($rows as $row) {
            $metrics[(int) $row->zone_id] = [
                'active_orders' => $this->numericValue($row->active_orders),
                'manual_intervention_count' => $this->numericValue($row->manual_intervention_count),
                'breach_count' => $this->numericValue($row->breach_count),
                'avg_delivery_minutes' => $row->avg_delivery_minutes !== null ? (float) $row->avg_delivery_minutes : null,
                'delivered_window_count' => $this->numericValue($row->delivered_window_count),
                'on_time_delivery_count' => $this->numericValue($row->on_time_delivery_count),
            ];
        }

        return $metrics;
    }

    private function resolveZoneStatus(int $manualInterventionCount, int $breachCount, ?float $slaCompliancePercent): string
    {
        if ($manualInterventionCount > 0 || $breachCount >= 5 || ($slaCompliancePercent !== null && $slaCompliancePercent < 85)) {
            return 'critical';
        }

        if ($breachCount > 0 || ($slaCompliancePercent !== null && $slaCompliancePercent < 95)) {
            return 'degraded';
        }

        return 'healthy';
    }

    private function deliveryDurationMinutesExpression(): string
    {
        return match (DB::getDriverName()) {
            'pgsql' => 'EXTRACT(EPOCH FROM (orders.delivered_at - orders.received_at)) / 60.0',
            'sqlite' => "(strftime('%s', orders.delivered_at) - strftime('%s', orders.received_at)) / 60.0",
            default => 'TIMESTAMPDIFF(MINUTE, orders.received_at, orders.delivered_at)',
        };
    }

    /**
     * @param  list<string>  $values
     */
    private function quoteStringList(array $values): string
    {
        return implode(', ', array_map(
            static fn (string $value): string => "'".str_replace("'", "''", $value)."'",
            $values
        ));
    }

    private function numericValue(mixed $value): int
    {
        if (is_numeric($value)) {
            return (int) $value;
        }

        return 0;
    }
}
