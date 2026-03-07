<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    public const ITEM_TYPE_PRODUCT = 'product';

    public const ITEM_TYPE_SERVICE_TASK = 'service_task';

    protected $fillable = [
        'order_id',
        'item_type',
        'product_id',
        'snapshot_external_id',
        'snapshot_title',
        'snapshot_sku',
        'snapshot_category_name',
        'quantity',
        'unit_price',
        'total_price',
        'metadata_json',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata_json' => 'array',
            'unit_price' => 'decimal:2',
            'total_price' => 'decimal:2',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
