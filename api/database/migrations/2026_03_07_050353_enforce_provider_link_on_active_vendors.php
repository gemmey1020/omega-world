<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_active_provider_link_check');
        DB::statement('ALTER TABLE vendors ADD CONSTRAINT vendors_active_provider_link_check CHECK (is_active = FALSE OR provider_id IS NOT NULL)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_active_provider_link_check');
    }
};
