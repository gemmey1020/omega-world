<?php

namespace App\Jobs;

use App\Models\DispatchAssignment;
use App\Models\Order;
use App\Services\Dispatch\OrderDispatchService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class CheckSlaBreachesJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    /**
     * @var list<string>
     */
    private const TERMINAL_STATUSES = [
        Order::STATUS_DELIVERED,
        Order::STATUS_CANCELLED,
        Order::STATUS_FAILED,
        Order::STATUS_MANUAL_INTERVENTION_REQUIRED,
    ];

    public int $uniqueFor = 55;

    public function uniqueId(): string
    {
        return 'dispatch-sla-breaches';
    }

    public function handle(OrderDispatchService $orderDispatchService): void
    {
        $referenceTime = now();

        DispatchAssignment::query()
            ->select('order_id')
            ->where('status', DispatchAssignment::STATUS_PENDING_ACK)
            ->whereNotNull('ack_deadline_at')
            ->where('ack_deadline_at', '<=', $referenceTime)
            ->orderBy('order_id')
            ->chunkById(100, function ($assignments) use ($orderDispatchService, $referenceTime): void {
                foreach ($assignments as $assignment) {
                    $orderId = (int) $assignment->order_id;

                    if (! $this->orderShouldBeProcessed($orderId, [Order::STATUS_AWAITING_PROVIDER_ACK])) {
                        continue;
                    }

                    $orderDispatchService->processSlaBreachesForOrder($orderId, $referenceTime);
                }
            }, 'order_id');

        Order::query()
            ->select('id')
            ->where('status', Order::STATUS_DISPATCHED)
            ->whereNotNull('sla_dispatch_by')
            ->where('sla_dispatch_by', '<=', $referenceTime)
            ->orderBy('id')
            ->chunkById(100, function ($orders) use ($orderDispatchService, $referenceTime): void {
                foreach ($orders as $order) {
                    $orderId = (int) $order->id;

                    if (! $this->orderShouldBeProcessed($orderId, [Order::STATUS_DISPATCHED])) {
                        continue;
                    }

                    $orderDispatchService->processSlaBreachesForOrder($orderId, $referenceTime);
                }
            });

        Order::query()
            ->select('id')
            ->where('status', Order::STATUS_IN_TRANSIT)
            ->whereNotNull('sla_delivery_by')
            ->where('sla_delivery_by', '<=', $referenceTime)
            ->orderBy('id')
            ->chunkById(100, function ($orders) use ($orderDispatchService, $referenceTime): void {
                foreach ($orders as $order) {
                    $orderId = (int) $order->id;

                    if (! $this->orderShouldBeProcessed($orderId, [Order::STATUS_IN_TRANSIT])) {
                        continue;
                    }

                    $orderDispatchService->processSlaBreachesForOrder($orderId, $referenceTime);
                }
            });
    }

    /**
     * @param  list<string>  $allowedStatuses
     */
    private function orderShouldBeProcessed(int $orderId, array $allowedStatuses): bool
    {
        return Order::query()
            ->whereKey($orderId)
            ->whereNotIn('status', self::TERMINAL_STATUSES)
            ->whereIn('status', $allowedStatuses)
            ->exists();
    }
}
