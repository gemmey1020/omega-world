<?php

namespace App\Services\Dispatch;

use App\Models\DispatchAssignment;
use App\Models\Order;
use App\Models\OrderEvent;
use Illuminate\Support\Carbon;

class OrderEventRecorder
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function record(
        Order $order,
        string $eventType,
        ?string $fromStatus,
        ?string $toStatus,
        array $metadata,
        ?int $actorUserId = null,
        ?DispatchAssignment $assignment = null,
        ?Carbon $happenedAt = null,
        ?string $notes = null,
    ): OrderEvent {
        return OrderEvent::query()->create([
            'order_id' => $order->id,
            'actor_user_id' => $actorUserId,
            'dispatch_assignment_id' => $assignment?->id,
            'event_type' => $eventType,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'happened_at' => $happenedAt ?? now(),
            'notes' => $notes,
            'metadata_json' => $metadata,
        ]);
    }

    public function slaBreachExists(
        Order $order,
        string $breachType,
        string $deadline,
        ?DispatchAssignment $assignment = null,
    ): bool {
        $events = OrderEvent::query()
            ->where('order_id', $order->id)
            ->where('event_type', 'order.sla_breached')
            ->when(
                $assignment !== null,
                fn ($query) => $query->where('dispatch_assignment_id', $assignment->id),
                fn ($query) => $query->whereNull('dispatch_assignment_id')
            )
            ->get(['id', 'metadata_json']);

        foreach ($events as $event) {
            $metadata = is_array($event->metadata_json) ? $event->metadata_json : [];

            if (($metadata['breach_type'] ?? null) === $breachType && ($metadata['deadline'] ?? null) === $deadline) {
                return true;
            }
        }

        return false;
    }
}
