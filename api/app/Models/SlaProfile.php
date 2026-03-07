<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SlaProfile extends Model
{
    use HasFactory;

    public const TYPE_RETAIL = 'retail';

    public const TYPE_SERVICE = 'service';

    protected $fillable = [
        'name',
        'type',
        'time_to_ack_minutes',
        'time_to_dispatch_minutes',
        'time_to_deliver_minutes',
        'metadata_json',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata_json' => 'array',
        ];
    }

    /**
     * @return list<string>
     */
    public static function allowedTypes(): array
    {
        return [
            self::TYPE_RETAIL,
            self::TYPE_SERVICE,
        ];
    }

    public function providers(): HasMany
    {
        return $this->hasMany(Provider::class);
    }
}
