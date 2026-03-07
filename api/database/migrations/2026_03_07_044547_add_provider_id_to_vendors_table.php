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
        Schema::table('vendors', function (Blueprint $table) {
            $table->foreignId('provider_id')
                ->nullable()
                ->after('zone_id')
                ->constrained('providers')
                ->nullOnDelete();

            $table->unique('provider_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->dropUnique(['provider_id']);
            $table->dropConstrainedForeignId('provider_id');
        });
    }
};
