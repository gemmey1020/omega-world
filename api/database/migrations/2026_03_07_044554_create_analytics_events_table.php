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
        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignId('provider_id')->nullable()->constrained('providers')->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('zones')->nullOnDelete();
            $table->string('event_type');
            $table->string('event_name')->nullable();
            $table->text('search_query')->nullable();
            $table->string('session_key')->nullable();
            $table->string('device_hash')->nullable();
            $table->timestamp('occurred_at')->nullable();
            $table->jsonb('payload_json')->nullable();
            $table->timestamps();

            $table->index(['event_type', 'occurred_at']);
            $table->index(['vendor_id', 'event_type']);
            $table->index(['provider_id', 'event_type']);
            $table->index(['order_id', 'event_type']);
            $table->index('zone_id');
            $table->index('device_hash');
        });

        DB::table('vendor_analytics')
            ->orderBy('id')
            ->chunkById(500, function ($events): void {
                $vendorIds = collect($events)
                    ->pluck('vendor_id')
                    ->filter()
                    ->unique()
                    ->values();

                $vendorZoneMap = DB::table('vendors')
                    ->whereIn('id', $vendorIds)
                    ->pluck('zone_id', 'id');

                $payload = [];

                foreach ($events as $event) {
                    $occurredAt = $event->created_at ?? now();

                    $payload[] = [
                        'user_id' => $event->user_id,
                        'vendor_id' => $event->vendor_id,
                        'provider_id' => null,
                        'order_id' => null,
                        'zone_id' => $vendorZoneMap[$event->vendor_id] ?? null,
                        'event_type' => (string) $event->event_type,
                        'event_name' => (string) $event->event_type,
                        'search_query' => $event->search_query,
                        'session_key' => null,
                        'device_hash' => null,
                        'occurred_at' => $occurredAt,
                        'payload_json' => json_encode([
                            'source' => 'vendor_analytics_backfill',
                            'legacy_vendor_analytics_id' => $event->id,
                        ], JSON_THROW_ON_ERROR),
                        'created_at' => $event->created_at ?? now(),
                        'updated_at' => $event->updated_at ?? $occurredAt,
                    ];
                }

                if ($payload !== []) {
                    DB::table('analytics_events')->insert($payload);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
    }
};
