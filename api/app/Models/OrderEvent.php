<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'actor_user_id',
        'dispatch_assignment_id',
        'event_type',
        'from_status',
        'to_status',
        'happened_at',
        'notes',
        'metadata_json',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'happened_at' => 'datetime',
            'metadata_json' => 'array',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function actorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    public function dispatchAssignment(): BelongsTo
    {
        return $this->belongsTo(DispatchAssignment::class);
    }
}
