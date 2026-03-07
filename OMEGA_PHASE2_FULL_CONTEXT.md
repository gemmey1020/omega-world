# OMEGA Phase 2 Full Context

## Snapshot Metadata

Generated on March 7, 2026.

Current stack snapshot from the repository state: Laravel 12.x headless API on PostgreSQL 16 + PostGIS 3.4, with Next.js 16.1.6, React 19.2.3, Tailwind 4.x, and a pnpm workspace layout.

This document is a repository snapshot for external AI audit of the current Phase 2 dispatch implementation.

Code blocks are verbatim from the current working tree unless a block or paragraph is explicitly labeled explanatory.

## Runtime and Workspace Dependencies

The current repository state matches the OMEGA system contract: Laravel 12.x on PostgreSQL/PostGIS for the backend, with Next.js 16.1.6 and React 19.2.3 on the frontend. The workspace is managed with pnpm, and there is no root `package.json`; package boundaries are defined only by `pnpm-workspace.yaml`.

Detected package/runtime versions in the current working tree:

- Next.js `16.1.6`
- React `19.2.3`
- Tailwind CSS `4.2.1`
- pnpm `10.30.1`

### pnpm Workspace

```yaml
packages:
  - api
  - client
  - admin
```

### Admin Package Manifest

```json
{
  "name": "omega-command-center",
  "version": "1.0.0",
  "description": "OMEGA Command Center - Admin Dashboard",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@radix-ui/react-icons": "^1.3.0",
    "@tanstack/react-virtual": "^3.13.12",
    "clsx": "^2.0.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "tailwind-merge": "^2.0.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.1",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^4.2.1"
  }
}
```

### Client Package Manifest

```json
{
  "name": "client",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "framer-motion": "^12.35.0",
    "lucide-react": "^0.577.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.1",
    "@types/js-cookie": "^3.0.6",
    "@types/node": "^20.19.37",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "babel-plugin-react-compiler": "1.0.0",
    "eslint": "^9.39.3",
    "eslint-config-next": "16.1.6",
    "js-cookie": "^3.0.5",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.9.3"
  }
}
```

## Backend Schema

`dispatch_assignments` final shape is split across a create migration plus an alter migration, `order_events` indexing is also extended in that later alter migration, and the final backstop against duplicate active assignments is a PostgreSQL partial unique index.

```sql
CREATE UNIQUE INDEX dispatch_assignments_pending_ack_unique
ON dispatch_assignments (order_id)
WHERE status = 'pending_ack';
```

### `sla_profiles`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sla_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('type');
            $table->unsignedInteger('time_to_ack_minutes');
            $table->unsignedInteger('time_to_dispatch_minutes');
            $table->unsignedInteger('time_to_deliver_minutes');
            $table->jsonb('metadata_json')->nullable();
            $table->timestamps();

            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sla_profiles');
    }
};
```

### `orders`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->string('kind');
            $table->string('source_channel');
            $table->foreignId('customer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('zones')->nullOnDelete();
            $table->foreignId('provider_id')->nullable()->constrained('providers')->nullOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->string('status');
            $table->timestamp('received_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('in_transit_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->char('currency', 3)->default('EGP');
            $table->geometry('delivery_point', 'point', 4326)->nullable();
            $table->timestamp('sla_dispatch_by')->nullable();
            $table->timestamp('sla_delivery_by')->nullable();
            $table->boolean('needs_manual_intervention')->default(false);
            $table->string('escalation_state')->nullable();
            $table->jsonb('metadata_json')->nullable();
            $table->timestamps();

            $table->index(['status', 'received_at']);
            $table->index(['provider_id', 'status']);
            $table->index(['zone_id', 'status']);
            $table->index('customer_user_id');
            $table->spatialIndex('delivery_point');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
```

### `dispatch_assignments` Create Migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('dispatch_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $table->string('status');
            $table->unsignedSmallInteger('attempt_no')->default(1);
            $table->foreignId('assigned_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('timed_out_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->jsonb('metadata_json')->nullable();
            $table->timestamps();

            $table->unique(['order_id', 'attempt_no']);
            $table->index(['order_id', 'status']);
            $table->index(['provider_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dispatch_assignments');
    }
};
```

### `dispatch_assignments` Alter Migration and `order_events` Index Extension

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('dispatch_assignments', function (Blueprint $table) {
            $table->timestamp('ack_deadline_at')->nullable()->after('assigned_at');
            $table->index(['status', 'ack_deadline_at']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement(
                "CREATE UNIQUE INDEX dispatch_assignments_pending_ack_unique
                ON dispatch_assignments (order_id)
                WHERE status = 'pending_ack'"
            );
        }

        Schema::table('order_events', function (Blueprint $table) {
            $table->index(['order_id', 'event_type', 'dispatch_assignment_id'], 'order_events_order_event_assignment_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_events', function (Blueprint $table) {
            $table->dropIndex('order_events_order_event_assignment_idx');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS dispatch_assignments_pending_ack_unique');
        }

        Schema::table('dispatch_assignments', function (Blueprint $table) {
            $table->dropIndex(['status', 'ack_deadline_at']);
            $table->dropColumn('ack_deadline_at');
        });
    }
};
```

### `order_events`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('dispatch_assignment_id')->nullable()->constrained('dispatch_assignments')->nullOnDelete();
            $table->string('event_type');
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->timestamp('happened_at')->nullable();
            $table->text('notes')->nullable();
            $table->jsonb('metadata_json')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'happened_at']);
            $table->index(['event_type', 'happened_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_events');
    }
};
```

## Supporting SLA Wiring

SLA resolution order in the live implementation is `provider.sla_profile_id -> zone.default_sla_profile_id -> hardcoded retail/service default`.

### `zones.default_sla_profile_id`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->foreignId('default_sla_profile_id')
                ->nullable()
                ->after('coordinates')
                ->constrained('sla_profiles')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->dropConstrainedForeignId('default_sla_profile_id');
        });
    }
};
```

### `providers.sla_profile_id` Foreign Key

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('providers', function (Blueprint $table) {
            $table->foreign('sla_profile_id')
                ->references('id')
                ->on('sla_profiles')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('providers', function (Blueprint $table) {
            $table->dropForeign(['sla_profile_id']);
        });
    }
};
```

## Core Dispatch Services

This is the authoritative Phase 2 dispatch engine. All mutating entrypoints use `DB::transaction()`, and every mutation path locks the order row before any assignment row.

### `OrderDispatchService.php`

```php
<?php

namespace App\Services\Dispatch;

use App\Exceptions\DispatchStateException;
use App\Models\DispatchAssignment;
use App\Models\Order;
use App\Models\Provider;
use App\Models\ProviderNotification;
use App\Models\SlaProfile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class OrderDispatchService
{
    private const MAX_ASSIGNMENT_ATTEMPTS = 3;

    public function __construct(
        private readonly SlaResolver $slaResolver,
        private readonly OrderEventRecorder $eventRecorder,
        private readonly EscalationService $escalationService,
    ) {
    }

    public function assignNewOrder(int $orderId, ?int $actorUserId = null, bool $alreadyInTransaction = false): Order
    {
        $callback = function () use ($orderId, $actorUserId): Order {
            $order = $this->lockOrder($orderId);

            if ($order->status !== Order::STATUS_RECEIVED) {
                throw $this->conflict($order, 'Order is not in the received state.');
            }

            $provider = $this->selectProviderForAttempt($order, collect());

            if ($provider === null) {
                throw $this->conflict($order, 'No eligible provider is available for assignment.');
            }

            $profile = $this->slaResolver->resolveForOrder($order, $provider);
            $this->createPendingAssignment(
                $order,
                $provider,
                $profile,
                1,
                $actorUserId,
                null,
                'system.assign',
                now(),
            );

            return $order->fresh(['latestDispatchAssignment']);
        };

        return $alreadyInTransaction ? $callback() : DB::transaction($callback);
    }

    public function acceptAssignment(int $assignmentId): Order
    {
        return DB::transaction(function () use ($assignmentId): Order {
            $assignment = DispatchAssignment::query()->findOrFail($assignmentId);
            $order = $this->lockOrder((int) $assignment->order_id);
            $assignment = $this->lockAssignment($assignmentId);

            if ($order->status !== Order::STATUS_AWAITING_PROVIDER_ACK || $assignment->status !== DispatchAssignment::STATUS_PENDING_ACK) {
                throw $this->conflict($order, 'Assignment can no longer be acknowledged.', $assignment);
            }

            $now = now();

            $assignment->forceFill([
                'status' => DispatchAssignment::STATUS_ACCEPTED,
                'acknowledged_at' => $now,
            ])->save();

            $fromStatus = $order->status;

            $order->forceFill([
                'status' => Order::STATUS_DISPATCHED,
                'acknowledged_at' => $now,
                'escalation_state' => null,
            ])->save();

            $this->escalationService->acknowledgeNotifications($assignment, $now);

            $this->eventRecorder->record(
                $order,
                'order.acknowledged',
                $fromStatus,
                Order::STATUS_DISPATCHED,
                [
                    'assignment_id' => $assignment->id,
                    'ack_latency_seconds' => $this->diffInSeconds($assignment->assigned_at, $now),
                ],
                null,
                $assignment,
                $now,
                'Provider acknowledged the dispatch assignment.',
            );

            return $order->fresh(['latestDispatchAssignment']);
        });
    }

    public function markInTransit(int $orderId, ?int $actorUserId = null): Order
    {
        return DB::transaction(function () use ($orderId, $actorUserId): Order {
            $order = $this->lockOrder($orderId);

            if ($order->status !== Order::STATUS_DISPATCHED) {
                throw $this->conflict($order, 'Only dispatched orders can be moved to in transit.');
            }

            $assignment = $this->lockLatestAcceptedAssignment($order);
            $now = now();
            $fromStatus = $order->status;

            $order->forceFill([
                'status' => Order::STATUS_IN_TRANSIT,
                'dispatched_at' => $now,
                'in_transit_at' => $now,
            ])->save();

            $this->eventRecorder->record(
                $order,
                'order.dispatched',
                $fromStatus,
                Order::STATUS_IN_TRANSIT,
                [
                    'assignment_id' => $assignment->id,
                    'dispatch_latency_seconds' => $this->diffInSeconds($order->acknowledged_at, $now),
                ],
                $actorUserId,
                $assignment,
                $now,
                'Admin marked the order as in transit.',
            );

            return $order->fresh(['latestDispatchAssignment']);
        });
    }

    public function markDelivered(int $orderId, ?int $actorUserId = null): Order
    {
        return DB::transaction(function () use ($orderId, $actorUserId): Order {
            $order = $this->lockOrder($orderId);

            if ($order->status !== Order::STATUS_IN_TRANSIT) {
                throw $this->conflict($order, 'Only in-transit orders can be delivered.');
            }

            $assignment = $this->lockLatestAcceptedAssignment($order);
            $now = now();
            $fromStatus = $order->status;

            $order->forceFill([
                'status' => Order::STATUS_DELIVERED,
                'delivered_at' => $now,
            ])->save();

            $assignment->forceFill([
                'status' => DispatchAssignment::STATUS_COMPLETED,
                'completed_at' => $now,
            ])->save();

            $this->eventRecorder->record(
                $order,
                'order.delivered',
                $fromStatus,
                Order::STATUS_DELIVERED,
                [
                    'assignment_id' => $assignment->id,
                    'delivery_latency_seconds' => $this->diffInSeconds($order->dispatched_at, $now),
                    'total_elapsed_seconds' => $this->diffInSeconds($order->received_at, $now),
                ],
                $actorUserId,
                $assignment,
                $now,
                'Admin marked the order as delivered.',
            );

            return $order->fresh(['latestDispatchAssignment']);
        });
    }

    public function processSlaBreachesForOrder(int $orderId, ?Carbon $referenceTime = null): void
    {
        DB::transaction(function () use ($orderId, $referenceTime): void {
            $order = $this->lockOrder($orderId);
            $referenceTime ??= now();

            if ($order->status === Order::STATUS_AWAITING_PROVIDER_ACK) {
                $assignment = $this->lockPendingAssignment($order);

                if ($assignment !== null) {
                    $this->processPendingAssignment($order, $assignment, $referenceTime);
                }

                return;
            }

            if ($order->status === Order::STATUS_DISPATCHED && $order->sla_dispatch_by !== null && $order->sla_dispatch_by->lt($referenceTime)) {
                $assignment = $this->lockLatestAcceptedAssignment($order, false);
                $this->recordSlaBreach($order, 'dispatch', $order->sla_dispatch_by, $referenceTime, $assignment);

                return;
            }

            if ($order->status === Order::STATUS_IN_TRANSIT && $order->sla_delivery_by !== null && $order->sla_delivery_by->lt($referenceTime)) {
                $assignment = $this->lockLatestAcceptedAssignment($order, false);
                $this->recordSlaBreach($order, 'delivery', $order->sla_delivery_by, $referenceTime, $assignment);
            }
        });
    }

    private function processPendingAssignment(Order $order, DispatchAssignment $assignment, Carbon $referenceTime): void
    {
        if ($assignment->ack_deadline_at === null || ! $assignment->ack_deadline_at->lte($referenceTime)) {
            return;
        }

        $this->recordSlaBreach($order, 'ack', $assignment->ack_deadline_at, $referenceTime, $assignment);

        if ($order->escalation_state === null) {
            $order->forceFill([
                'escalation_state' => Order::ESCALATION_WHATSAPP,
            ])->save();
        }

        $smsAt = $assignment->ack_deadline_at->copy()->addMinutes(5);

        if ($smsAt->lte($referenceTime)) {
            $notification = $this->escalationService->createEscalationNotification(
                $order,
                $assignment,
                ProviderNotification::CHANNEL_SMS,
                2,
                $referenceTime,
            );

            if ($notification !== null) {
                $order->forceFill(['escalation_state' => Order::ESCALATION_SMS])->save();

                $this->eventRecorder->record(
                    $order,
                    'order.escalated',
                    null,
                    null,
                    [
                        'assignment_id' => $assignment->id,
                        'escalation_step' => 2,
                        'channel' => ProviderNotification::CHANNEL_SMS,
                        'sent_at' => $referenceTime->toISOString(),
                    ],
                    null,
                    $assignment,
                    $referenceTime,
                    'Dispatch escalation advanced to SMS.',
                );
            }
        }

        $phoneAt = $assignment->ack_deadline_at->copy()->addMinutes(10);

        if ($phoneAt->lte($referenceTime)) {
            $notification = $this->escalationService->createEscalationNotification(
                $order,
                $assignment,
                ProviderNotification::CHANNEL_PHONE,
                3,
                $referenceTime,
            );

            if ($notification !== null) {
                $order->forceFill(['escalation_state' => Order::ESCALATION_PHONE])->save();

                $this->eventRecorder->record(
                    $order,
                    'order.escalated',
                    null,
                    null,
                    [
                        'assignment_id' => $assignment->id,
                        'escalation_step' => 3,
                        'channel' => ProviderNotification::CHANNEL_PHONE,
                        'sent_at' => $referenceTime->toISOString(),
                    ],
                    null,
                    $assignment,
                    $referenceTime,
                    'Dispatch escalation advanced to phone outreach.',
                );
            }
        }

        $timeoutAt = $assignment->ack_deadline_at->copy()->addMinutes(15);

        if ($timeoutAt->lte($referenceTime)) {
            $this->timeoutAssignment($order, $assignment, $referenceTime);
        }
    }

    private function timeoutAssignment(Order $order, DispatchAssignment $assignment, Carbon $referenceTime): void
    {
        if ($assignment->status !== DispatchAssignment::STATUS_PENDING_ACK) {
            return;
        }

        $assignment->forceFill([
            'status' => DispatchAssignment::STATUS_TIMED_OUT,
            'timed_out_at' => $referenceTime,
        ])->save();

        $this->eventRecorder->record(
            $order,
            'assignment.timed_out',
            null,
            null,
            [
                'assignment_id' => $assignment->id,
                'ack_deadline' => $assignment->ack_deadline_at?->toISOString(),
                'elapsed_seconds' => $this->diffInSeconds($assignment->assigned_at, $referenceTime),
            ],
            null,
            $assignment,
            $referenceTime,
            'Dispatch assignment timed out waiting for provider acknowledgment.',
        );

        if ($assignment->attempt_no >= self::MAX_ASSIGNMENT_ATTEMPTS) {
            $this->moveToManualIntervention($order, $assignment, 'Dispatch attempts exhausted.', $assignment->attempt_no, $referenceTime);

            return;
        }

        $usedProviderIds = DispatchAssignment::query()
            ->where('order_id', $order->id)
            ->pluck('provider_id');

        $provider = $this->selectProviderForAttempt($order, $usedProviderIds);

        if ($provider === null) {
            $this->moveToManualIntervention($order, $assignment, 'No eligible provider is available for reassignment.', $assignment->attempt_no, $referenceTime);

            return;
        }

        $profile = $this->slaResolver->resolveForOrder($order, $provider);

        $this->createPendingAssignment(
            $order,
            $provider,
            $profile,
            $assignment->attempt_no + 1,
            null,
            $assignment,
            'assignment.timed_out',
            $referenceTime,
        );
    }

    private function moveToManualIntervention(
        Order $order,
        DispatchAssignment $assignment,
        string $reason,
        int $attemptCount,
        Carbon $referenceTime,
    ): void {
        $fromStatus = $order->status;
        $lastChannel = $order->escalation_state;

        $order->forceFill([
            'status' => Order::STATUS_MANUAL_INTERVENTION_REQUIRED,
            'needs_manual_intervention' => true,
            'escalation_state' => Order::ESCALATION_MANUAL,
        ])->save();

        $this->eventRecorder->record(
            $order,
            'order.manual_intervention',
            $fromStatus,
            Order::STATUS_MANUAL_INTERVENTION_REQUIRED,
            [
                'reason' => $reason,
                'exhausted_attempts' => $attemptCount,
                'last_channel' => $lastChannel,
            ],
            null,
            $assignment,
            $referenceTime,
            'Order requires manual dispatch intervention.',
        );
    }

    private function recordSlaBreach(
        Order $order,
        string $breachType,
        Carbon $deadline,
        Carbon $referenceTime,
        ?DispatchAssignment $assignment = null,
    ): void {
        $deadlineString = $deadline->toISOString();

        if ($this->eventRecorder->slaBreachExists($order, $breachType, $deadlineString, $assignment)) {
            return;
        }

        $this->eventRecorder->record(
            $order,
            'order.sla_breached',
            null,
            null,
            [
                'breach_type' => $breachType,
                'deadline' => $deadlineString,
                'breached_by_seconds' => $deadline->diffInSeconds($referenceTime),
            ],
            null,
            $assignment,
            $referenceTime,
            'Order exceeded its SLA threshold.',
        );
    }

    private function createPendingAssignment(
        Order $order,
        Provider $provider,
        SlaProfile $profile,
        int $attemptNo,
        ?int $actorUserId,
        ?DispatchAssignment $previousAssignment,
        string $reason,
        Carbon $referenceTime,
    ): DispatchAssignment {
        $ackDeadline = $this->slaResolver->calculateAckDeadline($referenceTime, $profile);
        $fromStatus = $order->status;

        $assignment = DispatchAssignment::query()->create([
            'order_id' => $order->id,
            'provider_id' => $provider->id,
            'status' => DispatchAssignment::STATUS_PENDING_ACK,
            'attempt_no' => $attemptNo,
            'assigned_by_user_id' => $actorUserId,
            'assigned_at' => $referenceTime,
            'ack_deadline_at' => $ackDeadline,
            'metadata_json' => [
                'sla_profile_id' => $profile->id,
            ],
        ]);

        $order->forceFill([
            'provider_id' => $provider->id,
            'status' => Order::STATUS_AWAITING_PROVIDER_ACK,
            'needs_manual_intervention' => false,
            'escalation_state' => null,
            'sla_dispatch_by' => $this->slaResolver->calculateDispatchDeadline($order->received_at ?? $referenceTime, $profile),
            'sla_delivery_by' => $this->slaResolver->calculateDeliveryDeadline($order->received_at ?? $referenceTime, $profile),
        ])->save();

        $this->eventRecorder->record(
            $order,
            'assignment.created',
            null,
            null,
            [
                'assignment_id' => $assignment->id,
                'provider_id' => $provider->id,
                'attempt_no' => $attemptNo,
            ],
            $actorUserId,
            $assignment,
            $referenceTime,
            'Dispatch assignment created.',
        );

        if ($previousAssignment === null) {
            $this->eventRecorder->record(
                $order,
                'order.assigned',
                $fromStatus,
                Order::STATUS_AWAITING_PROVIDER_ACK,
                [
                    'assignment_id' => $assignment->id,
                    'provider_id' => $provider->id,
                    'attempt_no' => $attemptNo,
                    'ack_deadline' => $ackDeadline->toISOString(),
                ],
                $actorUserId,
                $assignment,
                $referenceTime,
                'Order assigned to provider and awaiting acknowledgment.',
            );
        } else {
            $this->eventRecorder->record(
                $order,
                'order.reassigned',
                $fromStatus,
                Order::STATUS_AWAITING_PROVIDER_ACK,
                [
                    'prev_assignment_id' => $previousAssignment->id,
                    'new_assignment_id' => $assignment->id,
                    'new_provider_id' => $provider->id,
                    'reason' => $reason,
                ],
                $actorUserId,
                $assignment,
                $referenceTime,
                'Order reassigned to a provider after timeout.',
            );
        }

        $this->escalationService->createInitialWhatsappNotification($order, $assignment, $referenceTime);

        return $assignment;
    }

    private function selectProviderForAttempt(Order $order, Collection $usedProviderIds): ?Provider
    {
        if ($order->kind === Order::KIND_RETAIL) {
            if ($order->provider_id === null) {
                return null;
            }

            return Provider::query()
                ->whereKey($order->provider_id)
                ->where('status', Provider::STATUS_ACTIVE)
                ->lockForUpdate()
                ->first();
        }

        return Provider::query()
            ->where('type', Provider::TYPE_SERVICE_PROVIDER)
            ->where('status', Provider::STATUS_ACTIVE)
            ->where('zone_id', $order->zone_id)
            ->when(
                $usedProviderIds->isNotEmpty(),
                fn (Builder $query) => $query->whereNotIn('id', $usedProviderIds->filter()->unique()->values()->all())
            )
            ->orderBy('id')
            ->lockForUpdate()
            ->first();
    }

    private function lockOrder(int $orderId): Order
    {
        return Order::query()
            ->with([
                'provider.slaProfile',
                'zone.defaultSlaProfile',
                'latestDispatchAssignment',
            ])
            ->lockForUpdate()
            ->findOrFail($orderId);
    }

    private function lockAssignment(int $assignmentId): DispatchAssignment
    {
        return DispatchAssignment::query()
            ->lockForUpdate()
            ->findOrFail($assignmentId);
    }

    private function lockPendingAssignment(Order $order): ?DispatchAssignment
    {
        return DispatchAssignment::query()
            ->where('order_id', $order->id)
            ->where('status', DispatchAssignment::STATUS_PENDING_ACK)
            ->orderByDesc('attempt_no')
            ->lockForUpdate()
            ->first();
    }

    private function lockLatestAcceptedAssignment(Order $order, bool $throwOnMissing = true): ?DispatchAssignment
    {
        $assignment = DispatchAssignment::query()
            ->where('order_id', $order->id)
            ->whereIn('status', [DispatchAssignment::STATUS_ACCEPTED, DispatchAssignment::STATUS_COMPLETED])
            ->orderByDesc('attempt_no')
            ->lockForUpdate()
            ->first();

        if ($assignment === null && $throwOnMissing) {
            throw $this->conflict($order, 'No accepted assignment exists for this order.');
        }

        return $assignment;
    }

    private function diffInSeconds(?Carbon $from, Carbon $to): int
    {
        if ($from === null) {
            return 0;
        }

        return (int) round($from->diffInSeconds($to));
    }

    private function conflict(Order $order, string $message, ?DispatchAssignment $assignment = null): DispatchStateException
    {
        return new DispatchStateException($message, [
            'order_id' => $order->id,
            'order_status' => $order->status,
            'dispatch_assignment_id' => $assignment?->id,
            'assignment_status' => $assignment?->status,
            'attempt_no' => $assignment?->attempt_no,
        ]);
    }
}
```

### `SlaResolver.php`

```php
<?php

namespace App\Services\Dispatch;

use App\Models\Order;
use App\Models\Provider;
use App\Models\SlaProfile;
use Illuminate\Support\Carbon;
use RuntimeException;

class SlaResolver
{
    public function resolveForOrder(Order $order, ?Provider $provider = null): SlaProfile
    {
        $provider ??= $order->provider;

        if ($provider !== null) {
            $provider->loadMissing('slaProfile');

            if ($provider->slaProfile !== null) {
                return $provider->slaProfile;
            }
        }

        $order->loadMissing('zone.defaultSlaProfile');

        if ($order->zone?->defaultSlaProfile !== null) {
            return $order->zone->defaultSlaProfile;
        }

        return $this->resolveDefaultForKind($order->kind);
    }

    public function resolveDefaultForKind(string $orderKind): SlaProfile
    {
        $type = match ($orderKind) {
            Order::KIND_RETAIL => SlaProfile::TYPE_RETAIL,
            Order::KIND_SERVICE => SlaProfile::TYPE_SERVICE,
            default => throw new RuntimeException("Unsupported order kind [{$orderKind}] for SLA resolution."),
        };

        return SlaProfile::query()
            ->where('type', $type)
            ->orderBy('id')
            ->firstOrFail();
    }

    public function calculateAckDeadline(Carbon $assignedAt, SlaProfile $profile): Carbon
    {
        return $assignedAt->copy()->addMinutes((int) $profile->time_to_ack_minutes);
    }

    public function calculateDispatchDeadline(Carbon $receivedAt, SlaProfile $profile): Carbon
    {
        return $receivedAt->copy()
            ->addMinutes((int) $profile->time_to_ack_minutes)
            ->addMinutes((int) $profile->time_to_dispatch_minutes);
    }

    public function calculateDeliveryDeadline(Carbon $receivedAt, SlaProfile $profile): Carbon
    {
        return $receivedAt->copy()
            ->addMinutes((int) $profile->time_to_ack_minutes)
            ->addMinutes((int) $profile->time_to_dispatch_minutes)
            ->addMinutes((int) $profile->time_to_deliver_minutes);
    }
}
```

### `EscalationService.php`

```php
<?php

namespace App\Services\Dispatch;

use App\Models\DispatchAssignment;
use App\Models\Order;
use App\Models\ProviderNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;

class EscalationService
{
    public function createInitialWhatsappNotification(
        Order $order,
        DispatchAssignment $assignment,
        Carbon $sentAt,
    ): ProviderNotification {
        return $this->storeNotification(
            $order,
            $assignment,
            ProviderNotification::CHANNEL_WHATSAPP,
            $sentAt,
            [
                'accept_url' => $this->buildAcceptUrl($assignment),
                'escalation_step' => 0,
            ],
        );
    }

    public function createEscalationNotification(
        Order $order,
        DispatchAssignment $assignment,
        string $channel,
        int $step,
        Carbon $sentAt,
    ): ?ProviderNotification {
        $existing = ProviderNotification::query()
            ->where('order_id', $order->id)
            ->where('provider_id', $assignment->provider_id)
            ->where('channel', $channel)
            ->where('attempt_no', $assignment->attempt_no)
            ->first();

        if ($existing !== null) {
            return null;
        }

        return $this->storeNotification(
            $order,
            $assignment,
            $channel,
            $sentAt,
            [
                'accept_url' => $this->buildAcceptUrl($assignment),
                'escalation_step' => $step,
            ],
        );
    }

    public function acknowledgeNotifications(DispatchAssignment $assignment, Carbon $acknowledgedAt): void
    {
        ProviderNotification::query()
            ->where('dispatch_assignment_id', $assignment->id)
            ->whereNull('acknowledged_at')
            ->update([
                'status' => ProviderNotification::STATUS_ACKNOWLEDGED,
                'acknowledged_at' => $acknowledgedAt,
            ]);
    }

    public function buildAcceptUrl(DispatchAssignment $assignment): string
    {
        $expiresAt = $assignment->ack_deadline_at?->copy()->addMinutes(15) ?? now()->addMinutes(15);

        return URL::temporarySignedRoute(
            'provider.assignments.accept',
            $expiresAt,
            ['assignment' => $assignment->id]
        );
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function storeNotification(
        Order $order,
        DispatchAssignment $assignment,
        string $channel,
        Carbon $sentAt,
        array $metadata,
    ): ProviderNotification {
        $payloadHash = hash('sha256', json_encode([
            'order_id' => $order->id,
            'provider_id' => $assignment->provider_id,
            'assignment_id' => $assignment->id,
            'channel' => $channel,
            'attempt_no' => $assignment->attempt_no,
            'metadata' => $metadata,
        ], JSON_THROW_ON_ERROR));

        $notification = ProviderNotification::query()->create([
            'order_id' => $order->id,
            'provider_id' => $assignment->provider_id,
            'dispatch_assignment_id' => $assignment->id,
            'channel' => $channel,
            'attempt_no' => $assignment->attempt_no,
            'status' => ProviderNotification::STATUS_SENT,
            'sent_at' => $sentAt,
            'payload_hash' => $payloadHash,
            'metadata_json' => $metadata,
        ]);

        DB::afterCommit(function () use ($order, $assignment, $channel): void {
            Log::info('Dispatch notification queued for provider delivery.', [
                'order_id' => $order->id,
                'dispatch_assignment_id' => $assignment->id,
                'provider_id' => $assignment->provider_id,
                'channel' => $channel,
                'attempt_no' => $assignment->attempt_no,
            ]);
        });

        return $notification;
    }
}
```

## Supporting Dispatch Primitives

`OrderDispatchService` depends directly on the recorder and exception below. They are included verbatim so an external audit can read the dispatch engine as a complete unit.

### `OrderEventRecorder.php`

```php
<?php

namespace App\Services\Dispatch;

use App\Models\DispatchAssignment;
use App\Models\Order;
use App\Models\OrderEvent;
use Illuminate\Support\Carbon;

class OrderEventRecorder
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function record(
        Order $order,
        string $eventType,
        ?string $fromStatus,
        ?string $toStatus,
        array $metadata,
        ?int $actorUserId = null,
        ?DispatchAssignment $assignment = null,
        ?Carbon $happenedAt = null,
        ?string $notes = null,
    ): OrderEvent {
        return OrderEvent::query()->create([
            'order_id' => $order->id,
            'actor_user_id' => $actorUserId,
            'dispatch_assignment_id' => $assignment?->id,
            'event_type' => $eventType,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'happened_at' => $happenedAt ?? now(),
            'notes' => $notes,
            'metadata_json' => $metadata,
        ]);
    }

    public function slaBreachExists(
        Order $order,
        string $breachType,
        string $deadline,
        ?DispatchAssignment $assignment = null,
    ): bool {
        $events = OrderEvent::query()
            ->where('order_id', $order->id)
            ->where('event_type', 'order.sla_breached')
            ->when(
                $assignment !== null,
                fn ($query) => $query->where('dispatch_assignment_id', $assignment->id),
                fn ($query) => $query->whereNull('dispatch_assignment_id')
            )
            ->get(['id', 'metadata_json']);

        foreach ($events as $event) {
            $metadata = is_array($event->metadata_json) ? $event->metadata_json : [];

            if (($metadata['breach_type'] ?? null) === $breachType && ($metadata['deadline'] ?? null) === $deadline) {
                return true;
            }
        }

        return false;
    }
}
```

### `DispatchStateException.php`

```php
<?php

namespace App\Exceptions;

use RuntimeException;

class DispatchStateException extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $message, public readonly array $context = [])
    {
        parent::__construct($message);
    }
}
```

## Phase 2 State Machine

The current Phase 2 implementation uses the order FSM below. `order.sla_breached` and `order.escalated` are event emissions only; they do not change the order status by themselves.

| From Status | To Status | Method / Trigger | Notes |
| --- | --- | --- | --- |
| `received` | `awaiting_provider_ack` | `assignNewOrder()` | Creates attempt `1`, computes deadlines, emits `assignment.created` and `order.assigned`. |
| `awaiting_provider_ack` | `dispatched` | `acceptAssignment()` | Provider acknowledgement arrives through a short-lived signed URL, not a provider auth session. |
| `dispatched` | `in_transit` | `markInTransit()` | Admin-only transition; also sets both `dispatched_at` and `in_transit_at`. |
| `in_transit` | `delivered` | `markDelivered()` | Admin-only transition; completes the accepted assignment. |
| `awaiting_provider_ack` | `awaiting_provider_ack` | `timeoutAssignment()` reassignment path | Same order status is preserved while a new assignment attempt is created. |
| `awaiting_provider_ack` | `manual_intervention_required` | `moveToManualIntervention()` | Used when attempts are exhausted or no eligible provider remains. |

`cancelled` and `failed` exist as model-level order statuses in the live codebase, but the current Phase 2 API surface does not expose routes that move orders into those states.

Assignment states implemented in the live code are `pending_ack`, `accepted`, `rejected`, `timed_out`, `cancelled`, and `completed`. In the current Phase 2 slice, `pending_ack`, `accepted`, `timed_out`, and `completed` are exercised directly by the dispatch engine; `rejected` and `cancelled` are reserved by the model but not surfaced by current public/admin routes.

Escalation states implemented on `orders.escalation_state` are `whatsapp`, `sms`, `phone`, and `manual`.

## Concurrency and lockForUpdate Map

The live implementation applies the same lock discipline throughout the dispatch engine: lock the order row first, then lock the relevant assignment row, and use provider-row locking during provider selection so concurrent sweeps cannot select or reassign the same provider path blindly.

| Method | Transaction Boundary | `lockForUpdate()` Order | Purpose |
| --- | --- | --- | --- |
| `assignNewOrder()` | `DB::transaction()` unless already in a caller transaction | `lockOrder()` first, then `selectProviderForAttempt()` on provider query | Prevents duplicate initial assignment and ensures the order is still `received`. |
| `acceptAssignment()` | `DB::transaction()` | Finds assignment ID, then `lockOrder()`, then `lockAssignment()` | Ensures provider acceptance cannot race another accept or admin mutation. |
| `markInTransit()` | `DB::transaction()` | `lockOrder()`, then `lockLatestAcceptedAssignment()` | Prevents status skips and guarantees the accepted assignment is stable. |
| `markDelivered()` | `DB::transaction()` | `lockOrder()`, then `lockLatestAcceptedAssignment()` | Ensures delivery completion and assignment completion happen atomically. |
| `processSlaBreachesForOrder()` | `DB::transaction()` | `lockOrder()`, then either `lockPendingAssignment()` or `lockLatestAcceptedAssignment()` | Makes SLA breach emission, escalation, timeout, and reassignment idempotent under scheduler overlap. |
| `selectProviderForAttempt()` | Runs inside the caller transaction | Provider query itself uses `lockForUpdate()` | Prevents concurrent reassignment/provider-selection races, especially for service-provider rotation. |

The PostgreSQL partial unique index remains the final backstop against duplicate active assignments:

```sql
CREATE UNIQUE INDEX dispatch_assignments_pending_ack_unique
ON dispatch_assignments (order_id)
WHERE status = 'pending_ack';
```

This means the service layer relies on both pessimistic row locking and a structural database invariant. If two writers race anyway, the unique index prevents more than one `pending_ack` assignment from surviving for the same order.

## API Surface

The relevant Phase 2 route definitions below are copied verbatim from `api/routes/api.php`, including middleware context for signed provider acceptance and admin write actions.

```php
<?php

use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\ProviderController as AdminProviderController;
use App\Http\Controllers\Api\CheckoutOrderController;
use App\Http\Controllers\Api\JoinLeadController;
use App\Http\Controllers\Api\CartTokenController;
use App\Http\Controllers\Api\ProviderAssignmentController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\ZoneController;
use Illuminate\Support\Facades\Route;

$adminRoleMiddleware = 'role:super_admin|ops_dispatcher|support_analyst|catalog_manager|merchant_success,admin';

Route::get('/zones', [ZoneController::class, 'index'])
    ->middleware('throttle:zones');

Route::get('/join/session', [JoinLeadController::class, 'session'])
    ->middleware('throttle:join-session');

Route::post('/join/lead', [JoinLeadController::class, 'store'])
    ->middleware('throttle:join-submit');

Route::post('/cart/token', [CartTokenController::class, 'store'])
    ->middleware('throttle:cart-token-store');

Route::get('/cart/token/{token}', [CartTokenController::class, 'resolve'])
    ->middleware('throttle:cart-token-resolve');

Route::get('/vendors', [VendorController::class, 'index'])
    ->middleware('throttle:vendors');

Route::get('/vendors/{id}/catalog', [VendorController::class, 'catalog'])
    ->whereNumber('id')
    ->middleware('throttle:catalog');

Route::post('/checkout/orders', [CheckoutOrderController::class, 'store'])
    ->middleware('throttle:checkout-orders');

Route::post('/provider/assignments/{assignment}/accept', [ProviderAssignmentController::class, 'accept'])
    ->whereNumber('assignment')
    ->middleware('signed')
    ->name('provider.assignments.accept');

Route::prefix('admin')->group(function () use ($adminRoleMiddleware): void {
    Route::prefix('auth')->group(function (): void {
        Route::post('/login', [AdminAuthController::class, 'login'])
            ->middleware('throttle:admin-auth');
    });

    Route::middleware(['auth:admin', $adminRoleMiddleware])->group(function (): void {
        Route::prefix('auth')->group(function (): void {
            Route::post('/logout', [AdminAuthController::class, 'logout'])
                ->middleware('throttle:admin-write');

            Route::get('/me', [AdminAuthController::class, 'me'])
                ->middleware('throttle:admin-read');
        });

        Route::middleware('throttle:admin-read')->group(function (): void {
            Route::get('/providers', [AdminProviderController::class, 'index']);
            Route::get('/providers/{provider}', [AdminProviderController::class, 'show']);
            Route::get('/orders', [AdminOrderController::class, 'index']);
            Route::get('/orders/{order}', [AdminOrderController::class, 'show']);
            Route::get('/customers', [AdminCustomerController::class, 'index']);
            Route::get('/customers/{user}', [AdminCustomerController::class, 'show']);
        });

        Route::middleware('throttle:admin-write')->group(function (): void {
            Route::post('/providers', [AdminProviderController::class, 'store']);
            Route::patch('/providers/{provider}', [AdminProviderController::class, 'update']);
            Route::post('/orders/{order}/mark-in-transit', [AdminOrderController::class, 'markInTransit']);
            Route::post('/orders/{order}/mark-delivered', [AdminOrderController::class, 'markDelivered']);
        });
    });
});
```

Provider acceptance is guarded by the `signed` middleware. Admin dispatch actions live under `auth:admin`, the shared role middleware, and `throttle:admin-write`.

## Scheduler and SLA Sweep

The scheduler sweep is implemented by a unique queue job and registered in the console schedule once per minute.

### `CheckSlaBreachesJob.php`

```php
<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\Dispatch\OrderDispatchService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class CheckSlaBreachesJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $uniqueFor = 55;

    public function uniqueId(): string
    {
        return 'dispatch-sla-breaches';
    }

    public function handle(OrderDispatchService $orderDispatchService): void
    {
        Order::query()
            ->whereIn('status', [
                Order::STATUS_AWAITING_PROVIDER_ACK,
                Order::STATUS_DISPATCHED,
                Order::STATUS_IN_TRANSIT,
            ])
            ->orderBy('id')
            ->chunkById(100, function ($orders) use ($orderDispatchService): void {
                foreach ($orders as $order) {
                    $orderDispatchService->processSlaBreachesForOrder($order->id);
                }
            });
    }
}
```

### `api/routes/console.php`

```php
<?php

use App\Jobs\CheckSlaBreachesJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new CheckSlaBreachesJob())
    ->everyMinute()
    ->withoutOverlapping();
```

- Frequency is once per minute.
- Job uniqueness window is `55` seconds via `public int $uniqueFor = 55;`.
- The scheduler adds `withoutOverlapping()` on top of queue uniqueness.
- The sweep scans `awaiting_provider_ack`, `dispatched`, and `in_transit` orders in `chunkById(100)`.

## Architectural Decisions

- Hybrid reassignment is explicit in `selectProviderForAttempt()`: retail merchant orders stay on the merchant-linked provider already attached to the order, while service orders pick the next active same-zone `service_provider` not already tried, ordered by `id`.
- SLA resolution order is explicit in `SlaResolver`: `provider.sla_profile_id -> zone.default_sla_profile_id -> hardcoded retail/service default`.
- Escalation ladder is explicit in `processPendingAssignment()`: initial WhatsApp notification at assignment creation, SMS at `ack_deadline + 5m`, phone at `ack_deadline + 10m`, and manual intervention or reassignment at `ack_deadline + 15m`.
- Event idempotency is explicit in `recordSlaBreach()`: the engine checks `order_events` through `OrderEventRecorder::slaBreachExists()` before creating another `order.sla_breached` record for the same `(breach_type, deadline, dispatch_assignment_id)` tuple.
- Notification idempotency is explicit in `EscalationService::createEscalationNotification()`: the dedupe key is `{order_id, provider_id, channel, attempt_no}`, matching the stored notification rows and preventing duplicate SMS or phone steps per attempt.
- Post-commit side effects are explicit in `EscalationService::storeNotification()`: notifications are persisted inside the transaction, but outbound/log transport is deferred with `DB::afterCommit()`.
- Timing semantics are explicit in the state engine: provider acceptance moves the order into `dispatched`, while the later admin `markInTransit()` action sets both `dispatched_at` and `in_transit_at` at the same timestamp. This is a deliberate implementation choice in the current Phase 2 code.

## Audit Notes

- Current Phase 2 scope is backend-first: the dispatch FSM, SLA engine, escalations, and event logging are implemented server-side.
- No third-party WhatsApp, SMS, or voice transport is wired in this slice. Notifications are persisted in the database and logged post-commit as the integration seam.
- This document is intentionally self-contained so an external AI auditor can inspect the Phase 2 dispatch nervous system without repository access.
- Topics not covered here are outside the current Phase 2 dispatch scope, not omitted accidentally.
