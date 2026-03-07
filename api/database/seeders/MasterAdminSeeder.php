<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MasterAdminSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(AdminRoleSeeder::class);

        $name = trim((string) env('MASTER_ADMIN_NAME', ''));
        $email = strtolower(trim((string) env('MASTER_ADMIN_EMAIL', '')));
        $password = (string) env('MASTER_ADMIN_PASSWORD', '');
        $phone = $this->nullableString(env('MASTER_ADMIN_PHONE'));
        $zoneId = $this->nullableInteger(env('MASTER_ADMIN_ZONE_ID'));
        $rootRole = (string) config('admin.root_role', 'super_admin');

        if ($name === '' || $email === '' || $password === '') {
            throw new RuntimeException('MASTER_ADMIN_NAME, MASTER_ADMIN_EMAIL, and MASTER_ADMIN_PASSWORD are required.');
        }

        if ($zoneId !== null && ! DB::table('zones')
            ->where('id', $zoneId)
            ->whereNull('deleted_at')
            ->exists()) {
            throw new RuntimeException('MASTER_ADMIN_ZONE_ID must reference an active zone.');
        }

        [$user, $wasExisting] = DB::transaction(function () use ($name, $email, $password, $phone, $zoneId, $rootRole): array {
            $user = User::query()->withTrashed()->firstOrNew([
                'email' => $email,
            ]);

            $wasExisting = $user->exists;

            $user->fill([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'phone' => $phone,
                'zone_id' => $zoneId,
                'device_hash' => null,
            ]);
            $user->deleted_at = null;
            $user->save();

            $user->syncRoles([$rootRole]);

            return [$user->fresh(), $wasExisting];
        });

        $message = $wasExisting ? 'Updated master admin account.' : 'Created master admin account.';

        $this->command?->info($message);
        $this->command?->line(sprintf('Email: %s', $user->email));
        $this->command?->line(sprintf('Role: %s', $rootRole));
    }

    private function nullableString(mixed $value): ?string
    {
        $normalized = trim((string) ($value ?? ''));

        return $normalized === '' ? null : $normalized;
    }

    private function nullableInteger(mixed $value): ?int
    {
        $normalized = trim((string) ($value ?? ''));

        if ($normalized === '') {
            return null;
        }

        if (! ctype_digit($normalized)) {
            throw new RuntimeException('MASTER_ADMIN_ZONE_ID must be an integer.');
        }

        return (int) $normalized;
    }
}
