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
        Schema::create('customer_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('lifetime_value', 12, 2)->default(0);
            $table->unsignedInteger('order_count')->default(0);
            $table->timestamp('last_order_at')->nullable();
            $table->decimal('average_order_value', 12, 2)->default(0);
            $table->decimal('delivery_success_rate', 5, 2)->default(0);
            $table->decimal('cancellation_rate', 5, 2)->default(0);
            $table->jsonb('risk_flags_json')->nullable();
            $table->timestamps();

            $table->unique('user_id');
            $table->index(['order_count', 'last_order_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_metrics');
    }
};
