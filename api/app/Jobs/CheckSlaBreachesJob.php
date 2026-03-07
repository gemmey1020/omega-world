<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\Dispatch\OrderDispatchService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class CheckSlaBreachesJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $uniqueFor = 55;

    public function uniqueId(): string
    {
        return 'dispatch-sla-breaches';
    }

    public function handle(OrderDispatchService $orderDispatchService): void
    {
        Order::query()
            ->whereIn('status', [
                Order::STATUS_AWAITING_PROVIDER_ACK,
                Order::STATUS_DISPATCHED,
                Order::STATUS_IN_TRANSIT,
            ])
            ->orderBy('id')
            ->chunkById(100, function ($orders) use ($orderDispatchService): void {
                foreach ($orders as $order) {
                    $orderDispatchService->processSlaBreachesForOrder($order->id);
                }
            });
    }
}
