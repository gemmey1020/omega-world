<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Checkout\StoreCheckoutOrderRequest;
use App\Models\AnalyticsEvent;
use App\Models\CustomerMetric;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorAnalytics;
use Illuminate\Database\Query\Expression;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutOrderController extends Controller
{
    public function store(StoreCheckoutOrderRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $vendor = Vendor::query()
            ->with([
                'subscription:id,vendor_id,status,reason,expires_at',
                'provider',
            ])
            ->findOrFail((int) $validated['vendor_id']);

        if (! $this->isVendorCheckoutAvailable($vendor)) {
            throw ValidationException::withMessages([
                'vendor_id' => ['Vendor checkout is not available right now.'],
            ]);
        }

        /** @var Collection<int, array{product_id:int,quantity:int}> $requestedItems */
        $requestedItems = collect($validated['items'])
            ->map(fn (array $item): array => [
                'product_id' => (int) $item['product_id'],
                'quantity' => (int) $item['quantity'],
            ]);

        $products = Product::query()
            ->select(['id', 'vendor_id', 'category_id', 'external_id', 'title', 'price', 'image_url'])
            ->with(['category:id,name'])
            ->where('vendor_id', $vendor->id)
            ->whereIn('id', $requestedItems->pluck('product_id')->all())
            ->get()
            ->keyBy('id');

        if ($products->count() !== $requestedItems->count()) {
            throw ValidationException::withMessages([
                'items' => ['One or more selected products are invalid for this vendor.'],
            ]);
        }

        $result = DB::transaction(function () use ($validated, $vendor, $requestedItems, $products): array {
            $customer = $this->resolveCustomerUser((string) $validated['device_hash'], $vendor->zone_id);
            $now = now();
            $orderNumber = $this->generateOrderNumber();
            $orderItemsPayload = [];
            $orderLines = [];
            $totalAmount = 0.0;

            foreach ($requestedItems as $requestedItem) {
                /** @var Product $product */
                $product = $products->get($requestedItem['product_id']);
                $quantity = $requestedItem['quantity'];
                $unitPrice = (float) $product->price;
                $lineTotal = $unitPrice * $quantity;
                $totalAmount += $lineTotal;

                $orderLines[] = [
                    'title' => $product->title,
                    'quantity' => $quantity,
                    'line_total' => $lineTotal,
                ];

                $orderItemsPayload[] = [
                    'item_type' => OrderItem::ITEM_TYPE_PRODUCT,
                    'product_id' => $product->id,
                    'snapshot_external_id' => $product->external_id,
                    'snapshot_title' => $product->title,
                    'snapshot_sku' => null,
                    'snapshot_category_name' => $product->category?->name,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total_price' => $lineTotal,
                    'metadata_json' => [
                        'image_url' => $product->image_url,
                    ],
                ];
            }

            $order = Order::query()->create([
                'order_number' => $orderNumber,
                'kind' => Order::KIND_RETAIL,
                'source_channel' => (string) ($validated['source_channel'] ?? 'pwa'),
                'customer_user_id' => $customer->id,
                'zone_id' => $vendor->zone_id,
                'provider_id' => $vendor->provider_id,
                'vendor_id' => $vendor->id,
                'status' => Order::STATUS_RECEIVED,
                'received_at' => $now,
                'total_amount' => $totalAmount,
                'currency' => 'EGP',
                'needs_manual_intervention' => false,
                'escalation_state' => null,
                'metadata_json' => [
                    'device_hash' => (string) $validated['device_hash'],
                    'share_cart_url' => $validated['share_cart_url'] ?? null,
                    'origin_ip' => request()->ip(),
                    'origin_user_agent' => request()->userAgent(),
                ],
            ]);

            if (array_key_exists('delivery_point', $validated)) {
                $this->syncPointColumn('orders', 'delivery_point', $order->id, $validated['delivery_point'] ?? null);
                $order->refresh();
            }

            foreach ($orderItemsPayload as $itemPayload) {
                $order->items()->create($itemPayload);
            }

            $order->events()->create([
                'actor_user_id' => $customer->id,
                'dispatch_assignment_id' => null,
                'event_type' => 'order.received',
                'from_status' => null,
                'to_status' => Order::STATUS_RECEIVED,
                'happened_at' => $now,
                'notes' => 'Checkout order captured from public PWA.',
                'metadata_json' => [
                    'source_channel' => $order->source_channel,
                ],
            ]);

            AnalyticsEvent::query()->create([
                'user_id' => $customer->id,
                'vendor_id' => $vendor->id,
                'provider_id' => $vendor->provider_id,
                'order_id' => $order->id,
                'zone_id' => $vendor->zone_id,
                'event_type' => 'checkout_order_created',
                'event_name' => 'Checkout Order Created',
                'search_query' => null,
                'session_key' => null,
                'device_hash' => (string) $validated['device_hash'],
                'occurred_at' => $now,
                'payload_json' => [
                    'item_count' => $requestedItems->count(),
                    'total_amount' => round($totalAmount, 2),
                    'source_channel' => $order->source_channel,
                ],
            ]);

            VendorAnalytics::query()->create([
                'vendor_id' => $vendor->id,
                'user_id' => $customer->id,
                'event_type' => 'checkout_order_created',
                'search_query' => null,
            ]);

            $customerMetric = CustomerMetric::query()->firstOrCreate(
                ['user_id' => $customer->id],
                [
                    'lifetime_value' => 0,
                    'order_count' => 0,
                    'average_order_value' => 0,
                    'delivery_success_rate' => 0,
                    'cancellation_rate' => 0,
                    'risk_flags_json' => [],
                ]
            );

            $nextOrderCount = $customerMetric->order_count + 1;
            $nextLifetimeValue = (float) $customerMetric->lifetime_value + $totalAmount;

            $customerMetric->fill([
                'lifetime_value' => $nextLifetimeValue,
                'order_count' => $nextOrderCount,
                'last_order_at' => $now,
                'average_order_value' => $nextOrderCount > 0 ? $nextLifetimeValue / $nextOrderCount : 0,
            ]);
            $customerMetric->save();

            return [
                'order' => $order->fresh(),
                'redirect_url' => $this->buildWhatsAppRedirectUrl(
                    (string) $vendor->whatsapp_number,
                    $vendor->name,
                    $orderNumber,
                    (string) $validated['device_hash'],
                    $orderLines,
                    $totalAmount,
                    isset($validated['share_cart_url']) ? (string) $validated['share_cart_url'] : null,
                ),
            ];
        });

        /** @var Order $order */
        $order = $result['order'];

        return response()->json([
            'data' => [
                'order_id' => $order->id,
                'status' => $order->status,
                'redirect_url' => $result['redirect_url'],
            ],
        ], 201);
    }

    private function isVendorCheckoutAvailable(Vendor $vendor): bool
    {
        $subscription = $vendor->subscription;
        $provider = $vendor->provider;

        if ($subscription === null || $provider === null) {
            return false;
        }

        $expiresAt = $subscription->expires_at;
        $isNotExpired = $expiresAt === null || $expiresAt->isFuture();

        return $vendor->is_active
            && $subscription->status === 'active'
            && $isNotExpired
            && $provider->status === \App\Models\Provider::STATUS_ACTIVE;
    }

    private function resolveCustomerUser(string $deviceHash, ?int $zoneId): User
    {
        $user = User::withTrashed()
            ->where('device_hash', $deviceHash)
            ->first();

        if ($user === null) {
            return User::query()->create([
                'device_hash' => $deviceHash,
                'zone_id' => $zoneId,
            ]);
        }

        if ($user->trashed()) {
            $user->restore();
        }

        if ($user->zone_id === null && $zoneId !== null) {
            $user->zone_id = $zoneId;
            $user->save();
        }

        return $user;
    }

    private function generateOrderNumber(): string
    {
        do {
            $candidate = 'ORD-'.now()->format('YmdHis').'-'.Str::upper(Str::random(6));
        } while (Order::query()->where('order_number', $candidate)->exists());

        return $candidate;
    }

    /**
     * @param  list<array{title:string,quantity:int,line_total:float}>  $orderLines
     */
    private function buildWhatsAppRedirectUrl(
        string $rawWhatsappNumber,
        string $vendorName,
        string $orderNumber,
        string $deviceHash,
        array $orderLines,
        float $totalAmount,
        ?string $shareCartUrl,
    ): string {
        $target = preg_replace('/[^\d]/', '', $rawWhatsappNumber) ?? '';

        if ($target === '') {
            throw ValidationException::withMessages([
                'vendor_id' => ['Vendor WhatsApp number is missing or invalid.'],
            ]);
        }

        $lines = array_map(
            static fn (array $line): string => sprintf(
                '- %s x%d = EGP %.2f',
                $line['title'],
                $line['quantity'],
                $line['line_total']
            ),
            $orderLines
        );

        $message = [
            "Order Request - {$vendorName}",
            "Order Number: {$orderNumber}",
            "Device Hash: {$deviceHash}",
            'Items:',
            ...$lines,
            sprintf('Total: EGP %.2f', $totalAmount),
            ...($shareCartUrl ? ["Share this cart: {$shareCartUrl}"] : []),
        ];

        return sprintf(
            'https://api.whatsapp.com/send/?phone=%s&text=%s',
            $target,
            urlencode(implode("\n", $message))
        );
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
}
