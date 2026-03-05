<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $now = now();
            $expiresAt = now()->addDays(30);

            $allowedReasonCodes = [
                'SUBSCRIPTION_EXPIRED',
                'ADMIN_BLOCK',
                'PENDING_SETUP',
                'MANUAL_PAUSE',
                'INITIAL_TRIAL',
            ];

            $subscriptionReason = 'INITIAL_TRIAL';

            if (! in_array($subscriptionReason, $allowedReasonCodes, true)) {
                throw new \RuntimeException('Invalid subscription reason code.');
            }

            $zones = [
                [
                    'key' => 'm3_r1',
                    'name' => 'Third Settlement - Mahallya 3 - Region 1 (التجمع الثالث - محلية ٣ - المنطقة الأولى)',
                    'lng' => 31.4285,
                    'lat' => 30.0121,
                ],
                [
                    'key' => 'm3_r2',
                    'name' => 'Third Settlement - Mahallya 3 - Region 2 (التجمع الثالث - محلية ٣ - المنطقة الثانية)',
                    'lng' => 31.4312,
                    'lat' => 30.0134,
                ],
                [
                    'key' => 'm4',
                    'name' => 'Third Settlement - Mahallya 4 (التجمع الثالث - محلية ٤)',
                    'lng' => 31.4350,
                    'lat' => 30.0102,
                ],
            ];

            $zoneIds = [];

            foreach ($zones as $zone) {
                $existingId = DB::table('zones')->where('name', $zone['name'])->value('id');

                if ($existingId) {
                    DB::table('zones')->where('id', $existingId)->update([
                        'coordinates' => DB::raw("ST_SetSRID(ST_MakePoint({$zone['lng']}, {$zone['lat']}), 4326)"),
                        'deleted_at' => null,
                        'updated_at' => $now,
                    ]);

                    $zoneIds[$zone['key']] = (int) $existingId;
                    continue;
                }

                $zoneIds[$zone['key']] = (int) DB::table('zones')->insertGetId([
                    'name' => $zone['name'],
                    'coordinates' => DB::raw("ST_SetSRID(ST_MakePoint({$zone['lng']}, {$zone['lat']}), 4326)"),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $configBase = 'https://raw.githubusercontent.com/jemy-dev/mart-lite-sample/main/store.config.json';

            $vendors = [
                [
                    'name' => 'Omega Fresh Meat (أوميجا للحوم الطازجة)',
                    'zone_key' => 'm3_r1',
                    'whatsapp_number' => '201000000001',
                    'config_url' => $configBase.'?vendor=meat',
                    'lng' => 31.4290,
                    'lat' => 30.0125,
                ],
                [
                    'name' => 'Omega Green Market (أوميجا ماركت)',
                    'zone_key' => 'm3_r2',
                    'whatsapp_number' => '201000000002',
                    'config_url' => $configBase.'?vendor=market',
                    'lng' => 31.4316,
                    'lat' => 30.0138,
                ],
            ];

            $vendorIds = [];

            foreach ($vendors as $vendor) {
                $existingId = DB::table('vendors')->where('config_url', $vendor['config_url'])->value('id');

                if ($existingId) {
                    DB::table('vendors')->where('id', $existingId)->update([
                        'zone_id' => $zoneIds[$vendor['zone_key']],
                        'name' => $vendor['name'],
                        'whatsapp_number' => $vendor['whatsapp_number'],
                        'coordinates' => DB::raw("ST_SetSRID(ST_MakePoint({$vendor['lng']}, {$vendor['lat']}), 4326)"),
                        'is_active' => true,
                        'deleted_at' => null,
                        'updated_at' => $now,
                    ]);

                    $vendorIds[] = (int) $existingId;
                    continue;
                }

                $vendorIds[] = (int) DB::table('vendors')->insertGetId([
                    'zone_id' => $zoneIds[$vendor['zone_key']],
                    'name' => $vendor['name'],
                    'whatsapp_number' => $vendor['whatsapp_number'],
                    'config_url' => $vendor['config_url'],
                    'coordinates' => DB::raw("ST_SetSRID(ST_MakePoint({$vendor['lng']}, {$vendor['lat']}), 4326)"),
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $subscriptionRows = array_map(
                fn (int $vendorId): array => [
                    'vendor_id' => $vendorId,
                    'status' => 'active',
                    'reason' => $subscriptionReason,
                    'expires_at' => $expiresAt,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                $vendorIds
            );

            DB::table('vendor_subscriptions')->upsert(
                $subscriptionRows,
                ['vendor_id'],
                ['status', 'reason', 'expires_at', 'updated_at']
            );
        });
    }
}
