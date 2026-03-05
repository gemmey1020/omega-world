<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Product;
use App\Models\Vendor;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class OmegaSyncVendors extends Command
{
    protected $signature = 'omega:sync-vendors';
    protected $description = 'Sync active vendor catalogs from external config URLs';

    public function handle(): int
    {
        $vendors = Vendor::query()
            ->where('is_active', true)
            ->whereHas('subscription', function ($query) {
                $query->where('status', 'active')
                    ->where(function ($subQuery) {
                        $subQuery->whereNull('expires_at')
                            ->orWhere('expires_at', '>', now());
                    });
            })
            ->get();

        if ($vendors->isEmpty()) {
            $this->warn('No active vendors with active subscriptions found.');
            return self::SUCCESS;
        }

        $stats = [
            'vendors_processed' => $vendors->count(),
            'vendor_failures' => 0,
            'categories_synced' => 0,
            'products_synced' => 0,
            'products_skipped' => 0,
        ];

        $this->info("Starting vendor sync for {$stats['vendors_processed']} vendor(s)...");

        $this->withProgressBar($vendors, function (Vendor $vendor) use (&$stats): void {
            try {
                $response = Http::acceptJson()
                    ->timeout(20)
                    ->get($vendor->config_url);

                if (! $response->successful()) {
                    $stats['vendor_failures']++;

                    Log::error('Vendor sync failed: config_url unreachable.', [
                        'vendor_id' => $vendor->id,
                        'config_url' => $vendor->config_url,
                        'http_status' => $response->status(),
                    ]);

                    return;
                }

                $payload = $response->json();

                if (! is_array($payload) || ! isset($payload['categories']) || ! is_array($payload['categories'])) {
                    $stats['vendor_failures']++;

                    Log::error('Vendor sync failed: invalid JSON structure.', [
                        'vendor_id' => $vendor->id,
                        'config_url' => $vendor->config_url,
                    ]);

                    return;
                }

                $this->syncVendorCatalog($vendor, $payload['categories'], $stats);
            } catch (Throwable $exception) {
                $stats['vendor_failures']++;

                Log::error('Vendor sync failed: exception thrown.', [
                    'vendor_id' => $vendor->id,
                    'config_url' => $vendor->config_url,
                    'message' => $exception->getMessage(),
                ]);
            }
        });

        $this->newLine(2);
        $this->info('Vendor sync completed.');
        $this->line("Vendors processed: {$stats['vendors_processed']}");
        $this->line("Vendor failures: {$stats['vendor_failures']}");
        $this->line("Categories synced: {$stats['categories_synced']}");
        $this->line("Products synced: {$stats['products_synced']}");
        $this->line("Products skipped: {$stats['products_skipped']}");

        return self::SUCCESS;
    }

    protected function syncVendorCatalog(Vendor $vendor, array $categories, array &$stats): void
    {
        foreach ($categories as $categoryData) {
            if (! is_array($categoryData) || ! isset($categoryData['name']) || ! is_string($categoryData['name'])) {
                Log::warning('Skipping category: invalid category name.', [
                    'vendor_id' => $vendor->id,
                ]);

                continue;
            }

            $categoryName = trim($categoryData['name']);

            if ($categoryName === '') {
                Log::warning('Skipping category: empty category name.', [
                    'vendor_id' => $vendor->id,
                ]);

                continue;
            }

            // Respect soft-deletes: do not sync into deleted rows.
            $trashedCategoryExists = Category::onlyTrashed()
                ->where('vendor_id', $vendor->id)
                ->where('name', $categoryName)
                ->exists();

            if ($trashedCategoryExists) {
                Log::warning('Skipping category: matching soft-deleted category exists.', [
                    'vendor_id' => $vendor->id,
                    'category_name' => $categoryName,
                ]);

                continue;
            }

            $category = Category::updateOrCreate(
                [
                    'vendor_id' => $vendor->id,
                    'name' => $categoryName,
                ],
                []
            );

            $stats['categories_synced']++;

            $products = $categoryData['products'] ?? [];

            if (! is_array($products)) {
                Log::warning('Skipping category products: products is not an array.', [
                    'vendor_id' => $vendor->id,
                    'category_name' => $categoryName,
                ]);

                continue;
            }

            foreach ($products as $productData) {
                if (! is_array($productData)) {
                    $stats['products_skipped']++;
                    continue;
                }

                $title = $productData['title'] ?? null;
                $price = $productData['price'] ?? null;
                $externalId = $productData['external_id'] ?? $productData['id'] ?? null;

                if (! is_string($title) || trim($title) === '' || ! is_numeric($price)) {
                    $stats['products_skipped']++;

                    Log::warning('Skipping product: invalid title or price.', [
                        'vendor_id' => $vendor->id,
                        'category_name' => $categoryName,
                        'external_id' => $externalId,
                    ]);

                    continue;
                }

                if (! is_scalar($externalId) || (string) $externalId === '') {
                    $stats['products_skipped']++;

                    Log::warning('Skipping product: missing external_id.', [
                        'vendor_id' => $vendor->id,
                        'category_name' => $categoryName,
                    ]);

                    continue;
                }

                $externalId = (string) $externalId;

                // Respect soft-deletes: do not sync into deleted rows.
                $trashedProductExists = Product::onlyTrashed()
                    ->where('vendor_id', $vendor->id)
                    ->where('external_id', $externalId)
                    ->exists();

                if ($trashedProductExists) {
                    $stats['products_skipped']++;

                    Log::warning('Skipping product: matching soft-deleted product exists.', [
                        'vendor_id' => $vendor->id,
                        'external_id' => $externalId,
                    ]);

                    continue;
                }

                $imageUrl = $productData['image_url'] ?? null;
                $imageUrl = is_string($imageUrl) && trim($imageUrl) !== '' ? $imageUrl : null;

                Product::updateOrCreate(
                    [
                        'vendor_id' => $vendor->id,
                        'external_id' => $externalId,
                    ],
                    [
                        'category_id' => $category->id,
                        'title' => trim($title),
                        'price' => (float) $price,
                        'image_url' => $imageUrl,
                    ]
                );

                $stats['products_synced']++;
            }
        }
    }
}
