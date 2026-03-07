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
        Schema::create('provider_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $table->foreignId('dispatch_assignment_id')->nullable()->constrained('dispatch_assignments')->nullOnDelete();
            $table->string('channel');
            $table->unsignedSmallInteger('attempt_no')->default(1);
            $table->string('status');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->string('external_reference')->nullable();
            $table->string('payload_hash')->nullable();
            $table->jsonb('response_payload')->nullable();
            $table->jsonb('metadata_json')->nullable();
            $table->timestamps();

            $table->unique(['order_id', 'provider_id', 'channel', 'attempt_no'], 'provider_notifications_dedupe_unique');
            $table->index(['provider_id', 'status']);
            $table->index(['order_id', 'channel']);
            $table->index('payload_hash');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('provider_notifications');
    }
};
