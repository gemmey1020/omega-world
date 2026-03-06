<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Zone;
use App\Models\Vendor;
use App\Models\VendorSubscription;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class StressTestSeeder extends Seeder
{
    public function run(): void
    {
        // 1. تصفير شامل وتصفير العدادات (Identity Restart) لضمان بداية نظيفة
        DB::statement("TRUNCATE zones, vendors, vendor_subscriptions, categories, products RESTART IDENTITY CASCADE;");
        DB::statement("SET session_replication_role = 'replica';");

        // قائمة مناطق موسعة لاختبار الـ Zone Selection UI
        $zones = [
            'Maadi', 'Heliopolis', 'Nasr City', 'Zamalek', 'Dokki', 
            'Sheikh Zayed', 'New Cairo', 'Obour City', 'Shorouk', 'Madinaty'
        ];
        
        $mobilePrefixes = ['10', '11', '12', '15'];

        // Canon V3.0 Locked Reason Codes
        $inactiveReasons = [
            'SUBSCRIPTION_EXPIRED',
            'ADMIN_BLOCK',
            'PENDING_SETUP',
            'MANUAL_PAUSE',
        ];
        
        foreach ($zones as $zoneName) {
            $zone = Zone::create([
                'name' => $zoneName,
                'coordinates' => DB::raw("ST_GeomFromText('POINT(31.2357 30.0444)', 4326)"),
            ]);

            // 10 تجار في كل منطقة (Total 100 Vendors) لاختبار الـ Scroll Performance
            for ($i = 1; $i <= 10; $i++) {
                $randomMobile = '+20' . $mobilePrefixes[array_rand($mobilePrefixes)] . rand(10000000, 99999999);
                
                $vendor = Vendor::create([
                    'zone_id' => $zone->id,
                    'name' => ($i % 2 == 0 ? "Premium " : "Local ") . $zoneName . " Market #" . $i,
                    'whatsapp_number' => $randomMobile,
                    'config_url' => "https://docs.google.com/spreadsheets/d/mega_stress_" . uniqid(),
                    'is_active' => $i <= 7, // 30% inactive
                    'primary_category' => ['Vegetables', 'Fruits', 'Butchery', 'Dairy', 'Bakery'][array_rand(['Vegetables', 'Fruits', 'Butchery', 'Dairy', 'Bakery'])],
                    'coordinates' => DB::raw("ST_GeomFromText('POINT(31.2357 30.0444)', 4326)"),
                ]);

                // Subscription: 70% active/trial, 30% expired
                if ($i <= 7) {
                    VendorSubscription::create([
                        'vendor_id' => $vendor->id,
                        'status' => $i <= 5 ? 'active' : 'trial',
                        'reason' => $i <= 5 ? null : 'INITIAL_TRIAL',
                        'expires_at' => $i <= 5 ? now()->addMonths(6) : now()->addDays(14),
                    ]);
                } else {
                    VendorSubscription::create([
                        'vendor_id' => $vendor->id,
                        'status' => 'expired',
                        'reason' => $inactiveReasons[array_rand($inactiveReasons)],
                        'expires_at' => now()->subDays(rand(1, 30)),
                    ]);
                }

                // 12 كاتيجوري متنوعة لاختبار الـ Category Pill Spacing
                $categories = [
                    'Vegetables', 'Fruits', 'Butchery', 'Poultry', 'Dairy', 'Bakery', 
                    'Spices', 'Frozen', 'Canned Goods', 'Detergents', 'Snacks', 'Beverages'
                ];
                
                foreach ($categories as $catName) {
                    $category = Category::create([
                        'vendor_id' => $vendor->id,
                        'name' => $catName,
                    ]);

                    // 30 منتج لكل كاتيجوري (Total 360 products per vendor!)
                    // الإجمالي الكلي للداتابيز هيكون حوالي 36,000 منتج!
                    for ($p = 1; $p <= 30; $p++) {
                        Product::create([
                            'category_id' => $category->id,
                            'vendor_id' => $vendor->id,
                            'external_id' => "ext_" . uniqid(),
                            'title' => "Product {$p}: " . ($p % 5 == 0 ? "Extra long title with specialized naming convention to stress the V3.1 text-clamping and dead-zone layout" : "Standard Marketplace Item"),
                            'price' => rand(10, 1500) . '.' . rand(10, 99), // أسعار ضخمة وكسور معقدة
                            'image_url' => "https://picsum.photos/400/300?random=" . rand(1, 10000),
                        ]);
                    }
                }
            }
        }

        DB::statement("SET session_replication_role = 'origin';");
    }
}