<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exceptions\DispatchStateException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OrderIndexRequest;
use App\Models\DispatchAssignment;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\OrderItem;
use App\Models\ProviderNotification;
use App\Services\Dispatch\OrderDispatchService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function markInTransit(Request $request, Order $order, OrderDispatchService $orderDispatchService): JsonResponse
    {
        try {
            $orderDispatchService->markInTransit($order->id, $request->user('admin')?->id);
        } catch (DispatchStateException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'current_state' => $exception->context,
            ], 409);
        }

        return response()->json([
            'data' => $this->transformOrderDetail($this->loadOrder($order->id)),
        ]);
    }

    public function markDelivered(Request $request, Order $order, OrderDispatchService $orderDispatchService): JsonResponse
    {
        try {
            $orderDispatchService->markDelivered($order->id, $request->user('admin')?->id);
        } catch (DispatchStateException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'current_state' => $exception->context,
            ], 409);
        }

        return response()->json([
            'data' => $this->transformOrderDetail($this->loadOrder($order->id)),
        ]);
    }

    public function index(OrderIndexRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $perPage = (int) ($validated['per_page'] ?? 25);

        $query = Order::query()
            ->select('orders.*')
            ->selectRaw($this->deliveryPointSelectExpression())
            ->with([
                'provider:id,display_name',
                'vendor:id,name',
                'customer:id,name,email,phone,device_hash,zone_id',
                'zone:id,name',
                'latestDispatchAssignment:id,order_id,status,attempt_no,ack_deadline_at,assigned_at',
            ])
            ->withCount('items')
            ->orderByDesc('received_at')
            ->orderByDesc('id');

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (isset($validated['kind'])) {
            $query->where('kind', $validated['kind']);
        }

        if (isset($validated['zone_id'])) {
            $query->where('zone_id', (int) $validated['zone_id']);
        }

        if (isset($validated['provider_id'])) {
            $query->where('provider_id', (int) $validated['provider_id']);
        }

        if (isset($validated['customer_user_id'])) {
            $query->where('customer_user_id', (int) $validated['customer_user_id']);
        }

        if (isset($validated['date_from'])) {
            $query->whereDate('received_at', '>=', $validated['date_from']);
        }

        if (isset($validated['date_to'])) {
            $query->whereDate('received_at', '<=', $validated['date_to']);
        }

        if (! empty($validated['search'])) {
            $search = trim((string) $validated['search']);

            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('order_number', 'ilike', "%{$search}%")
                    ->orWhereHas('vendor', fn ($vendorQuery) => $vendorQuery->where('name', 'ilike', "%{$search}%"))
                    ->orWhereHas('provider', fn ($providerQuery) => $providerQuery->where('display_name', 'ilike', "%{$search}%"))
                    ->orWhereHas('customer', fn ($customerQuery) => $customerQuery
                        ->where('name', 'ilike', "%{$search}%")
                        ->orWhere('email', 'ilike', "%{$search}%")
                        ->orWhere('phone', 'ilike', "%{$search}%")
                        ->orWhere('device_hash', 'ilike', "%{$search}%"));
            });
        }

        $orders = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $orders->getCollection()->map(fn (Order $order): array => $this->transformOrderSummary($order))->values()->all(),
            'meta' => $this->buildPaginatorMeta($orders),
        ]);
    }

    public function show(Order $order): JsonResponse
    {
        $order = $this->loadOrder($order->id);

        return response()->json([
            'data' => $this->transformOrderDetail($order),
        ]);
    }

    private function loadOrder(int $orderId): Order
    {
        return Order::query()
            ->select('orders.*')
            ->selectRaw($this->deliveryPointSelectExpression())
            ->with([
                'provider:id,display_name',
                'vendor:id,name,whatsapp_number',
                'customer:id,name,email,phone,device_hash,zone_id',
                'zone:id,name',
                'items',
                'items.product:id,title',
                'dispatchAssignments.provider:id,display_name',
                'dispatchAssignments.assignedBy:id,name,email',
                'notifications.provider:id,display_name',
                'notifications.dispatchAssignment:id,order_id,provider_id,attempt_no',
                'events.actorUser:id,name,email',
                'events.dispatchAssignment:id,order_id,provider_id,attempt_no',
                'latestDispatchAssignment:id,order_id,status,attempt_no,ack_deadline_at,assigned_at',
            ])
            ->findOrFail($orderId);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformOrderSummary(Order $order): array
    {
        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'kind' => $order->kind,
            'status' => $order->status,
            'source_channel' => $order->source_channel,
            'customer_user_id' => $order->customer_user_id,
            'zone_id' => $order->zone_id,
            'provider_id' => $order->provider_id,
            'vendor_id' => $order->vendor_id,
            'currency' => $order->currency,
            'total_amount' => (float) $order->total_amount,
            'items_count' => $order->items_count,
            'received_at' => $order->received_at?->toISOString(),
            'ack_deadline_at' => $order->latestDispatchAssignment?->ack_deadline_at?->toISOString(),
            'sla_dispatch_by' => $order->sla_dispatch_by?->toISOString(),
            'sla_delivery_by' => $order->sla_delivery_by?->toISOString(),
            'needs_manual_intervention' => (bool) $order->needs_manual_intervention,
            'escalation_state' => $order->escalation_state,
            'delivery_point' => $order->delivery_point_geojson !== null ? json_decode((string) $order->delivery_point_geojson, true) : null,
            'provider' => $order->provider ? [
                'id' => $order->provider->id,
                'display_name' => $order->provider->display_name,
            ] : null,
            'vendor' => $order->vendor ? [
                'id' => $order->vendor->id,
                'name' => $order->vendor->name,
            ] : null,
            'zone' => $order->zone ? [
                'id' => $order->zone->id,
                'name' => $order->zone->name,
            ] : null,
            'customer' => $order->customer ? [
                'id' => $order->customer->id,
                'name' => $order->customer->name,
                'email' => $order->customer->email,
                'phone' => $order->customer->phone,
                'device_hash' => $order->customer->device_hash,
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformOrderDetail(Order $order): array
    {
        return array_merge($this->transformOrderSummary($order), [
            'acknowledged_at' => $order->acknowledged_at?->toISOString(),
            'dispatched_at' => $order->dispatched_at?->toISOString(),
            'in_transit_at' => $order->in_transit_at?->toISOString(),
            'delivered_at' => $order->delivered_at?->toISOString(),
            'cancelled_at' => $order->cancelled_at?->toISOString(),
            'metadata_json' => $order->metadata_json,
            'items' => $order->items
                ->map(fn (OrderItem $item): array => [
                    'id' => $item->id,
                    'item_type' => $item->item_type,
                    'product_id' => $item->product_id,
                    'snapshot_external_id' => $item->snapshot_external_id,
                    'snapshot_title' => $item->snapshot_title,
                    'snapshot_sku' => $item->snapshot_sku,
                    'snapshot_category_name' => $item->snapshot_category_name,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total_price' => (float) $item->total_price,
                    'metadata_json' => $item->metadata_json,
                ])
                ->values()
                ->all(),
            'dispatch_assignments' => $order->dispatchAssignments
                ->map(fn (DispatchAssignment $assignment): array => [
                    'id' => $assignment->id,
                    'provider_id' => $assignment->provider_id,
                    'status' => $assignment->status,
                    'attempt_no' => $assignment->attempt_no,
                    'assigned_at' => $assignment->assigned_at?->toISOString(),
                    'ack_deadline_at' => $assignment->ack_deadline_at?->toISOString(),
                    'acknowledged_at' => $assignment->acknowledged_at?->toISOString(),
                    'rejected_at' => $assignment->rejected_at?->toISOString(),
                    'timed_out_at' => $assignment->timed_out_at?->toISOString(),
                    'completed_at' => $assignment->completed_at?->toISOString(),
                    'notes' => $assignment->notes,
                    'metadata_json' => $assignment->metadata_json,
                    'provider' => $assignment->provider ? [
                        'id' => $assignment->provider->id,
                        'display_name' => $assignment->provider->display_name,
                    ] : null,
                    'assigned_by' => $assignment->assignedBy ? [
                        'id' => $assignment->assignedBy->id,
                        'name' => $assignment->assignedBy->name,
                        'email' => $assignment->assignedBy->email,
                    ] : null,
                ])
                ->values()
                ->all(),
            'notifications' => $order->notifications
                ->map(fn (ProviderNotification $notification): array => [
                    'id' => $notification->id,
                    'provider_id' => $notification->provider_id,
                    'dispatch_assignment_id' => $notification->dispatch_assignment_id,
                    'channel' => $notification->channel,
                    'attempt_no' => $notification->attempt_no,
                    'status' => $notification->status,
                    'sent_at' => $notification->sent_at?->toISOString(),
                    'acknowledged_at' => $notification->acknowledged_at?->toISOString(),
                    'failed_at' => $notification->failed_at?->toISOString(),
                    'external_reference' => $notification->external_reference,
                    'payload_hash' => $notification->payload_hash,
                    'response_payload' => $notification->response_payload,
                    'metadata_json' => $notification->metadata_json,
                    'provider' => $notification->provider ? [
                        'id' => $notification->provider->id,
                        'display_name' => $notification->provider->display_name,
                    ] : null,
                ])
                ->values()
                ->all(),
            'events' => $order->events
                ->sortBy(fn (OrderEvent $event) => $event->happened_at?->timestamp ?? $event->created_at?->timestamp ?? 0)
                ->values()
                ->map(fn (OrderEvent $event): array => [
                    'id' => $event->id,
                    'event_type' => $event->event_type,
                    'from_status' => $event->from_status,
                    'to_status' => $event->to_status,
                    'happened_at' => $event->happened_at?->toISOString(),
                    'notes' => $event->notes,
                    'metadata_json' => $event->metadata_json,
                    'actor_user' => $event->actorUser ? [
                        'id' => $event->actorUser->id,
                        'name' => $event->actorUser->name,
                        'email' => $event->actorUser->email,
                    ] : null,
                ])
                ->all(),
        ]);
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

    private function deliveryPointSelectExpression(): string
    {
        if (DB::getDriverName() !== 'pgsql') {
            return 'NULL as delivery_point_geojson';
        }

        return 'CASE WHEN orders.delivery_point IS NULL THEN NULL ELSE ST_AsGeoJSON(orders.delivery_point) END as delivery_point_geojson';
    }
}
