<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('dispatch_assignments', function (Blueprint $table) {
            $table->timestamp('ack_deadline_at')->nullable()->after('assigned_at');
            $table->index(['status', 'ack_deadline_at']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement(
                "CREATE UNIQUE INDEX dispatch_assignments_pending_ack_unique
                ON dispatch_assignments (order_id)
                WHERE status = 'pending_ack'"
            );
        }

        Schema::table('order_events', function (Blueprint $table) {
            $table->index(['order_id', 'event_type', 'dispatch_assignment_id'], 'order_events_order_event_assignment_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_events', function (Blueprint $table) {
            $table->dropIndex('order_events_order_event_assignment_idx');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS dispatch_assignments_pending_ack_unique');
        }

        Schema::table('dispatch_assignments', function (Blueprint $table) {
            $table->dropIndex(['status', 'ack_deadline_at']);
            $table->dropColumn('ack_deadline_at');
        });
    }
};
