<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    public const KIND_RETAIL = 'retail';

    public const KIND_SERVICE = 'service';

    public const STATUS_RECEIVED = 'received';

    public const STATUS_AWAITING_PROVIDER_ACK = 'awaiting_provider_ack';

    public const STATUS_DISPATCHED = 'dispatched';

    public const STATUS_IN_TRANSIT = 'in_transit';

    public const STATUS_DELIVERED = 'delivered';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_FAILED = 'failed';

    public const STATUS_MANUAL_INTERVENTION_REQUIRED = 'manual_intervention_required';

    protected $fillable = [
        'order_number',
        'kind',
        'source_channel',
        'customer_user_id',
        'zone_id',
        'provider_id',
        'vendor_id',
        'status',
        'received_at',
        'acknowledged_at',
        'dispatched_at',
        'in_transit_at',
        'delivered_at',
        'cancelled_at',
        'total_amount',
        'currency',
        'sla_dispatch_by',
        'sla_delivery_by',
        'needs_manual_intervention',
        'escalation_state',
        'metadata_json',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'acknowledged_at' => 'datetime',
            'dispatched_at' => 'datetime',
            'in_transit_at' => 'datetime',
            'delivered_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'sla_dispatch_by' => 'datetime',
            'sla_delivery_by' => 'datetime',
            'needs_manual_intervention' => 'boolean',
            'metadata_json' => 'array',
            'total_amount' => 'decimal:2',
        ];
    }

    /**
     * @return list<string>
     */
    public static function allowedKinds(): array
    {
        return [
            self::KIND_RETAIL,
            self::KIND_SERVICE,
        ];
    }

    /**
     * @return list<string>
     */
    public static function allowedStatuses(): array
    {
        return [
            self::STATUS_RECEIVED,
            self::STATUS_AWAITING_PROVIDER_ACK,
            self::STATUS_DISPATCHED,
            self::STATUS_IN_TRANSIT,
            self::STATUS_DELIVERED,
            self::STATUS_CANCELLED,
            self::STATUS_FAILED,
            self::STATUS_MANUAL_INTERVENTION_REQUIRED,
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function dispatchAssignments(): HasMany
    {
        return $this->hasMany(DispatchAssignment::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(ProviderNotification::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class);
    }

    public function analyticsEvents(): HasMany
    {
        return $this->hasMany(AnalyticsEvent::class);
    }
}
