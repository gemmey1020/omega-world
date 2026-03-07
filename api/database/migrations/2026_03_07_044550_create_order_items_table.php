<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('item_type');
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('snapshot_external_id')->nullable();
            $table->string('snapshot_title');
            $table->string('snapshot_sku')->nullable();
            $table->string('snapshot_category_name')->nullable();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('total_price', 12, 2);
            $table->jsonb('metadata_json')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'item_type']);
            $table->index('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
