<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1");

        DB::statement(<<<'SQL'
            SELECT setval(
                'order_number_seq',
                COALESCE(
                    (
                        SELECT MAX(split_part(order_number, '-', 3)::bigint) + 1
                        FROM orders
                        WHERE order_number ~ '^ORD-[0-9]{8}-[0-9]+$'
                    ),
                    1
                ),
                false
            )
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP SEQUENCE IF EXISTS order_number_seq');
    }
};
