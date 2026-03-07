<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DispatchAssignment extends Model
{
    use HasFactory;

    public const STATUS_PENDING_ACK = 'pending_ack';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_TIMED_OUT = 'timed_out';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'order_id',
        'provider_id',
        'status',
        'attempt_no',
        'assigned_by_user_id',
        'assigned_at',
        'acknowledged_at',
        'rejected_at',
        'timed_out_at',
        'completed_at',
        'notes',
        'metadata_json',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'acknowledged_at' => 'datetime',
            'rejected_at' => 'datetime',
            'timed_out_at' => 'datetime',
            'completed_at' => 'datetime',
            'metadata_json' => 'array',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_user_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(ProviderNotification::class);
    }

    public function orderEvents(): HasMany
    {
        return $this->hasMany(OrderEvent::class);
    }
}
