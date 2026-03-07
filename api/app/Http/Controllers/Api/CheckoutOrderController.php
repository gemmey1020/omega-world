<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Checkout\StoreCheckoutOrderRequest;
use App\Models\AnalyticsEvent;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorAnalytics;
use App\Services\Dispatch\OrderDispatchService;
use App\Services\Dispatch\OrderEventRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutOrderController extends Controller
{
    public function __construct(
        private readonly OrderDispatchService $orderDispatchService,
        private readonly OrderEventRecorder $orderEventRecorder,
    ) {
    }

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

            $this->orderEventRecorder->record(
                $order,
                'order.received',
                null,
                Order::STATUS_RECEIVED,
                [
                    'source_channel' => $order->source_channel,
                    'item_count' => $requestedItems->count(),
                    'total_amount' => round($totalAmount, 2),
                ],
                $customer->id,
                null,
                $now,
                'Checkout order captured from public PWA.',
            );

            $this->orderDispatchService->assignNewOrder($order->id, null, true);

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

            $this->upsertCustomerMetrics($customer->id, $totalAmount, $now);

            return [
                'order' => $order->fresh(['latestDispatchAssignment']),
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
        $timestamp = now()->toDateTimeString();

        DB::statement(
            <<<'SQL'
            INSERT INTO users (device_hash, zone_id, created_at, updated_at, deleted_at)
            VALUES (?, ?, ?, ?, NULL)
            ON CONFLICT (device_hash) DO UPDATE SET
                zone_id = COALESCE(users.zone_id, EXCLUDED.zone_id),
                deleted_at = NULL,
                updated_at = EXCLUDED.updated_at
            WHERE users.deleted_at IS NOT NULL
                OR (users.zone_id IS NULL AND EXCLUDED.zone_id IS NOT NULL)
            SQL,
            [$deviceHash, $zoneId, $timestamp, $timestamp]
        );

        return User::query()
            ->where('device_hash', $deviceHash)
            ->firstOrFail();
    }

    private function generateOrderNumber(): string
    {
        $row = DB::selectOne("SELECT nextval('order_number_seq') AS sequence_value");
        $sequenceValue = (int) ($row->sequence_value ?? 0);

        return sprintf('ORD-%s-%06d', now()->format('Ymd'), $sequenceValue);
    }

    private function upsertCustomerMetrics(int $userId, float $totalAmount, Carbon $now): void
    {
        $amount = number_format($totalAmount, 2, '.', '');
        $timestamp = $now->toDateTimeString();

        DB::statement(
            <<<'SQL'
            INSERT INTO customer_metrics (
                user_id,
                lifetime_value,
                order_count,
                last_order_at,
                average_order_value,
                delivery_success_rate,
                cancellation_rate,
                risk_flags_json,
                created_at,
                updated_at
            )
            VALUES (?, ?, 1, ?, ?, 0, 0, ?::jsonb, ?, ?)
            ON CONFLICT (user_id) DO UPDATE SET
                lifetime_value = customer_metrics.lifetime_value + EXCLUDED.lifetime_value,
                order_count = customer_metrics.order_count + 1,
                last_order_at = EXCLUDED.last_order_at,
                average_order_value = (customer_metrics.lifetime_value + EXCLUDED.lifetime_value)
                    / (customer_metrics.order_count + 1),
                updated_at = EXCLUDED.updated_at
            SQL,
            [
                $userId,
                $amount,
                $timestamp,
                $amount,
                json_encode([], JSON_THROW_ON_ERROR),
                $timestamp,
                $timestamp,
            ]
        );
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
        $target = match ("{$table}.{$column}") {
            'orders.delivery_point' => ['table' => 'orders', 'column' => 'delivery_point'],
            default => throw new \InvalidArgumentException('Unsupported spatial target.'),
        };
        $timestamp = now()->toDateTimeString();

        if ($point === null) {
            DB::update(
                "UPDATE {$target['table']} SET {$target['column']} = NULL, updated_at = ? WHERE id = ?",
                [$timestamp, $id]
            );

            return;
        }
        [$lng, $lat] = $point['coordinates'];

        DB::update(
            "UPDATE {$target['table']} SET {$target['column']} = ST_SetSRID(ST_MakePoint(?, ?), 4326), updated_at = ? WHERE id = ?",
            [(float) $lng, (float) $lat, $timestamp, $id]
        );
    }
}
