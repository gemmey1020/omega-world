<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement(
            "CREATE INDEX IF NOT EXISTS idx_orders_active_breach_check
            ON orders (sla_dispatch_by)
            WHERE status IN ('received', 'awaiting_provider_ack', 'dispatched', 'in_transit')"
        );
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS idx_orders_active_breach_check');
    }
};
