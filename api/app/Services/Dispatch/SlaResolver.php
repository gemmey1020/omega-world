<?php

namespace App\Services\Dispatch;

use App\Models\Order;
use App\Models\Provider;
use App\Models\SlaProfile;
use Illuminate\Support\Carbon;
use RuntimeException;

class SlaResolver
{
    public function resolveForOrder(Order $order, ?Provider $provider = null): SlaProfile
    {
        $provider ??= $order->provider;

        if ($provider !== null) {
            $provider->loadMissing('slaProfile');

            if ($provider->slaProfile !== null) {
                return $provider->slaProfile;
            }
        }

        $order->loadMissing('zone.defaultSlaProfile');

        if ($order->zone?->defaultSlaProfile !== null) {
            return $order->zone->defaultSlaProfile;
        }

        return $this->resolveDefaultForKind($order->kind);
    }

    public function resolveDefaultForKind(string $orderKind): SlaProfile
    {
        $type = match ($orderKind) {
            Order::KIND_RETAIL => SlaProfile::TYPE_RETAIL,
            Order::KIND_SERVICE => SlaProfile::TYPE_SERVICE,
            default => throw new RuntimeException("Unsupported order kind [{$orderKind}] for SLA resolution."),
        };

        return SlaProfile::query()
            ->where('type', $type)
            ->orderBy('id')
            ->firstOrFail();
    }

    public function calculateAckDeadline(Carbon $assignedAt, SlaProfile $profile): Carbon
    {
        return $assignedAt->copy()->addMinutes((int) $profile->time_to_ack_minutes);
    }

    public function calculateDispatchDeadline(Carbon $receivedAt, SlaProfile $profile): Carbon
    {
        return $receivedAt->copy()
            ->addMinutes((int) $profile->time_to_ack_minutes)
            ->addMinutes((int) $profile->time_to_dispatch_minutes);
    }

    public function calculateDeliveryDeadline(Carbon $receivedAt, SlaProfile $profile): Carbon
    {
        return $receivedAt->copy()
            ->addMinutes((int) $profile->time_to_ack_minutes)
            ->addMinutes((int) $profile->time_to_dispatch_minutes)
            ->addMinutes((int) $profile->time_to_deliver_minutes);
    }
}
