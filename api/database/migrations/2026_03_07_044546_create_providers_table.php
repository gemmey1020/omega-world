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
        Schema::create('providers', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('zones')->nullOnDelete();
            $table->string('display_name');
            $table->string('primary_contact_phone')->nullable();
            $table->string('whatsapp_number')->nullable();
            $table->string('status');
            $table->geometry('coordinates', 'point', 4326)->nullable();
            $table->jsonb('capabilities_json')->nullable();
            $table->unsignedBigInteger('sla_profile_id')->nullable();
            $table->unsignedBigInteger('escalation_policy_id')->nullable();
            $table->jsonb('metadata_json')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->unique('vendor_id');
            $table->index(['type', 'status']);
            $table->index(['zone_id', 'status']);
            $table->index('sla_profile_id');
            $table->index('escalation_policy_id');
            $table->spatialIndex('coordinates');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('providers');
    }
};
