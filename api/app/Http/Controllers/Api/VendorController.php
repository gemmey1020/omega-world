<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\VendorResource;
use App\Models\Product;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class VendorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'zone_id' => [
                'required',
                'integer',
                Rule::exists('zones', 'id')->whereNull('deleted_at'),
            ],
        ]);

        $zoneId = (int) $validated['zone_id'];

        $payload = Cache::remember("api:vendors:index:zone:{$zoneId}:v1", now()->addSeconds(30), function () use ($zoneId): array {
            $vendors = Vendor::query()
                ->select('vendors.*')
                ->selectRaw('ST_AsGeoJSON(vendors.coordinates) as coordinates_geojson')
                ->where('zone_id', $zoneId)
                ->whereHas('subscription')
                ->with([
                    'subscription:id,vendor_id,status,reason,expires_at',
                ])
                ->orderBy('name')
                ->get();

            return VendorResource::collection($vendors)->response()->getData(true);
        });

        return response()->json($payload);
    }

    public function catalog(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $page = (int) ($validated['page'] ?? 1);
        $latestProductTimestamp = Product::query()
            ->where('vendor_id', $id)
            ->max('updated_at');
        $catalogVersion = substr(sha1((string) ($latestProductTimestamp ?? 'no-products')), 0, 12);

        $payload = Cache::remember(
            "api:vendors:catalog:{$id}:version:{$catalogVersion}:page:{$page}:v3",
            now()->addSeconds(30),
            function () use ($id, $page): array {
            $vendor = Vendor::query()
                ->select('vendors.*')
                ->selectRaw('ST_AsGeoJSON(vendors.coordinates) as coordinates_geojson')
                ->where('id', $id)
                ->whereHas('subscription')
                ->with([
                    'subscription:id,vendor_id,status,reason,expires_at',
                ])
                ->firstOrFail();

            $productsPaginator = Product::query()
                ->select(['id', 'category_id', 'vendor_id', 'external_id', 'title', 'price', 'image_url'])
                ->where('vendor_id', $vendor->id)
                ->with(['category:id,vendor_id,name'])
                ->orderBy('id')
                ->paginate(30, ['*'], 'page', $page);

            $categoriesPayload = $productsPaginator->getCollection()
                ->filter(static fn (Product $product): bool => $product->category !== null)
                ->groupBy('category_id')
                ->map(static function ($products): array {
                    /** @var Product|null $firstProduct */
                    $firstProduct = $products->first();
                    $category = $firstProduct?->category;

                    if ($category === null) {
                        return [];
                    }

                    return [
                        'id' => $category->id,
                        'name' => $category->name,
                        'products' => ProductResource::collection($products)->resolve(),
                    ];
                })
                ->filter(static fn (array $category): bool => $category !== [])
                ->values()
                ->all();

            $subscription = $vendor->subscription;
            $isCheckoutAvailable = false;

            if ($subscription !== null) {
                $expiresAt = $subscription->expires_at;
                $isNotExpired = $expiresAt === null || $expiresAt->isFuture();
                $isCheckoutAvailable = $vendor->is_active && $subscription->status === 'active' && $isNotExpired;
            }

            return [
                'data' => [
                    'id' => $vendor->id,
                    'zone_id' => $vendor->zone_id,
                    'name' => $vendor->name,
                    'primary_category' => $vendor->primary_category,
                    'whatsapp_number' => (string) $vendor->whatsapp_number,
                    'coordinates' => json_decode((string) $vendor->coordinates_geojson, true),
                    'is_active' => (bool) $vendor->is_active,
                    'subscription' => [
                        'status' => $subscription?->status,
                        'reason' => $subscription?->reason,
                        'expires_at' => $subscription?->expires_at?->toISOString(),
                    ],
                    'is_checkout_available' => $isCheckoutAvailable,
                    'categories' => $categoriesPayload,
                ],
                'meta' => [
                    'current_page' => $productsPaginator->currentPage(),
                    'last_page' => $productsPaginator->lastPage(),
                    'per_page' => $productsPaginator->perPage(),
                    'total' => $productsPaginator->total(),
                    'from' => $productsPaginator->firstItem(),
                    'to' => $productsPaginator->lastItem(),
                ],
                'links' => [
                    'next' => $productsPaginator->nextPageUrl(),
                    'prev' => $productsPaginator->previousPageUrl(),
                ],
            ];
        });

        return response()->json($payload);
    }
}
