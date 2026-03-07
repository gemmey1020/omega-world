<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class AdminRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ([
            'super_admin',
            'ops_dispatcher',
            'support_analyst',
            'catalog_manager',
            'merchant_success',
        ] as $roleName) {
            Role::findOrCreate($roleName, 'admin');
        }
    }
}
