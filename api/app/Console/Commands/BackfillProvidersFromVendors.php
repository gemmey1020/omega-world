<?php

namespace App\Console\Commands;

use App\Models\Provider;
use App\Models\Vendor;
use Illuminate\Console\Command;
use Illuminate\Console\ConfirmableTrait;
use Illuminate\Support\Facades\DB;

class BackfillProvidersFromVendors extends Command
{
    use ConfirmableTrait;

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'omega:backfill-providers {--dry-run} {--chunk=200} {--force}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill providers from existing vendors and bridge vendors.provider_id';

    public function handle(): int
    {
        $chunkSize = max(1, (int) $this->option('chunk'));
        $dryRun = (bool) $this->option('dry-run');

        if (! $dryRun && ! $this->confirmToProceed()) {
            return self::FAILURE;
        }

        $summary = $this->buildSummary();
        $this->components->twoColumnDetail('Vendors', (string) $summary['vendors_total']);
        $this->components->twoColumnDetail('Existing Providers', (string) $summary['providers_total']);
        $this->components->twoColumnDetail('Active Vendors Missing Provider', (string) $summary['active_vendors_missing_provider']);

        $sampleMappings = Vendor::withTrashed()
            ->with('subscription')
            ->orderBy('id')
            ->limit(5)
            ->get()
            ->map(fn (Vendor $vendor): array => [
                'vendor_id' => $vendor->id,
                'vendor_name' => $vendor->name,
                'provider_status' => $this->resolveProviderStatus($vendor),
                'soft_deleted' => $vendor->trashed() ? 'yes' : 'no',
            ])
            ->all();

        $this->table(['vendor_id', 'vendor_name', 'provider_status', 'soft_deleted'], $sampleMappings);

        if ($dryRun) {
            $this->components->info('Dry run completed. No rows were written.');

            return self::SUCCESS;
        }

        $created = 0;
        $updated = 0;
        $bridged = 0;

        Vendor::withTrashed()
            ->with('subscription')
            ->orderBy('id')
            ->chunkById($chunkSize, function ($vendors) use (&$created, &$updated, &$bridged): void {
                DB::transaction(function () use ($vendors, &$created, &$updated, &$bridged): void {
                    foreach ($vendors as $vendor) {
                        $provider = Provider::withTrashed()
                            ->where('vendor_id', $vendor->id)
                            ->first();

                        if ($provider === null) {
                            $provider = new Provider();
                            ++$created;
                        } else {
                            ++$updated;
                        }

                        $provider->type = Provider::TYPE_MERCHANT;
                        $provider->vendor_id = $vendor->id;
                        $provider->zone_id = $vendor->zone_id;
                        $provider->display_name = $vendor->name;
                        $provider->primary_contact_phone = null;
                        $provider->whatsapp_number = $vendor->whatsapp_number;
                        $provider->status = $this->resolveProviderStatus($vendor);
                        $provider->capabilities_json = null;
                        $provider->sla_profile_id = null;
                        $provider->escalation_policy_id = null;
                        $provider->metadata_json = [
                            'source' => 'vendor_backfill',
                        ];
                        $provider->deleted_at = $vendor->deleted_at;
                        if ($provider->isDirty()) {
                            $provider->save();
                        }

                        if ($this->providerCoordinatesDifferFromVendor($provider->id, $vendor->id)) {
                            DB::table('providers')
                                ->where('id', $provider->id)
                                ->update([
                                    'coordinates' => DB::raw("(SELECT coordinates FROM vendors WHERE id = {$vendor->id})"),
                                    'updated_at' => now(),
                                ]);
                        }

                        if ($provider->trashed() && ! $vendor->trashed()) {
                            $provider->restore();
                        }

                        if ($vendor->provider_id !== $provider->id) {
                            Vendor::withTrashed()
                                ->whereKey($vendor->id)
                                ->update([
                                    'provider_id' => $provider->id,
                                    'updated_at' => now(),
                                ]);

                            ++$bridged;
                        }
                    }
                });
            }, 'id');

        $verification = $this->buildSummary();

        $this->components->twoColumnDetail('Providers Created', (string) $created);
        $this->components->twoColumnDetail('Providers Updated', (string) $updated);
        $this->components->twoColumnDetail('Vendor Bridges Updated', (string) $bridged);
        $this->components->twoColumnDetail('Active Vendors Missing Provider', (string) $verification['active_vendors_missing_provider']);
        $this->components->twoColumnDetail('Duplicate providers.vendor_id Rows', (string) $verification['duplicate_provider_vendor_links']);
        $this->components->twoColumnDetail('Vendor Links Not Merchant', (string) $verification['non_merchant_vendor_links']);

        if (
            $verification['active_vendors_missing_provider'] > 0
            || $verification['duplicate_provider_vendor_links'] > 0
            || $verification['non_merchant_vendor_links'] > 0
        ) {
            $this->components->error('Backfill completed with verification failures.');

            return self::FAILURE;
        }

        $this->components->info('Provider backfill completed successfully.');

        return self::SUCCESS;
    }

    /**
     * @return array<string, int>
     */
    private function buildSummary(): array
    {
        return [
            'vendors_total' => Vendor::withTrashed()->count(),
            'providers_total' => Provider::withTrashed()->count(),
            'active_vendors_missing_provider' => Vendor::query()
                ->where('is_active', true)
                ->whereNull('provider_id')
                ->count(),
            'duplicate_provider_vendor_links' => (int) DB::table('providers')
                ->select('vendor_id')
                ->whereNotNull('vendor_id')
                ->groupBy('vendor_id')
                ->havingRaw('COUNT(*) > 1')
                ->count(),
            'non_merchant_vendor_links' => Vendor::query()
                ->join('providers', 'providers.id', '=', 'vendors.provider_id')
                ->where('providers.type', '!=', Provider::TYPE_MERCHANT)
                ->count(),
        ];
    }

    private function resolveProviderStatus(Vendor $vendor): string
    {
        $subscription = $vendor->subscription;

        if ($subscription !== null) {
            if ($subscription->reason === 'ADMIN_BLOCK') {
                return Provider::STATUS_BLOCKED;
            }

            if ($subscription->reason === 'MANUAL_PAUSE') {
                return Provider::STATUS_PAUSED;
            }

            if ($subscription->reason === 'PENDING_SETUP') {
                return Provider::STATUS_PENDING_SETUP;
            }

            if ($subscription->reason === 'SUBSCRIPTION_EXPIRED' || $subscription->status === 'expired') {
                return Provider::STATUS_EXPIRED;
            }
        }

        if ($vendor->is_active && $subscription !== null && in_array($subscription->status, ['active', 'trial'], true)) {
            return Provider::STATUS_ACTIVE;
        }

        return Provider::STATUS_EXPIRED;
    }

    private function providerCoordinatesDifferFromVendor(int $providerId, int $vendorId): bool
    {
        $providerCoordinates = DB::table('providers')
            ->selectRaw('CASE WHEN coordinates IS NULL THEN NULL ELSE ST_AsText(coordinates) END AS coordinates_wkt')
            ->where('id', $providerId)
            ->value('coordinates_wkt');

        $vendorCoordinates = DB::table('vendors')
            ->selectRaw('CASE WHEN coordinates IS NULL THEN NULL ELSE ST_AsText(coordinates) END AS coordinates_wkt')
            ->where('id', $vendorId)
            ->value('coordinates_wkt');

        return $providerCoordinates !== $vendorCoordinates;
    }
}
