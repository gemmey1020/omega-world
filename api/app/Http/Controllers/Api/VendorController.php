<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VendorCatalogResource;
use App\Http\Resources\VendorResource;
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

    public function catalog(int $id): JsonResponse
    {
        $payload = Cache::remember("api:vendors:catalog:{$id}:v1", now()->addSeconds(30), function () use ($id): array {
            $vendor = Vendor::query()
                ->select('vendors.*')
                ->selectRaw('ST_AsGeoJSON(vendors.coordinates) as coordinates_geojson')
                ->where('id', $id)
                ->whereHas('subscription')
                ->with([
                    'subscription:id,vendor_id,status,reason,expires_at',
                    'categories' => function ($categoryQuery) {
                        $categoryQuery
                            ->select(['id', 'vendor_id', 'name'])
                            ->orderBy('name');
                    },
                    'categories.products' => function ($productQuery) {
                        $productQuery
                            ->select(['id', 'category_id', 'vendor_id', 'external_id', 'title', 'price', 'image_url'])
                            ->orderBy('title');
                    },
                ])
                ->firstOrFail();

            return (new VendorCatalogResource($vendor))->response()->getData(true);
        });

        return response()->json($payload);
    }
}
