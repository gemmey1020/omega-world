<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderNotification extends Model
{
    use HasFactory;

    public const CHANNEL_WHATSAPP = 'whatsapp';

    public const CHANNEL_SMS = 'sms';

    public const CHANNEL_PHONE = 'phone';

    public const STATUS_SENT = 'sent';

    public const STATUS_FAILED = 'failed';

    public const STATUS_ACKNOWLEDGED = 'acknowledged';

    protected $fillable = [
        'order_id',
        'provider_id',
        'dispatch_assignment_id',
        'channel',
        'attempt_no',
        'status',
        'sent_at',
        'acknowledged_at',
        'failed_at',
        'external_reference',
        'payload_hash',
        'response_payload',
        'metadata_json',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'acknowledged_at' => 'datetime',
            'failed_at' => 'datetime',
            'response_payload' => 'array',
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

    public function dispatchAssignment(): BelongsTo
    {
        return $this->belongsTo(DispatchAssignment::class);
    }
}
