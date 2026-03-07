<?php

namespace Database\Seeders;

use App\Models\Provider;
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
        $this->call(SlaProfileSeeder::class);

        DB::transaction(function (): void {
            $now = now();
            $expiresAt = now()->addDays(30);
            $retailSlaProfileId = (int) DB::table('sla_profiles')
                ->where('type', 'retail')
                ->value('id');

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
                        'default_sla_profile_id' => $retailSlaProfileId,
                        'deleted_at' => null,
                        'updated_at' => $now,
                    ]);

                    $zoneIds[$zone['key']] = (int) $existingId;
                    continue;
                }

                $zoneIds[$zone['key']] = (int) DB::table('zones')->insertGetId([
                    'name' => $zone['name'],
                    'coordinates' => DB::raw("ST_SetSRID(ST_MakePoint({$zone['lng']}, {$zone['lat']}), 4326)"),
                    'default_sla_profile_id' => $retailSlaProfileId,
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

            $seededVendors = [];

            foreach ($vendors as $vendor) {
                $existingVendor = DB::table('vendors')
                    ->select(['id', 'provider_id'])
                    ->where('config_url', $vendor['config_url'])
                    ->first();
                $existingId = (int) ($existingVendor->id ?? 0);

                if ($existingId) {
                    DB::table('vendors')->where('id', $existingId)->update([
                        'zone_id' => $zoneIds[$vendor['zone_key']],
                        'name' => $vendor['name'],
                        'whatsapp_number' => $vendor['whatsapp_number'],
                        'coordinates' => DB::raw("ST_SetSRID(ST_MakePoint({$vendor['lng']}, {$vendor['lat']}), 4326)"),
                        'is_active' => false,
                        'deleted_at' => null,
                        'updated_at' => $now,
                    ]);

                    $seededVendors[] = [
                        'vendor_id' => $existingId,
                        'zone_id' => $zoneIds[$vendor['zone_key']],
                        'name' => $vendor['name'],
                        'whatsapp_number' => $vendor['whatsapp_number'],
                    ];
                    continue;
                }

                $vendorId = (int) DB::table('vendors')->insertGetId([
                    'zone_id' => $zoneIds[$vendor['zone_key']],
                    'name' => $vendor['name'],
                    'whatsapp_number' => $vendor['whatsapp_number'],
                    'config_url' => $vendor['config_url'],
                    'coordinates' => DB::raw("ST_SetSRID(ST_MakePoint({$vendor['lng']}, {$vendor['lat']}), 4326)"),
                    'is_active' => false,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $seededVendors[] = [
                    'vendor_id' => $vendorId,
                    'zone_id' => $zoneIds[$vendor['zone_key']],
                    'name' => $vendor['name'],
                    'whatsapp_number' => $vendor['whatsapp_number'],
                ];
            }

            foreach ($seededVendors as $vendor) {
                $existingProviderId = DB::table('providers')
                    ->where('vendor_id', $vendor['vendor_id'])
                    ->value('id');

                if ($existingProviderId) {
                    DB::table('providers')->where('id', $existingProviderId)->update([
                        'type' => Provider::TYPE_MERCHANT,
                        'zone_id' => $vendor['zone_id'],
                        'display_name' => $vendor['name'],
                        'primary_contact_phone' => null,
                        'whatsapp_number' => $vendor['whatsapp_number'],
                        'status' => Provider::STATUS_ACTIVE,
                        'sla_profile_id' => $retailSlaProfileId,
                        'metadata_json' => json_encode(['source' => 'database_seeder'], JSON_THROW_ON_ERROR),
                        'deleted_at' => null,
                        'updated_at' => $now,
                    ]);

                    $providerId = (int) $existingProviderId;
                } else {
                    $providerId = (int) DB::table('providers')->insertGetId([
                        'type' => Provider::TYPE_MERCHANT,
                        'vendor_id' => $vendor['vendor_id'],
                        'zone_id' => $vendor['zone_id'],
                        'display_name' => $vendor['name'],
                        'primary_contact_phone' => null,
                        'whatsapp_number' => $vendor['whatsapp_number'],
                        'status' => Provider::STATUS_ACTIVE,
                        'sla_profile_id' => $retailSlaProfileId,
                        'escalation_policy_id' => null,
                        'metadata_json' => json_encode(['source' => 'database_seeder'], JSON_THROW_ON_ERROR),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                DB::table('vendors')->where('id', $vendor['vendor_id'])->update([
                    'provider_id' => $providerId,
                    'is_active' => true,
                    'updated_at' => $now,
                ]);
            }

            $subscriptionRows = array_map(
                fn (array $vendor): array => [
                    'vendor_id' => $vendor['vendor_id'],
                    'status' => 'active',
                    'reason' => $subscriptionReason,
                    'expires_at' => $expiresAt,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                $seededVendors
            );

            DB::table('vendor_subscriptions')->upsert(
                $subscriptionRows,
                ['vendor_id'],
                ['status', 'reason', 'expires_at', 'updated_at']
            );
        });
    }
}
