<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SlaComplianceReportRequest;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function slaCompliance(SlaComplianceReportRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $days = (int) ($validated['days'] ?? 7);
        $timezone = (string) config('app.timezone', 'UTC');
        $startDate = now()->timezone($timezone)->startOfDay()->subDays($days - 1);
        $endDate = now()->timezone($timezone)->endOfDay();

        $bucketExpression = match (DB::getDriverName()) {
            'pgsql' => "DATE(timezone('{$timezone}', delivered_at))",
            'sqlite' => "DATE(delivered_at)",
            default => 'DATE(delivered_at)',
        };

        $rows = Order::query()
            ->selectRaw("{$bucketExpression} as bucket_date")
            ->selectRaw('COUNT(*) as delivered_count')
            ->selectRaw(
                'SUM(CASE WHEN sla_delivery_by IS NOT NULL AND delivered_at <= sla_delivery_by THEN 1 ELSE 0 END) as on_time_count'
            )
            ->where('status', Order::STATUS_DELIVERED)
            ->whereNotNull('delivered_at')
            ->whereBetween('delivered_at', [$startDate->clone()->timezone('UTC'), $endDate->clone()->timezone('UTC')])
            ->groupByRaw($bucketExpression)
            ->orderByRaw("{$bucketExpression} ASC")
            ->get()
            ->keyBy('bucket_date');

        $data = [];

        for ($offset = 0; $offset < $days; $offset++) {
            $date = $startDate->copy()->addDays($offset);
            $bucketDate = $date->toDateString();
            $row = $rows->get($bucketDate);
            $deliveredCount = $row !== null && is_numeric($row->delivered_count) ? (int) $row->delivered_count : 0;
            $onTimeCount = $row !== null && is_numeric($row->on_time_count) ? (int) $row->on_time_count : 0;
            $breachedCount = max($deliveredCount - $onTimeCount, 0);

            $data[] = [
                'bucket_label' => $date->format('D'),
                'bucket_date' => $bucketDate,
                'compliance_percent' => $deliveredCount > 0
                    ? round(($onTimeCount / $deliveredCount) * 100, 2)
                    : 0.0,
                'delivered_count' => $deliveredCount,
                'breached_count' => $breachedCount,
            ];
        }

        return response()->json([
            'data' => $data,
            'meta' => [
                'days' => $days,
                'generated_at' => Carbon::now()->toISOString(),
            ],
        ]);
    }
}
