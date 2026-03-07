<?php

namespace App\Services\Dispatch;

use App\Models\DispatchAssignment;
use App\Models\Order;
use App\Models\ProviderNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;

class EscalationService
{
    public function createInitialWhatsappNotification(
        Order $order,
        DispatchAssignment $assignment,
        Carbon $sentAt,
    ): ProviderNotification {
        return $this->storeNotification(
            $order,
            $assignment,
            ProviderNotification::CHANNEL_WHATSAPP,
            $sentAt,
            [
                'accept_url' => $this->buildAcceptUrl($assignment),
                'escalation_step' => 0,
            ],
        );
    }

    public function createEscalationNotification(
        Order $order,
        DispatchAssignment $assignment,
        string $channel,
        int $step,
        Carbon $sentAt,
    ): ?ProviderNotification {
        $existing = ProviderNotification::query()
            ->where('order_id', $order->id)
            ->where('provider_id', $assignment->provider_id)
            ->where('channel', $channel)
            ->where('attempt_no', $assignment->attempt_no)
            ->first();

        if ($existing !== null) {
            return null;
        }

        return $this->storeNotification(
            $order,
            $assignment,
            $channel,
            $sentAt,
            [
                'accept_url' => $this->buildAcceptUrl($assignment),
                'escalation_step' => $step,
            ],
        );
    }

    public function acknowledgeNotifications(DispatchAssignment $assignment, Carbon $acknowledgedAt): void
    {
        ProviderNotification::query()
            ->where('dispatch_assignment_id', $assignment->id)
            ->whereNull('acknowledged_at')
            ->update([
                'status' => ProviderNotification::STATUS_ACKNOWLEDGED,
                'acknowledged_at' => $acknowledgedAt,
            ]);
    }

    public function buildAcceptUrl(DispatchAssignment $assignment): string
    {
        $expiresAt = $assignment->ack_deadline_at?->copy()->addMinutes(15) ?? now()->addMinutes(15);

        return URL::temporarySignedRoute(
            'provider.assignments.accept',
            $expiresAt,
            ['assignment' => $assignment->id]
        );
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function storeNotification(
        Order $order,
        DispatchAssignment $assignment,
        string $channel,
        Carbon $sentAt,
        array $metadata,
    ): ProviderNotification {
        $payloadHash = hash('sha256', json_encode([
            'order_id' => $order->id,
            'provider_id' => $assignment->provider_id,
            'assignment_id' => $assignment->id,
            'channel' => $channel,
            'attempt_no' => $assignment->attempt_no,
            'metadata' => $metadata,
        ], JSON_THROW_ON_ERROR));

        $notification = ProviderNotification::query()->create([
            'order_id' => $order->id,
            'provider_id' => $assignment->provider_id,
            'dispatch_assignment_id' => $assignment->id,
            'channel' => $channel,
            'attempt_no' => $assignment->attempt_no,
            'status' => ProviderNotification::STATUS_SENT,
            'sent_at' => $sentAt,
            'payload_hash' => $payloadHash,
            'metadata_json' => $metadata,
        ]);

        DB::afterCommit(function () use ($order, $assignment, $channel): void {
            Log::info('Dispatch notification queued for provider delivery.', [
                'order_id' => $order->id,
                'dispatch_assignment_id' => $assignment->id,
                'provider_id' => $assignment->provider_id,
                'channel' => $channel,
                'attempt_no' => $assignment->attempt_no,
            ]);
        });

        return $notification;
    }
}
