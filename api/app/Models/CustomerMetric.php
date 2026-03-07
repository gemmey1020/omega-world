<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerMetric extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'lifetime_value',
        'order_count',
        'last_order_at',
        'average_order_value',
        'delivery_success_rate',
        'cancellation_rate',
        'risk_flags_json',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_order_at' => 'datetime',
            'risk_flags_json' => 'array',
            'lifetime_value' => 'decimal:2',
            'average_order_value' => 'decimal:2',
            'delivery_success_rate' => 'decimal:2',
            'cancellation_rate' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
