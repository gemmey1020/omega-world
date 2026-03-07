<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Zone extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'coordinates',
        'default_sla_profile_id',
    ];

    public function defaultSlaProfile(): BelongsTo
    {
        return $this->belongsTo(SlaProfile::class, 'default_sla_profile_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function vendors(): HasMany
    {
        return $this->hasMany(Vendor::class);
    }
}
