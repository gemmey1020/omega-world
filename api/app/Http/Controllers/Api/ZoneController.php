<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ZoneResource;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class ZoneController extends Controller
{
    public function index(): JsonResponse
    {
        $payload = Cache::remember('api:zones:index:v1', now()->addSeconds(60), function (): array {
            $zones = Zone::query()
                ->select(['id', 'name'])
                ->selectRaw('ST_AsGeoJSON(zones.coordinates) as coordinates_geojson')
                ->whereHas('vendors', function ($vendorQuery) {
                    $vendorQuery
                        ->where('is_active', true)
                        ->whereHas('subscription', function ($subscriptionQuery) {
                            $subscriptionQuery
                                ->where('status', 'active')
                                ->where(function ($expiresQuery) {
                                    $expiresQuery
                                        ->whereNull('expires_at')
                                        ->orWhere('expires_at', '>', now());
                                });
                        });
                })
                ->orderBy('name')
                ->get();

            return ZoneResource::collection($zones)->response()->getData(true);
        });

        return response()->json($payload);
    }
}
