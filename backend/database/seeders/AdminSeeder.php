<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Ramsey\Uuid\Uuid;

class AdminSeeder extends Seeder
{
    /**
     * Seed the admin account and default roles/permissions.
     * Run: php artisan db:seed --class=AdminSeeder
     */
    public function run(): void
    {
        // ==========================================
        // Create Admin Role
        // ==========================================
        $adminRoleId = Uuid::uuid4()->toString();
        DB::connection('tenant')->table('roles')->insert([
            'id' => $adminRoleId,
            'name' => 'admin',
            'guard_name' => 'api',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ==========================================
        // Create Default Permissions
        // ==========================================
        $permissions = [
            'users.view', 'users.create', 'users.edit', 'users.delete',
            'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
            'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete',
            'products.view', 'products.create', 'products.edit', 'products.delete',
            'warehouses.view', 'warehouses.create', 'warehouses.edit',
            'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
            'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
            'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.delete',
            'accounting.view', 'accounting.create', 'accounting.edit',
            'reports.view', 'reports.export',
            'settings.view', 'settings.edit',
        ];

        foreach ($permissions as $permission) {
            $permissionId = Uuid::uuid4()->toString();
            DB::connection('tenant')->table('permissions')->insert([
                'id' => $permissionId,
                'name' => $permission,
                'guard_name' => 'api',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Assign all permissions to admin role
            DB::connection('tenant')->table('role_permissions')->insert([
                'role_id' => $adminRoleId,
                'permission_id' => $permissionId,
            ]);
        }

        // ==========================================
        // Create Admin User
        // ==========================================
        DB::connection('tenant')->table('users')->insert([
            'id' => Uuid::uuid4()->toString(),
            'name' => 'Administrator',
            'email' => 'admin@company.com',
            'password' => Hash::make('password'),
            'role_id' => $adminRoleId,
            'is_active' => true,
            'phone' => '+966500000000',
            'locale' => 'ar',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ==========================================
        // Create Accountant Role (limited)
        // ==========================================
        $accountantRoleId = Uuid::uuid4()->toString();
        DB::connection('tenant')->table('roles')->insert([
            'id' => $accountantRoleId,
            'name' => 'accountant',
            'guard_name' => 'api',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ==========================================
        // Create Cashier Role (limited)
        // ==========================================
        $cashierRoleId = Uuid::uuid4()->toString();
        DB::connection('tenant')->table('roles')->insert([
            'id' => $cashierRoleId,
            'name' => 'cashier',
            'guard_name' => 'api',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->command->info('✅ Admin account created successfully!');
        $this->command->info('📧 Email: admin@company.com');
        $this->command->info('🔑 Password: password');
    }
}
