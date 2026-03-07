<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\SlaProfile;
use Illuminate\Database\Seeder;

class SlaProfileSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $profiles = [
            [
                'name' => 'Retail',
                'type' => SlaProfile::TYPE_RETAIL,
                'time_to_ack_minutes' => 10,
                'time_to_dispatch_minutes' => 30,
                'time_to_deliver_minutes' => 60,
                'metadata_json' => [
                    'order_kind' => Order::KIND_RETAIL,
                    'description' => 'Default retail merchant dispatch SLA profile.',
                ],
            ],
            [
                'name' => 'Service',
                'type' => SlaProfile::TYPE_SERVICE,
                'time_to_ack_minutes' => 15,
                'time_to_dispatch_minutes' => 45,
                'time_to_deliver_minutes' => 120,
                'metadata_json' => [
                    'order_kind' => Order::KIND_SERVICE,
                    'description' => 'Default on-demand service provider SLA profile.',
                ],
            ],
        ];

        foreach ($profiles as $profile) {
            SlaProfile::query()->updateOrCreate(
                ['name' => $profile['name']],
                $profile,
            );
        }
    }
}
