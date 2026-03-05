<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ZoneResource;
use App\Models\Zone;

class ZoneController extends Controller
{
    public function index()
    {
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

        return ZoneResource::collection($zones);
    }
}
