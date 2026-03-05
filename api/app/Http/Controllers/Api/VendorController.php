<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VendorCatalogResource;
use App\Http\Resources\VendorResource;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VendorController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'zone_id' => [
                'required',
                'integer',
                Rule::exists('zones', 'id')->whereNull('deleted_at'),
            ],
        ]);

        $vendors = Vendor::query()
            ->select('vendors.*')
            ->selectRaw('ST_AsGeoJSON(vendors.coordinates) as coordinates_geojson')
            ->where('zone_id', $validated['zone_id'])
            ->whereHas('subscription')
            ->with([
                'subscription:id,vendor_id,status,reason,expires_at',
            ])
            ->orderBy('name')
            ->get();

        return VendorResource::collection($vendors);
    }

    public function catalog(int $id)
    {
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

        return new VendorCatalogResource($vendor);
    }
}
