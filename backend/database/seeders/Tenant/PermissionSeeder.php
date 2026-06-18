<?php

namespace Database\Seeders\Tenant;

use App\Infrastructure\Eloquent\Models\PermissionModel;
use App\Infrastructure\Eloquent\Models\RoleModel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define modular permissions
        $permissionsGrouped = [
            'sales' => [
                'view_sales', 'create_sales', 'edit_sales', 'delete_sales',
                'view_quotations', 'create_quotations', 'edit_quotations', 'delete_quotations',
                'view_returns', 'process_returns'
            ],
            'inventory' => [
                'view_inventory', 'create_inventory', 'edit_inventory', 'delete_inventory',
                'view_stocktakes', 'execute_stocktakes', 'approve_stocktakes',
                'view_movements', 'view_transfers', 'create_transfers'
            ],
            'purchases' => [
                'view_purchases', 'create_purchases', 'edit_purchases', 'delete_purchases',
                'view_suppliers', 'create_suppliers', 'edit_suppliers'
            ],
            'accounting' => [
                'view_accounting', 'create_journal_entries', 'approve_journal_entries',
                'view_treasury', 'manage_treasury',
                'view_financial_reports'
            ],
            'crm' => [
                'view_customers', 'create_customers', 'edit_customers', 'delete_customers',
                'view_receivables', 'collect_payments'
            ],
            'hr' => [
                'view_employees', 'create_employees', 'edit_employees',
                'view_payroll', 'process_payroll',
                'view_attendance', 'manage_attendance'
            ],
            'settings' => [
                'view_settings', 'manage_settings',
                'view_roles', 'manage_roles',
                'view_users', 'manage_users'
            ]
        ];

        // 2. Insert Permissions
        $adminPermissions = [];
        foreach ($permissionsGrouped as $module => $permissions) {
            foreach ($permissions as $permName) {
                $permission = PermissionModel::firstOrCreate(
                    ['name' => $permName],
                    [
                        'id' => Str::uuid(),
                        'guard_name' => 'sanctum', // Using sanctum guard for API
                    ]
                );
                // Also create web guard permission just in case
                PermissionModel::firstOrCreate(
                    ['name' => $permName, 'guard_name' => 'web'],
                    [
                        'id' => Str::uuid(),
                    ]
                );

                if ($permission->guard_name === 'sanctum') {
                    $adminPermissions[] = $permission;
                }
            }
        }

        // 3. Create Super Admin Role & Assign All Permissions
        $adminRole = RoleModel::firstOrCreate(
            ['name' => 'Super Admin'],
            ['id' => Str::uuid(), 'guard_name' => 'sanctum']
        );
        RoleModel::firstOrCreate(
            ['name' => 'Super Admin', 'guard_name' => 'web'],
            ['id' => Str::uuid()]
        );

        $adminRole->syncPermissions($adminPermissions);
    }
}
