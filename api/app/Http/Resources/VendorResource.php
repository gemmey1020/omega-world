<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $subscription = $this->subscription;
        $isCheckoutAvailable = false;

        if ($subscription !== null) {
            $expiresAt = $subscription->expires_at;
            $isNotExpired = $expiresAt === null || $expiresAt->isFuture();
            $isCheckoutAvailable = $this->is_active && $subscription->status === 'active' && $isNotExpired;
        }

        return [
            'id' => $this->id,
            'zone_id' => $this->zone_id,
            'name' => $this->name,
            'primary_category' => $this->primary_category,
            'whatsapp_number' => (string) $this->whatsapp_number,
            'coordinates' => json_decode((string) $this->coordinates_geojson, true),
            'is_active' => (bool) $this->is_active,
            'subscription' => [
                'status' => $subscription?->status,
                'reason' => $subscription?->reason,
                'expires_at' => $subscription?->expires_at?->toISOString(),
            ],
            'is_checkout_available' => $isCheckoutAvailable,
        ];
    }
}
