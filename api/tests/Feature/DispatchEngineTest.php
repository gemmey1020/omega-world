<?php

namespace Tests\Feature;

use App\Models\DispatchAssignment;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Provider;
use App\Models\ProviderNotification;
use App\Models\SlaProfile;
use App\Models\User;
use App\Services\Dispatch\EscalationService;
use App\Services\Dispatch\OrderDispatchService;
use App\Services\Dispatch\OrderEventRecorder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Middleware\RoleMiddleware;
use Tests\TestCase;

class DispatchEngineTest extends TestCase
{
    private bool $databaseAvailable = false;

    protected function setUp(): void
    {
        parent::setUp();

        if (! in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('pdo_sqlite is not available in this environment.');
        }

        $this->withoutMiddleware(ThrottleRequests::class);
        $this->withoutMiddleware(RoleMiddleware::class);
        config()->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        config()->set('app.url', 'http://localhost');

        $this->createSchema();
        $this->databaseAvailable = true;
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        if ($this->databaseAvailable) {
            foreach ([
                'order_events',
                'provider_notifications',
                'dispatch_assignments',
                'order_items',
                'orders',
                'products',
                'providers',
                'vendors',
                'zones',
                'sla_profiles',
                'users',
            ] as $table) {
                Schema::dropIfExists($table);
            }
        }

        parent::tearDown();
    }

    public function test_assign_new_order_creates_pending_assignment_with_expected_events(): void
    {
        Carbon::setTestNow('2026-03-07 10:00:00');

        $profile = $this->createSlaProfile('Retail', SlaProfile::TYPE_RETAIL, 10, 30, 60);
        $zoneId = $this->createZone($profile->id);
        $provider = $this->createProvider([
            'type' => Provider::TYPE_MERCHANT,
            'zone_id' => $zoneId,
            'sla_profile_id' => $profile->id,
        ]);
        $order = $this->createOrder([
            'kind' => Order::KIND_RETAIL,
            'zone_id' => $zoneId,
            'provider_id' => $provider->id,
            'status' => Order::STATUS_RECEIVED,
            'received_at' => now(),
        ]);

        app(OrderEventRecorder::class)->record(
            $order,
            'order.received',
            null,
            Order::STATUS_RECEIVED,
            [
                'source_channel' => 'pwa',
                'item_count' => 2,
                'total_amount' => 150.50,
            ],
            null,
            null,
            now(),
        );

        app(OrderDispatchService::class)->assignNewOrder($order->id);

        $order->refresh();
        $assignment = DispatchAssignment::query()->firstOrFail();
        $notification = ProviderNotification::query()->firstOrFail();
        $assignedEvent = OrderEvent::query()->where('event_type', 'order.assigned')->firstOrFail();

        $this->assertSame(Order::STATUS_AWAITING_PROVIDER_ACK, $order->status);
        $this->assertSame(DispatchAssignment::STATUS_PENDING_ACK, $assignment->status);
        $this->assertSame(1, $assignment->attempt_no);
        $this->assertSame($provider->id, $assignment->provider_id);
        $this->assertTrue($assignment->ack_deadline_at->equalTo(now()->copy()->addMinutes(10)));
        $this->assertTrue($order->sla_dispatch_by->equalTo(now()->copy()->addMinutes(40)));
        $this->assertTrue($order->sla_delivery_by->equalTo(now()->copy()->addMinutes(100)));
        $this->assertSame(ProviderNotification::CHANNEL_WHATSAPP, $notification->channel);
        $this->assertArrayHasKey('accept_url', $notification->metadata_json ?? []);
        $this->assertSame([
            'assignment_id' => $assignment->id,
            'provider_id' => $provider->id,
            'attempt_no' => 1,
            'ack_deadline' => $assignment->ack_deadline_at?->toISOString(),
        ], $assignedEvent->metadata_json);
        $this->assertDatabaseHas('order_events', ['event_type' => 'assignment.created']);
    }

    public function test_provider_accept_endpoint_transitions_order_and_rejects_duplicate_accepts(): void
    {
        Carbon::setTestNow('2026-03-07 11:00:00');

        $profile = $this->createSlaProfile('Retail', SlaProfile::TYPE_RETAIL, 10, 30, 60);
        $zoneId = $this->createZone($profile->id);
        $provider = $this->createProvider([
            'type' => Provider::TYPE_MERCHANT,
            'zone_id' => $zoneId,
            'sla_profile_id' => $profile->id,
        ]);
        $order = $this->createOrder([
            'kind' => Order::KIND_RETAIL,
            'zone_id' => $zoneId,
            'provider_id' => $provider->id,
            'status' => Order::STATUS_RECEIVED,
            'received_at' => now(),
        ]);

        app(OrderDispatchService::class)->assignNewOrder($order->id);

        $assignment = DispatchAssignment::query()->firstOrFail();
        $signedUrl = app(EscalationService::class)->buildAcceptUrl($assignment);

        $this->postJson($this->relativeSignedUrl($signedUrl))
            ->assertOk()
            ->assertJsonPath('data.order_id', $order->id)
            ->assertJsonPath('data.status', Order::STATUS_DISPATCHED);

        $order->refresh();
        $assignment->refresh();

        $this->assertSame(Order::STATUS_DISPATCHED, $order->status);
        $this->assertSame(DispatchAssignment::STATUS_ACCEPTED, $assignment->status);
        $this->assertNotNull($order->acknowledged_at);
        $this->assertDatabaseHas('order_events', ['event_type' => 'order.acknowledged']);
        $this->assertSame(
            1,
            ProviderNotification::query()
                ->where('dispatch_assignment_id', $assignment->id)
                ->where('status', ProviderNotification::STATUS_ACKNOWLEDGED)
                ->count()
        );

        $this->postJson($this->relativeSignedUrl($signedUrl))
            ->assertStatus(409)
            ->assertJsonPath('current_state.order_status', Order::STATUS_DISPATCHED);
    }

    public function test_provider_accept_url_contains_nonce_and_stale_links_are_rejected(): void
    {
        Carbon::setTestNow('2026-03-07 11:15:00');

        $profile = $this->createSlaProfile('Retail', SlaProfile::TYPE_RETAIL, 10, 30, 60);
        $zoneId = $this->createZone($profile->id);
        $provider = $this->createProvider([
            'type' => Provider::TYPE_MERCHANT,
            'zone_id' => $zoneId,
            'sla_profile_id' => $profile->id,
        ]);
        $order = $this->createOrder([
            'kind' => Order::KIND_RETAIL,
            'zone_id' => $zoneId,
            'provider_id' => $provider->id,
            'status' => Order::STATUS_RECEIVED,
            'received_at' => now(),
        ]);

        app(OrderDispatchService::class)->assignNewOrder($order->id);

        $assignment = DispatchAssignment::query()->firstOrFail();
        $escalationService = app(EscalationService::class);
        $signedUrl = $escalationService->buildAcceptUrl($assignment);
        $query = [];
        parse_str((string) parse_url($signedUrl, PHP_URL_QUERY), $query);

        $this->assertSame($escalationService->assignmentNonce($assignment), $query['nonce'] ?? null);

        Carbon::setTestNow('2026-03-07 11:15:03');
        $assignment->forceFill([
            'notes' => 'nonce invalidated',
        ])->save();

        $this->postJson($this->relativeSignedUrl($signedUrl))
            ->assertStatus(409)
            ->assertJsonPath('message', 'Assignment link is stale.')
            ->assertJsonPath('current_state.assignment_id', $assignment->id)
            ->assertJsonPath('current_state.assignment_status', DispatchAssignment::STATUS_PENDING_ACK)
            ->assertJsonPath('current_state.order_id', $order->id)
            ->assertJsonPath('current_state.order_status', Order::STATUS_AWAITING_PROVIDER_ACK)
            ->assertJsonPath('current_state.nonce_stale', true);
    }

    public function test_admin_dispatch_endpoints_mark_in_transit_and_delivered(): void
    {
        Carbon::setTestNow('2026-03-07 12:00:00');

        $profile = $this->createSlaProfile('Retail', SlaProfile::TYPE_RETAIL, 10, 30, 60);
        $zoneId = $this->createZone($profile->id);
        $provider = $this->createProvider([
            'type' => Provider::TYPE_MERCHANT,
            'zone_id' => $zoneId,
            'sla_profile_id' => $profile->id,
        ]);
        $order = $this->createOrder([
            'kind' => Order::KIND_RETAIL,
            'zone_id' => $zoneId,
            'provider_id' => $provider->id,
            'status' => Order::STATUS_RECEIVED,
            'received_at' => now()->subMinutes(10),
        ]);
        $admin = User::query()->create([
            'name' => 'Dispatch Admin',
            'email' => 'dispatch@example.com',
            'password' => 'secret',
        ]);

        $dispatchService = app(OrderDispatchService::class);
        $dispatchService->assignNewOrder($order->id);
        $dispatchService->acceptAssignment(DispatchAssignment::query()->firstOrFail()->id);

        $this->actingAs($admin, 'admin');

        $this->postJson("/api/admin/orders/{$order->id}/mark-in-transit")
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_IN_TRANSIT);

        $order->refresh();
        $this->assertNotNull($order->dispatched_at);
        $this->assertTrue($order->dispatched_at->equalTo($order->in_transit_at));
        $this->assertDatabaseHas('order_events', ['event_type' => 'order.dispatched']);

        Carbon::setTestNow('2026-03-07 12:30:00');

        $this->postJson("/api/admin/orders/{$order->id}/mark-delivered")
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_DELIVERED);

        $order->refresh();
        $assignment = DispatchAssignment::query()->firstOrFail();

        $this->assertSame(Order::STATUS_DELIVERED, $order->status);
        $this->assertSame(DispatchAssignment::STATUS_COMPLETED, $assignment->refresh()->status);
        $this->assertDatabaseHas('order_events', ['event_type' => 'order.delivered']);
    }

    public function test_retail_timeout_reassigns_same_provider(): void
    {
        Carbon::setTestNow('2026-03-07 13:00:00');

        $profile = $this->createSlaProfile('Retail', SlaProfile::TYPE_RETAIL, 10, 30, 60);
        $zoneId = $this->createZone($profile->id);
        $provider = $this->createProvider([
            'type' => Provider::TYPE_MERCHANT,
            'zone_id' => $zoneId,
            'sla_profile_id' => $profile->id,
        ]);
        $order = $this->createOrder([
            'kind' => Order::KIND_RETAIL,
            'zone_id' => $zoneId,
            'provider_id' => $provider->id,
            'status' => Order::STATUS_RECEIVED,
            'received_at' => now(),
        ]);

        $dispatchService = app(OrderDispatchService::class);
        $dispatchService->assignNewOrder($order->id);

        $firstAssignment = DispatchAssignment::query()->firstOrFail();
        $referenceTime = $firstAssignment->ack_deadline_at->copy()->addMinutes(16);

        $dispatchService->processSlaBreachesForOrder($order->id, $referenceTime);

        $assignments = DispatchAssignment::query()->orderBy('attempt_no')->get();

        $this->assertCount(2, $assignments);
        $this->assertSame(DispatchAssignment::STATUS_TIMED_OUT, $assignments[0]->status);
        $this->assertSame(DispatchAssignment::STATUS_PENDING_ACK, $assignments[1]->status);
        $this->assertSame($provider->id, $assignments[0]->provider_id);
        $this->assertSame($provider->id, $assignments[1]->provider_id);
        $this->assertDatabaseHas('order_events', ['event_type' => 'order.reassigned']);
        $this->assertSame(1, OrderEvent::query()->where('event_type', 'order.sla_breached')->count());
    }

    public function test_service_timeout_rotates_to_next_zone_provider_and_is_idempotent(): void
    {
        Carbon::setTestNow('2026-03-07 14:00:00');

        $profile = $this->createSlaProfile('Service', SlaProfile::TYPE_SERVICE, 15, 45, 120);
        $zoneId = $this->createZone($profile->id);
        $providerA = $this->createProvider([
            'type' => Provider::TYPE_SERVICE_PROVIDER,
            'zone_id' => $zoneId,
            'sla_profile_id' => $profile->id,
            'display_name' => 'Provider A',
        ]);
        $providerB = $this->createProvider([
            'type' => Provider::TYPE_SERVICE_PROVIDER,
            'zone_id' => $zoneId,
            'sla_profile_id' => $profile->id,
            'display_name' => 'Provider B',
        ]);
        $order = $this->createOrder([
            'kind' => Order::KIND_SERVICE,
            'zone_id' => $zoneId,
            'provider_id' => null,
            'status' => Order::STATUS_RECEIVED,
            'received_at' => now(),
        ]);

        $dispatchService = app(OrderDispatchService::class);
        $dispatchService->assignNewOrder($order->id);

        $firstAssignment = DispatchAssignment::query()->firstOrFail();
        $this->assertSame($providerA->id, $firstAssignment->provider_id);

        $referenceTime = $firstAssignment->ack_deadline_at->copy()->addMinutes(11);
        $dispatchService->processSlaBreachesForOrder($order->id, $referenceTime);
        $dispatchService->processSlaBreachesForOrder($order->id, $referenceTime);

        $this->assertSame(1, OrderEvent::query()->where('event_type', 'order.sla_breached')->count());
        $this->assertSame(1, ProviderNotification::query()->where('channel', ProviderNotification::CHANNEL_SMS)->count());
        $this->assertSame(1, ProviderNotification::query()->where('channel', ProviderNotification::CHANNEL_PHONE)->count());

        $timeoutReference = $firstAssignment->ack_deadline_at->copy()->addMinutes(16);
        $dispatchService->processSlaBreachesForOrder($order->id, $timeoutReference);

        $assignments = DispatchAssignment::query()->orderBy('attempt_no')->get();

        $this->assertCount(2, $assignments);
        $this->assertSame(DispatchAssignment::STATUS_TIMED_OUT, $assignments[0]->status);
        $this->assertSame(DispatchAssignment::STATUS_PENDING_ACK, $assignments[1]->status);
        $this->assertSame($providerB->id, $assignments[1]->provider_id);
        $this->assertDatabaseHas('order_events', ['event_type' => 'order.reassigned']);
    }

    private function createSchema(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->string('remember_token')->nullable();
            $table->string('device_hash')->nullable();
            $table->string('phone')->nullable();
            $table->unsignedBigInteger('zone_id')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('sla_profiles', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->unique();
            $table->string('type');
            $table->unsignedInteger('time_to_ack_minutes');
            $table->unsignedInteger('time_to_dispatch_minutes');
            $table->unsignedInteger('time_to_deliver_minutes');
            $table->json('metadata_json')->nullable();
            $table->timestamps();
        });

        Schema::create('zones', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->unsignedBigInteger('default_sla_profile_id')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('vendors', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('zone_id')->nullable();
            $table->unsignedBigInteger('provider_id')->nullable();
            $table->string('name');
            $table->string('whatsapp_number')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('providers', function (Blueprint $table): void {
            $table->id();
            $table->string('type');
            $table->unsignedBigInteger('vendor_id')->nullable();
            $table->unsignedBigInteger('zone_id')->nullable();
            $table->string('display_name');
            $table->string('primary_contact_phone')->nullable();
            $table->string('whatsapp_number')->nullable();
            $table->string('status');
            $table->unsignedBigInteger('sla_profile_id')->nullable();
            $table->unsignedBigInteger('escalation_policy_id')->nullable();
            $table->json('capabilities_json')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->string('order_number')->unique();
            $table->string('kind');
            $table->string('source_channel');
            $table->unsignedBigInteger('customer_user_id')->nullable();
            $table->unsignedBigInteger('zone_id')->nullable();
            $table->unsignedBigInteger('provider_id')->nullable();
            $table->unsignedBigInteger('vendor_id')->nullable();
            $table->string('status');
            $table->timestamp('received_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('in_transit_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->char('currency', 3)->default('EGP');
            $table->timestamp('sla_dispatch_by')->nullable();
            $table->timestamp('sla_delivery_by')->nullable();
            $table->boolean('needs_manual_intervention')->default(false);
            $table->string('escalation_state')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->string('item_type');
            $table->unsignedBigInteger('product_id')->nullable();
            $table->string('snapshot_external_id')->nullable();
            $table->string('snapshot_title')->nullable();
            $table->string('snapshot_sku')->nullable();
            $table->string('snapshot_category_name')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('total_price', 12, 2)->default(0);
            $table->json('metadata_json')->nullable();
            $table->timestamps();
        });

        Schema::create('dispatch_assignments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('provider_id');
            $table->string('status');
            $table->unsignedSmallInteger('attempt_no')->default(1);
            $table->unsignedBigInteger('assigned_by_user_id')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('ack_deadline_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('timed_out_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();
            $table->unique(['order_id', 'attempt_no']);
        });

        Schema::create('provider_notifications', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('provider_id');
            $table->unsignedBigInteger('dispatch_assignment_id')->nullable();
            $table->string('channel');
            $table->unsignedSmallInteger('attempt_no')->default(1);
            $table->string('status');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->string('external_reference')->nullable();
            $table->string('payload_hash')->nullable();
            $table->json('response_payload')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();
            $table->unique(['order_id', 'provider_id', 'channel', 'attempt_no'], 'provider_notifications_dedupe_unique');
        });

        Schema::create('order_events', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('actor_user_id')->nullable();
            $table->unsignedBigInteger('dispatch_assignment_id')->nullable();
            $table->string('event_type');
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->timestamp('happened_at')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();
        });
    }

    private function createSlaProfile(string $name, string $type, int $ack, int $dispatch, int $deliver): SlaProfile
    {
        return SlaProfile::query()->create([
            'name' => $name,
            'type' => $type,
            'time_to_ack_minutes' => $ack,
            'time_to_dispatch_minutes' => $dispatch,
            'time_to_deliver_minutes' => $deliver,
            'metadata_json' => null,
        ]);
    }

    private function createZone(int $defaultSlaProfileId): int
    {
        return (int) \DB::table('zones')->insertGetId([
            'name' => 'Dispatch Zone',
            'default_sla_profile_id' => $defaultSlaProfileId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createProvider(array $overrides = []): Provider
    {
        return Provider::query()->create(array_merge([
            'type' => Provider::TYPE_MERCHANT,
            'vendor_id' => null,
            'zone_id' => null,
            'display_name' => 'Provider',
            'primary_contact_phone' => '201000000000',
            'whatsapp_number' => '201000000000',
            'status' => Provider::STATUS_ACTIVE,
            'sla_profile_id' => null,
            'escalation_policy_id' => null,
            'capabilities_json' => null,
            'metadata_json' => null,
        ], $overrides));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createOrder(array $overrides = []): Order
    {
        static $sequence = 1;

        return Order::query()->create(array_merge([
            'order_number' => sprintf('ORD-20260307-%06d', $sequence++),
            'kind' => Order::KIND_RETAIL,
            'source_channel' => 'pwa',
            'customer_user_id' => null,
            'zone_id' => null,
            'provider_id' => null,
            'vendor_id' => null,
            'status' => Order::STATUS_RECEIVED,
            'received_at' => now(),
            'total_amount' => 150.50,
            'currency' => 'EGP',
            'needs_manual_intervention' => false,
            'escalation_state' => null,
            'metadata_json' => null,
        ], $overrides));
    }

    private function relativeSignedUrl(string $absoluteSignedUrl): string
    {
        $parts = parse_url($absoluteSignedUrl);

        return ($parts['path'] ?? '').(isset($parts['query']) ? '?'.$parts['query'] : '');
    }
}
