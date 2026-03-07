<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Console\ConfirmableTrait;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CleanupPhase15Artifacts extends Command
{
    use ConfirmableTrait;

    /**
     * @var list<string>
     */
    private const EXACT_DEVICE_HASHES = [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        '55555555-5555-4555-8555-555555555555',
        '66666666-6666-4666-8666-666666666666',
    ];

    /**
     * @var list<string>
     */
    private const DEVICE_HASH_PREFIXES = [
        '33333333-3333-4333-8333-%',
        '44444444-4444-4444-8444-%',
    ];

    private const TEMP_ADMIN_EMAIL = 'admin.audit@openai.com';

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'omega:cleanup-phase15-artifacts {--dry-run} {--force}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove Phase 1.5 local audit artifacts and reset the order number sequence';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if (! $dryRun && ! $this->confirmToProceed()) {
            return self::FAILURE;
        }

        $target = $this->buildTargetSet();
        $summary = $this->buildSummary($target);

        $this->components->twoColumnDetail('Temp admin user id', $target['admin_user_id'] !== null ? (string) $target['admin_user_id'] : 'none');
        $this->components->twoColumnDetail('Smoke users', (string) count($target['smoke_user_ids']));
        $this->components->twoColumnDetail('Smoke orders', (string) count($target['smoke_order_ids']));
        $this->components->twoColumnDetail('Vendor analytics', (string) $summary['vendor_analytics']);
        $this->components->twoColumnDetail('Analytics events', (string) $summary['analytics_events']);
        $this->components->twoColumnDetail('Sessions', (string) $summary['sessions']);
        $this->components->twoColumnDetail('Model roles', (string) $summary['model_has_roles']);

        $this->table(
            ['type', 'ids'],
            [
                ['type' => 'smoke_user_ids', 'ids' => $this->formatIds($target['smoke_user_ids'])],
                ['type' => 'smoke_order_ids', 'ids' => $this->formatIds($target['smoke_order_ids'])],
            ]
        );

        if ($dryRun) {
            $this->components->info('Dry run completed. No rows were deleted.');

            return self::SUCCESS;
        }

        if (! $this->option('force')) {
            $this->components->error('Use --force to execute the cleanup.');

            return self::FAILURE;
        }

        $deletedCounts = DB::transaction(function () use ($target): array {
            $affectedUserIds = $target['smoke_user_ids'];

            if ($target['admin_user_id'] !== null) {
                $affectedUserIds[] = $target['admin_user_id'];
                $affectedUserIds = array_values(array_unique($affectedUserIds));
            }

            $vendorAnalyticsDeleted = empty($target['smoke_user_ids'])
                ? 0
                : DB::table('vendor_analytics')
                    ->where('event_type', 'checkout_order_created')
                    ->whereIn('user_id', $target['smoke_user_ids'])
                    ->delete();

            $analyticsEventsDeleted = $this->deleteAnalyticsEvents($target['smoke_order_ids']);

            $sessionsDeleted = empty($affectedUserIds)
                ? 0
                : DB::table('sessions')
                    ->whereIn('user_id', $affectedUserIds)
                    ->delete();

            $rolesDeleted = $target['admin_user_id'] === null
                ? 0
                : DB::table('model_has_roles')
                    ->where('model_type', User::class)
                    ->where('model_id', $target['admin_user_id'])
                    ->delete();

            $ordersDeleted = empty($target['smoke_order_ids'])
                ? 0
                : DB::table('orders')
                    ->whereIn('id', $target['smoke_order_ids'])
                    ->delete();

            $usersDeleted = empty($target['smoke_user_ids'])
                ? 0
                : DB::table('users')
                    ->whereIn('id', $target['smoke_user_ids'])
                    ->delete();

            $adminDeleted = $target['admin_user_id'] === null
                ? 0
                : DB::table('users')
                    ->where('id', $target['admin_user_id'])
                    ->delete();

            $nextSequenceValue = $this->resetOrderNumberSequence();

            return [
                'vendor_analytics' => $vendorAnalyticsDeleted,
                'analytics_events' => $analyticsEventsDeleted,
                'sessions' => $sessionsDeleted,
                'model_has_roles' => $rolesDeleted,
                'orders' => $ordersDeleted,
                'users' => $usersDeleted,
                'admin_users' => $adminDeleted,
                'next_sequence_value' => $nextSequenceValue,
            ];
        });

        $this->components->twoColumnDetail('Deleted vendor analytics', (string) $deletedCounts['vendor_analytics']);
        $this->components->twoColumnDetail('Deleted analytics events', (string) $deletedCounts['analytics_events']);
        $this->components->twoColumnDetail('Deleted sessions', (string) $deletedCounts['sessions']);
        $this->components->twoColumnDetail('Deleted role links', (string) $deletedCounts['model_has_roles']);
        $this->components->twoColumnDetail('Deleted orders', (string) $deletedCounts['orders']);
        $this->components->twoColumnDetail('Deleted smoke users', (string) $deletedCounts['users']);
        $this->components->twoColumnDetail('Deleted temp admin users', (string) $deletedCounts['admin_users']);
        $this->components->twoColumnDetail('Order number sequence next value', (string) $deletedCounts['next_sequence_value']);
        $this->components->info('Phase 1.5 cleanup completed successfully.');

        return self::SUCCESS;
    }

    /**
     * @return array{admin_user_id:int|null,smoke_user_ids:list<int>,smoke_order_ids:list<int>}
     */
    private function buildTargetSet(): array
    {
        $smokeUserIds = DB::table('users')
            ->where(function ($query): void {
                $query->whereIn('device_hash', self::EXACT_DEVICE_HASHES);

                foreach (self::DEVICE_HASH_PREFIXES as $prefix) {
                    $query->orWhere('device_hash', 'like', $prefix);
                }
            })
            ->orderBy('id')
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $smokeOrderIds = DB::table('orders')
            ->where(function ($query): void {
                foreach (self::EXACT_DEVICE_HASHES as $hash) {
                    $query->orWhereRaw("metadata_json->>'device_hash' = ?", [$hash]);
                }

                foreach (self::DEVICE_HASH_PREFIXES as $prefix) {
                    $query->orWhereRaw("metadata_json->>'device_hash' LIKE ?", [$prefix]);
                }
            })
            ->orderBy('id')
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $adminUserId = DB::table('users')
            ->where('email', self::TEMP_ADMIN_EMAIL)
            ->value('id');

        return [
            'admin_user_id' => $adminUserId !== null ? (int) $adminUserId : null,
            'smoke_user_ids' => $smokeUserIds,
            'smoke_order_ids' => $smokeOrderIds,
        ];
    }

    /**
     * @param  array{admin_user_id:int|null,smoke_user_ids:list<int>,smoke_order_ids:list<int>}  $target
     * @return array<string, int>
     */
    private function buildSummary(array $target): array
    {
        $affectedUserIds = $target['smoke_user_ids'];

        if ($target['admin_user_id'] !== null) {
            $affectedUserIds[] = $target['admin_user_id'];
            $affectedUserIds = array_values(array_unique($affectedUserIds));
        }

        return [
            'vendor_analytics' => empty($target['smoke_user_ids'])
                ? 0
                : (int) DB::table('vendor_analytics')
                    ->where('event_type', 'checkout_order_created')
                    ->whereIn('user_id', $target['smoke_user_ids'])
                    ->count(),
            'analytics_events' => (int) $this->countAnalyticsEvents($target['smoke_order_ids']),
            'sessions' => empty($affectedUserIds)
                ? 0
                : (int) DB::table('sessions')
                    ->whereIn('user_id', $affectedUserIds)
                    ->count(),
            'model_has_roles' => $target['admin_user_id'] === null
                ? 0
                : (int) DB::table('model_has_roles')
                    ->where('model_type', User::class)
                    ->where('model_id', $target['admin_user_id'])
                    ->count(),
        ];
    }

    /**
     * @param  list<int>  $smokeOrderIds
     */
    private function countAnalyticsEvents(array $smokeOrderIds): int
    {
        return (int) DB::table('analytics_events')
            ->where(function ($query) use ($smokeOrderIds): void {
                $query->whereIn('device_hash', self::EXACT_DEVICE_HASHES);

                foreach (self::DEVICE_HASH_PREFIXES as $prefix) {
                    $query->orWhere('device_hash', 'like', $prefix);
                }

                if ($smokeOrderIds !== []) {
                    $query->orWhereIn('order_id', $smokeOrderIds);
                }
            })
            ->count();
    }

    /**
     * @param  list<int>  $smokeOrderIds
     */
    private function deleteAnalyticsEvents(array $smokeOrderIds): int
    {
        return DB::table('analytics_events')
            ->where(function ($query) use ($smokeOrderIds): void {
                $query->whereIn('device_hash', self::EXACT_DEVICE_HASHES);

                foreach (self::DEVICE_HASH_PREFIXES as $prefix) {
                    $query->orWhere('device_hash', 'like', $prefix);
                }

                if ($smokeOrderIds !== []) {
                    $query->orWhereIn('order_id', $smokeOrderIds);
                }
            })
            ->delete();
    }

    private function resetOrderNumberSequence(): int
    {
        $nextValue = DB::table('orders')
            ->whereRaw("order_number ~ '^ORD-[0-9]{8}-[0-9]{6}$'")
            ->selectRaw("COALESCE(MAX(split_part(order_number, '-', 3)::bigint) + 1, 1) AS next_value")
            ->value('next_value');

        $resolvedNextValue = max(1, (int) $nextValue);

        DB::statement(
            'SELECT setval(?, ?, false)',
            ['order_number_seq', $resolvedNextValue]
        );

        return $resolvedNextValue;
    }

    /**
     * @param  list<int>  $ids
     */
    private function formatIds(array $ids): string
    {
        if ($ids === []) {
            return 'none';
        }

        return Collection::make($ids)
            ->map(static fn (int $id): string => (string) $id)
            ->implode(', ');
    }
}
