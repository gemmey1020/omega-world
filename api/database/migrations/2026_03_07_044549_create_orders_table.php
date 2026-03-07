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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->string('kind');
            $table->string('source_channel');
            $table->foreignId('customer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('zones')->nullOnDelete();
            $table->foreignId('provider_id')->nullable()->constrained('providers')->nullOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->string('status');
            $table->timestamp('received_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('in_transit_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->char('currency', 3)->default('EGP');
            $table->geometry('delivery_point', 'point', 4326)->nullable();
            $table->timestamp('sla_dispatch_by')->nullable();
            $table->timestamp('sla_delivery_by')->nullable();
            $table->boolean('needs_manual_intervention')->default(false);
            $table->string('escalation_state')->nullable();
            $table->jsonb('metadata_json')->nullable();
            $table->timestamps();

            $table->index(['status', 'received_at']);
            $table->index(['provider_id', 'status']);
            $table->index(['zone_id', 'status']);
            $table->index('customer_user_id');
            $table->spatialIndex('delivery_point');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
