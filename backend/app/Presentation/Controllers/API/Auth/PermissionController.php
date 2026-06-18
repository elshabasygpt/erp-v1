<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Auth;

use App\Infrastructure\Eloquent\Models\PermissionModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;

class PermissionController extends BaseTenantController
{
    /**
     * Display a listing of all permissions, grouped by their module.
     */
    public function index(): JsonResponse
    {
        $permissions = PermissionModel::query()->where(['guard_name' => 'sanctum'])->get();

        $moduleMap = [
            'sales' => ['view_sales', 'create_sales', 'edit_sales', 'delete_sales', 'view_quotations', 'create_quotations', 'edit_quotations', 'delete_quotations', 'view_returns', 'process_returns'],
            'inventory' => ['view_inventory', 'create_inventory', 'edit_inventory', 'delete_inventory', 'view_stocktakes', 'execute_stocktakes', 'approve_stocktakes', 'view_movements', 'view_transfers', 'create_transfers'],
            'purchases' => ['view_purchases', 'create_purchases', 'edit_purchases', 'delete_purchases', 'view_suppliers', 'create_suppliers', 'edit_suppliers'],
            'accounting' => ['view_accounting', 'create_journal_entries', 'approve_journal_entries', 'view_treasury', 'manage_treasury', 'view_financial_reports'],
            'crm' => ['view_customers', 'create_customers', 'edit_customers', 'delete_customers', 'view_receivables', 'collect_payments'],
            'hr' => ['view_employees', 'create_employees', 'edit_employees', 'view_payroll', 'process_payroll', 'view_attendance', 'manage_attendance'],
            'settings' => ['view_settings', 'manage_settings', 'view_roles', 'manage_roles', 'view_users', 'manage_users']
        ];

        $groupedPermissions = [];
        foreach ($moduleMap as $module => $perms) {
            $groupedPermissions[$module] = $permissions->filter(fn($p) => in_array($p->name, $perms))->values();
        }

        // Add any uncategorized permissions to 'other'
        $categorizedNames = collect($moduleMap)->flatten()->toArray();
        $uncategorized = $permissions->filter(fn($p) => !in_array($p->name, $categorizedNames))->values();
        if ($uncategorized->isNotEmpty()) {
            $groupedPermissions['other'] = $uncategorized;
        }

        return $this->success($groupedPermissions, 'Permissions retrieved successfully');
    }
}
