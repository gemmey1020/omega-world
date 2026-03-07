<?php

namespace App\Services\Dispatch;

use App\Exceptions\DispatchStateException;
use App\Models\DispatchAssignment;
use App\Models\Order;
use App\Models\Provider;
use App\Models\ProviderNotification;
use App\Models\SlaProfile;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class OrderDispatchService
{
    private const MAX_ASSIGNMENT_ATTEMPTS = 3;

    public function __construct(
        private readonly SlaResolver $slaResolver,
        private readonly OrderEventRecorder $eventRecorder,
        private readonly EscalationService $escalationService,
    ) {
    }

    public function assignNewOrder(int $orderId, ?int $actorUserId = null, bool $alreadyInTransaction = false): Order
    {
        $callback = function () use ($orderId, $actorUserId): Order {
            $order = $this->lockOrder($orderId);

            if ($order->status !== Order::STATUS_RECEIVED) {
                throw $this->conflict($order, 'Order is not in the received state.');
            }

            $provider = $this->selectProviderForAttempt($order, collect());

            if ($provider === null) {
                throw $this->conflict($order, 'No eligible provider is available for assignment.');
            }

            $profile = $this->slaResolver->resolveForOrder($order, $provider);
            $this->createPendingAssignment(
                $order,
                $provider,
                $profile,
                1,
                $actorUserId,
                null,
                'system.assign',
                now(),
            );

            return $order->fresh(['latestDispatchAssignment']);
        };

        /** @var Order */
        return $this->runCriticalDispatchTransaction($callback, $alreadyInTransaction);
    }

    public function acceptAssignment(int $assignmentId): Order
    {
        /** @var Order */
        return $this->runCriticalDispatchTransaction(function () use ($assignmentId): Order {
            $assignment = DispatchAssignment::query()->findOrFail($assignmentId);
            $order = $this->lockOrder((int) $assignment->order_id);
            $assignment = $this->lockAssignment($assignmentId);

            if ($order->status !== Order::STATUS_AWAITING_PROVIDER_ACK || $assignment->status !== DispatchAssignment::STATUS_PENDING_ACK) {
                throw $this->conflict($order, 'Assignment can no longer be acknowledged.', $assignment);
            }

            $now = now();

            $assignment->forceFill([
                'status' => DispatchAssignment::STATUS_ACCEPTED,
                'acknowledged_at' => $now,
            ])->save();

            $fromStatus = $order->status;

            $order->forceFill([
                'status' => Order::STATUS_DISPATCHED,
                'acknowledged_at' => $now,
                'escalation_state' => null,
            ])->save();

            $this->escalationService->acknowledgeNotifications($assignment, $now);

            $this->eventRecorder->record(
                $order,
                'order.acknowledged',
                $fromStatus,
                Order::STATUS_DISPATCHED,
                [
                    'assignment_id' => $assignment->id,
                    'ack_latency_seconds' => $this->diffInSeconds($assignment->assigned_at, $now),
                ],
                null,
                $assignment,
                $now,
                'Provider acknowledged the dispatch assignment.',
            );

            return $order->fresh(['latestDispatchAssignment']);
        });
    }

    public function markInTransit(int $orderId, ?int $actorUserId = null): Order
    {
        /** @var Order */
        return $this->runCriticalDispatchTransaction(function () use ($orderId, $actorUserId): Order {
            $order = $this->lockOrder($orderId);

            if ($order->status !== Order::STATUS_DISPATCHED) {
                throw $this->conflict($order, 'Only dispatched orders can be moved to in transit.');
            }

            $assignment = $this->lockLatestAcceptedAssignment($order);
            $now = now();
            $fromStatus = $order->status;

            $order->forceFill([
                'status' => Order::STATUS_IN_TRANSIT,
                'dispatched_at' => $now,
                'in_transit_at' => $now,
            ])->save();

            $this->eventRecorder->record(
                $order,
                'order.dispatched',
                $fromStatus,
                Order::STATUS_IN_TRANSIT,
                [
                    'assignment_id' => $assignment->id,
                    'dispatch_latency_seconds' => $this->diffInSeconds($order->acknowledged_at, $now),
                ],
                $actorUserId,
                $assignment,
                $now,
                'Admin marked the order as in transit.',
            );

            return $order->fresh(['latestDispatchAssignment']);
        });
    }

    public function markDelivered(int $orderId, ?int $actorUserId = null): Order
    {
        /** @var Order */
        return $this->runCriticalDispatchTransaction(function () use ($orderId, $actorUserId): Order {
            $order = $this->lockOrder($orderId);

            if ($order->status !== Order::STATUS_IN_TRANSIT) {
                throw $this->conflict($order, 'Only in-transit orders can be delivered.');
            }

            $assignment = $this->lockLatestAcceptedAssignment($order);
            $now = now();
            $fromStatus = $order->status;

            $order->forceFill([
                'status' => Order::STATUS_DELIVERED,
                'delivered_at' => $now,
            ])->save();

            $assignment->forceFill([
                'status' => DispatchAssignment::STATUS_COMPLETED,
                'completed_at' => $now,
            ])->save();

            $this->eventRecorder->record(
                $order,
                'order.delivered',
                $fromStatus,
                Order::STATUS_DELIVERED,
                [
                    'assignment_id' => $assignment->id,
                    'delivery_latency_seconds' => $this->diffInSeconds($order->dispatched_at, $now),
                    'total_elapsed_seconds' => $this->diffInSeconds($order->received_at, $now),
                ],
                $actorUserId,
                $assignment,
                $now,
                'Admin marked the order as delivered.',
            );

            return $order->fresh(['latestDispatchAssignment']);
        });
    }

    public function processSlaBreachesForOrder(int $orderId, ?Carbon $referenceTime = null): void
    {
        $this->runCriticalDispatchTransaction(function () use ($orderId, $referenceTime): void {
            $order = $this->lockOrder($orderId);
            $referenceTime ??= now();

            if ($order->status === Order::STATUS_AWAITING_PROVIDER_ACK) {
                $assignment = $this->lockPendingAssignment($order);

                if ($assignment !== null) {
                    $this->processPendingAssignment($order, $assignment, $referenceTime);
                }

                return;
            }

            if ($order->status === Order::STATUS_DISPATCHED && $order->sla_dispatch_by !== null && $order->sla_dispatch_by->lt($referenceTime)) {
                $assignment = $this->lockLatestAcceptedAssignment($order, false);
                $this->recordSlaBreach($order, 'dispatch', $order->sla_dispatch_by, $referenceTime, $assignment);

                return;
            }

            if ($order->status === Order::STATUS_IN_TRANSIT && $order->sla_delivery_by !== null && $order->sla_delivery_by->lt($referenceTime)) {
                $assignment = $this->lockLatestAcceptedAssignment($order, false);
                $this->recordSlaBreach($order, 'delivery', $order->sla_delivery_by, $referenceTime, $assignment);
            }
        });
    }

    private function processPendingAssignment(Order $order, DispatchAssignment $assignment, Carbon $referenceTime): void
    {
        if ($assignment->ack_deadline_at === null || ! $assignment->ack_deadline_at->lte($referenceTime)) {
            return;
        }

        $this->recordSlaBreach($order, 'ack', $assignment->ack_deadline_at, $referenceTime, $assignment);

        if ($order->escalation_state === null) {
            $order->forceFill([
                'escalation_state' => Order::ESCALATION_WHATSAPP,
            ])->save();
        }

        $smsAt = $assignment->ack_deadline_at->copy()->addMinutes(5);

        if ($smsAt->lte($referenceTime)) {
            $notification = $this->escalationService->createEscalationNotification(
                $order,
                $assignment,
                ProviderNotification::CHANNEL_SMS,
                2,
                $referenceTime,
            );

            if ($notification !== null) {
                $order->forceFill(['escalation_state' => Order::ESCALATION_SMS])->save();

                $this->eventRecorder->record(
                    $order,
                    'order.escalated',
                    null,
                    null,
                    [
                        'assignment_id' => $assignment->id,
                        'escalation_step' => 2,
                        'channel' => ProviderNotification::CHANNEL_SMS,
                        'sent_at' => $referenceTime->toISOString(),
                    ],
                    null,
                    $assignment,
                    $referenceTime,
                    'Dispatch escalation advanced to SMS.',
                );
            }
        }

        $phoneAt = $assignment->ack_deadline_at->copy()->addMinutes(10);

        if ($phoneAt->lte($referenceTime)) {
            $notification = $this->escalationService->createEscalationNotification(
                $order,
                $assignment,
                ProviderNotification::CHANNEL_PHONE,
                3,
                $referenceTime,
            );

            if ($notification !== null) {
                $order->forceFill(['escalation_state' => Order::ESCALATION_PHONE])->save();

                $this->eventRecorder->record(
                    $order,
                    'order.escalated',
                    null,
                    null,
                    [
                        'assignment_id' => $assignment->id,
                        'escalation_step' => 3,
                        'channel' => ProviderNotification::CHANNEL_PHONE,
                        'sent_at' => $referenceTime->toISOString(),
                    ],
                    null,
                    $assignment,
                    $referenceTime,
                    'Dispatch escalation advanced to phone outreach.',
                );
            }
        }

        $timeoutAt = $assignment->ack_deadline_at->copy()->addMinutes(15);

        if ($timeoutAt->lte($referenceTime)) {
            $this->timeoutAssignment($order, $assignment, $referenceTime);
        }
    }

    private function timeoutAssignment(Order $order, DispatchAssignment $assignment, Carbon $referenceTime): void
    {
        if ($assignment->status !== DispatchAssignment::STATUS_PENDING_ACK) {
            return;
        }

        $assignment->forceFill([
            'status' => DispatchAssignment::STATUS_TIMED_OUT,
            'timed_out_at' => $referenceTime,
        ])->save();

        $this->eventRecorder->record(
            $order,
            'assignment.timed_out',
            null,
            null,
            [
                'assignment_id' => $assignment->id,
                'ack_deadline' => $assignment->ack_deadline_at?->toISOString(),
                'elapsed_seconds' => $this->diffInSeconds($assignment->assigned_at, $referenceTime),
            ],
            null,
            $assignment,
            $referenceTime,
            'Dispatch assignment timed out waiting for provider acknowledgment.',
        );

        if ($assignment->attempt_no >= self::MAX_ASSIGNMENT_ATTEMPTS) {
            $this->moveToManualIntervention($order, $assignment, 'Dispatch attempts exhausted.', $assignment->attempt_no, $referenceTime);

            return;
        }

        $usedProviderIds = DispatchAssignment::query()
            ->where('order_id', $order->id)
            ->pluck('provider_id');

        $provider = $this->selectProviderForAttempt($order, $usedProviderIds);

        if ($provider === null) {
            $this->moveToManualIntervention($order, $assignment, 'No eligible provider is available for reassignment.', $assignment->attempt_no, $referenceTime);

            return;
        }

        $profile = $this->slaResolver->resolveForOrder($order, $provider);

        $this->createPendingAssignment(
            $order,
            $provider,
            $profile,
            $assignment->attempt_no + 1,
            null,
            $assignment,
            'assignment.timed_out',
            $referenceTime,
        );
    }

    private function moveToManualIntervention(
        Order $order,
        DispatchAssignment $assignment,
        string $reason,
        int $attemptCount,
        Carbon $referenceTime,
    ): void {
        $fromStatus = $order->status;
        $lastChannel = $order->escalation_state;

        $order->forceFill([
            'status' => Order::STATUS_MANUAL_INTERVENTION_REQUIRED,
            'needs_manual_intervention' => true,
            'escalation_state' => Order::ESCALATION_MANUAL,
        ])->save();

        $this->eventRecorder->record(
            $order,
            'order.manual_intervention',
            $fromStatus,
            Order::STATUS_MANUAL_INTERVENTION_REQUIRED,
            [
                'reason' => $reason,
                'exhausted_attempts' => $attemptCount,
                'last_channel' => $lastChannel,
            ],
            null,
            $assignment,
            $referenceTime,
            'Order requires manual dispatch intervention.',
        );
    }

    private function recordSlaBreach(
        Order $order,
        string $breachType,
        Carbon $deadline,
        Carbon $referenceTime,
        ?DispatchAssignment $assignment = null,
    ): void {
        $deadlineString = $deadline->toISOString();

        if ($this->eventRecorder->slaBreachExists($order, $breachType, $deadlineString, $assignment)) {
            return;
        }

        $this->eventRecorder->record(
            $order,
            'order.sla_breached',
            null,
            null,
            [
                'breach_type' => $breachType,
                'deadline' => $deadlineString,
                'breached_by_seconds' => $deadline->diffInSeconds($referenceTime),
            ],
            null,
            $assignment,
            $referenceTime,
            'Order exceeded its SLA threshold.',
        );
    }

    private function createPendingAssignment(
        Order $order,
        Provider $provider,
        SlaProfile $profile,
        int $attemptNo,
        ?int $actorUserId,
        ?DispatchAssignment $previousAssignment,
        string $reason,
        Carbon $referenceTime,
    ): DispatchAssignment {
        $ackDeadline = $this->slaResolver->calculateAckDeadline($referenceTime, $profile);
        $fromStatus = $order->status;

        $assignment = DispatchAssignment::query()->create([
            'order_id' => $order->id,
            'provider_id' => $provider->id,
            'status' => DispatchAssignment::STATUS_PENDING_ACK,
            'attempt_no' => $attemptNo,
            'assigned_by_user_id' => $actorUserId,
            'assigned_at' => $referenceTime,
            'ack_deadline_at' => $ackDeadline,
            'metadata_json' => [
                'sla_profile_id' => $profile->id,
            ],
        ]);

        $order->forceFill([
            'provider_id' => $provider->id,
            'status' => Order::STATUS_AWAITING_PROVIDER_ACK,
            'needs_manual_intervention' => false,
            'escalation_state' => null,
            'sla_dispatch_by' => $this->slaResolver->calculateDispatchDeadline($order->received_at ?? $referenceTime, $profile),
            'sla_delivery_by' => $this->slaResolver->calculateDeliveryDeadline($order->received_at ?? $referenceTime, $profile),
        ])->save();

        $this->eventRecorder->record(
            $order,
            'assignment.created',
            null,
            null,
            [
                'assignment_id' => $assignment->id,
                'provider_id' => $provider->id,
                'attempt_no' => $attemptNo,
            ],
            $actorUserId,
            $assignment,
            $referenceTime,
            'Dispatch assignment created.',
        );

        if ($previousAssignment === null) {
            $this->eventRecorder->record(
                $order,
                'order.assigned',
                $fromStatus,
                Order::STATUS_AWAITING_PROVIDER_ACK,
                [
                    'assignment_id' => $assignment->id,
                    'provider_id' => $provider->id,
                    'attempt_no' => $attemptNo,
                    'ack_deadline' => $ackDeadline->toISOString(),
                ],
                $actorUserId,
                $assignment,
                $referenceTime,
                'Order assigned to provider and awaiting acknowledgment.',
            );
        } else {
            $this->eventRecorder->record(
                $order,
                'order.reassigned',
                $fromStatus,
                Order::STATUS_AWAITING_PROVIDER_ACK,
                [
                    'prev_assignment_id' => $previousAssignment->id,
                    'new_assignment_id' => $assignment->id,
                    'new_provider_id' => $provider->id,
                    'reason' => $reason,
                ],
                $actorUserId,
                $assignment,
                $referenceTime,
                'Order reassigned to a provider after timeout.',
            );
        }

        $this->escalationService->createInitialWhatsappNotification($order, $assignment, $referenceTime);

        return $assignment;
    }

    private function selectProviderForAttempt(Order $order, Collection $usedProviderIds): ?Provider
    {
        if ($order->kind === Order::KIND_RETAIL) {
            if ($order->provider_id === null) {
                return null;
            }

            return Provider::query()
                ->whereKey($order->provider_id)
                ->where('status', Provider::STATUS_ACTIVE)
                ->lockForUpdate()
                ->skipLocked()
                ->first();
        }

        return Provider::query()
            ->where('type', Provider::TYPE_SERVICE_PROVIDER)
            ->where('status', Provider::STATUS_ACTIVE)
            ->where('zone_id', $order->zone_id)
            ->when(
                $usedProviderIds->isNotEmpty(),
                fn (Builder $query) => $query->whereNotIn('id', $usedProviderIds->filter()->unique()->values()->all())
            )
            ->orderBy('id')
            ->lockForUpdate()
            ->skipLocked()
            ->first();
    }

    private function lockOrder(int $orderId): Order
    {
        $order = Order::query()
            ->with([
                'provider.slaProfile',
                'zone.defaultSlaProfile',
                'latestDispatchAssignment',
            ])
            ->whereKey($orderId)
            ->lockForUpdate()
            ->skipLocked()
            ->first();

        if ($order !== null) {
            return $order;
        }

        if (Order::query()->whereKey($orderId)->exists()) {
            throw $this->busyConflict('Order is currently being updated by another transaction.', [
                'order_id' => $orderId,
            ]);
        }

        throw (new ModelNotFoundException())->setModel(Order::class, [$orderId]);
    }

    private function lockAssignment(int $assignmentId): DispatchAssignment
    {
        $assignment = DispatchAssignment::query()
            ->whereKey($assignmentId)
            ->lockForUpdate()
            ->skipLocked()
            ->first();

        if ($assignment !== null) {
            return $assignment;
        }

        if (DispatchAssignment::query()->whereKey($assignmentId)->exists()) {
            throw $this->busyConflict('Assignment is currently being updated by another transaction.', [
                'dispatch_assignment_id' => $assignmentId,
            ]);
        }

        throw (new ModelNotFoundException())->setModel(DispatchAssignment::class, [$assignmentId]);
    }

    private function lockPendingAssignment(Order $order): ?DispatchAssignment
    {
        $query = DispatchAssignment::query()
            ->where('order_id', $order->id)
            ->where('status', DispatchAssignment::STATUS_PENDING_ACK)
            ->orderByDesc('attempt_no');

        $assignment = (clone $query)
            ->lockForUpdate()
            ->skipLocked()
            ->first();

        if ($assignment !== null) {
            return $assignment;
        }

        return $query->exists() ? null : null;
    }

    private function lockLatestAcceptedAssignment(Order $order, bool $throwOnMissing = true): ?DispatchAssignment
    {
        $query = DispatchAssignment::query()
            ->where('order_id', $order->id)
            ->whereIn('status', [DispatchAssignment::STATUS_ACCEPTED, DispatchAssignment::STATUS_COMPLETED])
            ->orderByDesc('attempt_no');

        $assignment = (clone $query)
            ->lockForUpdate()
            ->skipLocked()
            ->first();

        if ($assignment !== null) {
            return $assignment;
        }

        if ($query->exists()) {
            if ($throwOnMissing) {
                throw $this->busyConflict('Assignment is currently being updated by another transaction.', [
                    'order_id' => $order->id,
                ]);
            }

            return null;
        }

        if ($assignment === null && $throwOnMissing) {
            throw $this->conflict($order, 'No accepted assignment exists for this order.');
        }

        return $assignment;
    }

    /**
     * @template TReturn
     *
     * @param  Closure(): TReturn  $callback
     * @return TReturn
     */
    private function runCriticalDispatchTransaction(Closure $callback, bool $alreadyInTransaction = false): mixed
    {
        if ($alreadyInTransaction && DB::transactionLevel() > 0) {
            $this->applyCriticalDispatchLockTimeout();

            return $callback();
        }

        return DB::transaction(function () use ($callback): mixed {
            $this->applyCriticalDispatchLockTimeout();

            return $callback();
        });
    }

    private function applyCriticalDispatchLockTimeout(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("SET LOCAL lock_timeout = '500ms'");
    }

    private function diffInSeconds(?Carbon $from, Carbon $to): int
    {
        if ($from === null) {
            return 0;
        }

        return (int) round($from->diffInSeconds($to));
    }

    private function conflict(Order $order, string $message, ?DispatchAssignment $assignment = null): DispatchStateException
    {
        return new DispatchStateException($message, [
            'order_id' => $order->id,
            'order_status' => $order->status,
            'dispatch_assignment_id' => $assignment?->id,
            'assignment_status' => $assignment?->status,
            'attempt_no' => $assignment?->attempt_no,
        ]);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function busyConflict(string $message, array $context = []): DispatchStateException
    {
        return new DispatchStateException($message, array_merge($context, [
            'busy' => true,
            'lock_skipped' => true,
        ]));
    }
}
