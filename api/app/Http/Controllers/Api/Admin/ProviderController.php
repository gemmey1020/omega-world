<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProviderIndexRequest;
use App\Http\Requests\Admin\StoreProviderRequest;
use App\Http\Requests\Admin\UpdateProviderRequest;
use App\Models\Provider;
use App\Models\Vendor;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Expression;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ProviderController extends Controller
{
    public function index(ProviderIndexRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $perPage = (int) ($validated['per_page'] ?? 25);

        $query = Provider::query()
            ->select('providers.*')
            ->selectRaw('CASE WHEN providers.coordinates IS NULL THEN NULL ELSE ST_AsGeoJSON(providers.coordinates) END as coordinates_geojson')
            ->with([
                'vendor:id,name,provider_id',
                'zone:id,name',
            ])
            ->orderBy('display_name');

        if (isset($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (isset($validated['zone_id'])) {
            $query->where('zone_id', (int) $validated['zone_id']);
        }

        if (isset($validated['vendor_id'])) {
            $query->where('vendor_id', (int) $validated['vendor_id']);
        }

        if (! empty($validated['search'])) {
            $search = trim((string) $validated['search']);

            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('display_name', 'ilike', "%{$search}%")
                    ->orWhere('primary_contact_phone', 'ilike', "%{$search}%")
                    ->orWhere('whatsapp_number', 'ilike', "%{$search}%");
            });
        }

        $providers = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $providers->getCollection()->map(fn (Provider $provider): array => $this->transformProvider($provider))->values()->all(),
            'meta' => $this->buildPaginatorMeta($providers),
        ]);
    }

    public function show(Provider $provider): JsonResponse
    {
        $provider = $this->loadProvider($provider->id);

        return response()->json([
            'data' => $this->transformProvider($provider),
        ]);
    }

    public function store(StoreProviderRequest $request): JsonResponse
    {
        $provider = DB::transaction(function () use ($request): Provider {
            return $this->persistProvider(
                new Provider(),
                $request->validated(),
                array_key_exists('coordinates', $request->all())
            );
        });

        return response()->json([
            'data' => $this->transformProvider($provider),
        ], 201);
    }

    public function update(UpdateProviderRequest $request, Provider $provider): JsonResponse
    {
        $provider = DB::transaction(function () use ($request, $provider): Provider {
            return $this->persistProvider(
                $provider,
                $request->validated(),
                array_key_exists('coordinates', $request->all())
            );
        });

        return response()->json([
            'data' => $this->transformProvider($provider),
        ]);
    }

    private function loadProvider(int $providerId): Provider
    {
        return Provider::query()
            ->select('providers.*')
            ->selectRaw('CASE WHEN providers.coordinates IS NULL THEN NULL ELSE ST_AsGeoJSON(providers.coordinates) END as coordinates_geojson')
            ->with([
                'vendor:id,name,provider_id',
                'zone:id,name',
            ])
            ->findOrFail($providerId);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function persistProvider(Provider $provider, array $validated, bool $hasCoordinatesPatch): Provider
    {
        $previousVendorId = $provider->vendor_id;
        $point = $validated['coordinates'] ?? null;

        unset($validated['coordinates']);

        $provider->fill($validated);
        $provider->save();

        if ($hasCoordinatesPatch) {
            $this->syncPointColumn('providers', 'coordinates', $provider->id, $point);
        }

        if ($previousVendorId !== null && $previousVendorId !== $provider->vendor_id) {
            Vendor::withTrashed()
                ->whereKey($previousVendorId)
                ->update([
                    'provider_id' => null,
                    'updated_at' => now(),
                ]);
        }

        if ($provider->vendor_id !== null) {
            Vendor::withTrashed()
                ->whereKey($provider->vendor_id)
                ->update([
                    'provider_id' => $provider->id,
                    'updated_at' => now(),
                ]);
        }

        return $this->loadProvider($provider->id);
    }

    /**
     * @param  array<string, mixed>|null  $point
     */
    private function syncPointColumn(string $table, string $column, int $id, ?array $point): void
    {
        $query = DB::table($table)->where('id', $id);

        if ($point === null) {
            $query->update([
                $column => null,
                'updated_at' => now(),
            ]);

            return;
        }

        $query->update([
            $column => $this->makePointExpression($point),
            'updated_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $point
     */
    private function makePointExpression(array $point): Expression
    {
        [$lng, $lat] = $point['coordinates'];
        $lng = number_format((float) $lng, 7, '.', '');
        $lat = number_format((float) $lat, 7, '.', '');

        return DB::raw("ST_SetSRID(ST_MakePoint({$lng}, {$lat}), 4326)");
    }

    /**
     * @return array<string, mixed>
     */
    private function transformProvider(Provider $provider): array
    {
        return [
            'id' => $provider->id,
            'type' => $provider->type,
            'vendor_id' => $provider->vendor_id,
            'zone_id' => $provider->zone_id,
            'display_name' => $provider->display_name,
            'primary_contact_phone' => $provider->primary_contact_phone,
            'whatsapp_number' => $provider->whatsapp_number,
            'status' => $provider->status,
            'coordinates' => $provider->coordinates_geojson !== null ? json_decode((string) $provider->coordinates_geojson, true) : null,
            'capabilities_json' => $provider->capabilities_json,
            'sla_profile_id' => $provider->sla_profile_id,
            'escalation_policy_id' => $provider->escalation_policy_id,
            'metadata_json' => $provider->metadata_json,
            'vendor' => $provider->vendor ? [
                'id' => $provider->vendor->id,
                'name' => $provider->vendor->name,
            ] : null,
            'zone' => $provider->zone ? [
                'id' => $provider->zone->id,
                'name' => $provider->zone->name,
            ] : null,
            'created_at' => $provider->created_at?->toISOString(),
            'updated_at' => $provider->updated_at?->toISOString(),
            'deleted_at' => $provider->deleted_at?->toISOString(),
        ];
    }

    /**
     * @return array<string, int|null>
     */
    private function buildPaginatorMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }
}
