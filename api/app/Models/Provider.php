<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Provider extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPE_MERCHANT = 'merchant';

    public const TYPE_SERVICE_PROVIDER = 'service_provider';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_BLOCKED = 'blocked';

    public const STATUS_PAUSED = 'paused';

    public const STATUS_PENDING_SETUP = 'pending_setup';

    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'type',
        'vendor_id',
        'zone_id',
        'display_name',
        'primary_contact_phone',
        'whatsapp_number',
        'status',
        'capabilities_json',
        'sla_profile_id',
        'escalation_policy_id',
        'metadata_json',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'capabilities_json' => 'array',
            'metadata_json' => 'array',
        ];
    }

    /**
     * @return list<string>
     */
    public static function allowedTypes(): array
    {
        return [
            self::TYPE_MERCHANT,
            self::TYPE_SERVICE_PROVIDER,
        ];
    }

    /**
     * @return list<string>
     */
    public static function allowedStatuses(): array
    {
        return [
            self::STATUS_ACTIVE,
            self::STATUS_BLOCKED,
            self::STATUS_PAUSED,
            self::STATUS_PENDING_SETUP,
            self::STATUS_EXPIRED,
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function slaProfile(): BelongsTo
    {
        return $this->belongsTo(SlaProfile::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function dispatchAssignments(): HasMany
    {
        return $this->hasMany(DispatchAssignment::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(ProviderNotification::class);
    }

    public function analyticsEvents(): HasMany
    {
        return $this->hasMany(AnalyticsEvent::class);
    }
}
