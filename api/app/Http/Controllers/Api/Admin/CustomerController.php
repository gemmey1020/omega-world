<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CustomerIndexRequest;
use App\Models\Order;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

class CustomerController extends Controller
{
    public function index(CustomerIndexRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $perPage = (int) ($validated['per_page'] ?? 25);

        $query = User::query()
            ->with([
                'zone:id,name',
                'customerMetric',
            ])
            ->withCount('orders')
            ->orderByDesc('updated_at')
            ->orderByDesc('id');

        if (isset($validated['zone_id'])) {
            $query->where('zone_id', (int) $validated['zone_id']);
        }

        if (array_key_exists('has_orders', $validated)) {
            if ((bool) $validated['has_orders']) {
                $query->has('orders');
            } else {
                $query->doesntHave('orders');
            }
        }

        if (! empty($validated['search'])) {
            $search = trim((string) $validated['search']);

            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%")
                    ->orWhere('device_hash', 'ilike', "%{$search}%");
            });
        }

        $customers = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $customers->getCollection()->map(fn (User $user): array => $this->transformCustomerSummary($user))->values()->all(),
            'meta' => $this->buildPaginatorMeta($customers),
        ]);
    }

    public function show(User $user): JsonResponse
    {
        $user->loadMissing([
            'zone:id,name',
            'customerMetric',
        ]);

        $recentOrders = Order::query()
            ->with([
                'provider:id,display_name',
                'vendor:id,name',
            ])
            ->where('customer_user_id', $user->id)
            ->orderByDesc('received_at')
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        return response()->json([
            'data' => array_merge($this->transformCustomerSummary($user), [
                'recent_orders' => $recentOrders->map(fn (Order $order): array => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'kind' => $order->kind,
                    'status' => $order->status,
                    'vendor_id' => $order->vendor_id,
                    'provider_id' => $order->provider_id,
                    'total_amount' => (float) $order->total_amount,
                    'currency' => $order->currency,
                    'received_at' => $order->received_at?->toISOString(),
                    'vendor' => $order->vendor ? [
                        'id' => $order->vendor->id,
                        'name' => $order->vendor->name,
                    ] : null,
                    'provider' => $order->provider ? [
                        'id' => $order->provider->id,
                        'display_name' => $order->provider->display_name,
                    ] : null,
                ])->values()->all(),
            ]),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformCustomerSummary(User $user): array
    {
        $metrics = $user->customerMetric;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'device_hash' => $user->device_hash,
            'zone_id' => $user->zone_id,
            'zone' => $user->zone ? [
                'id' => $user->zone->id,
                'name' => $user->zone->name,
            ] : null,
            'orders_count' => $user->orders_count ?? 0,
            'customer_metrics' => $metrics ? [
                'lifetime_value' => (float) $metrics->lifetime_value,
                'order_count' => $metrics->order_count,
                'last_order_at' => $metrics->last_order_at?->toISOString(),
                'average_order_value' => (float) $metrics->average_order_value,
                'delivery_success_rate' => (float) $metrics->delivery_success_rate,
                'cancellation_rate' => (float) $metrics->cancellation_rate,
                'risk_flags_json' => $metrics->risk_flags_json,
            ] : null,
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
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
