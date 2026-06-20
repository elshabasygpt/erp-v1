<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Services;

use App\Domain\Inventory\DTOs\InventoryReconciliationReportDTO;
use App\Domain\Accounting\Services\AccountMappingService;
use Illuminate\Support\Facades\DB;

class InventoryReconciliationService
{
    public function __construct(
        private readonly AccountMappingService $accountMappingService
    ) {}

    public function generateReport(string $tenantId): InventoryReconciliationReportDTO
    {
        // 1. Get Inventory GL Account Balance
        $inventoryAccountId = $this->accountMappingService->resolve('inventory');
        if (!$inventoryAccountId) {
            throw new \Exception("Inventory account mapping not found for tenant {$tenantId}");
        }

        $glBalance = (float) DB::connection('tenant')->table('journal_entry_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->where('journal_entries.tenant_id', $tenantId)
            ->where('journal_entry_lines.account_id', $inventoryAccountId)
            ->where('journal_entries.is_posted', true)
            ->select(DB::raw('COALESCE(SUM(debit) - SUM(credit), 0) as balance'))
            ->value('balance');

        $glBalance = round($glBalance, 6);

        // 2. Global Valuation
        $inventoryValuation = (float) DB::connection('tenant')->table('warehouse_products')
            ->where('tenant_id', $tenantId)
            ->select(DB::raw('COALESCE(SUM(quantity * average_cost), 0) as valuation'))
            ->value('valuation');
            
        $inventoryValuation = round($inventoryValuation, 6);

        $difference = round(abs($glBalance - $inventoryValuation), 6);
        $isReconciled = bccomp((string)$difference, '0.000001', 6) <= 0;

        // 3. Warehouse Breakdown
        $warehouseBreakdown = DB::connection('tenant')->table('warehouse_products')
            ->join('warehouses', 'warehouses.id', '=', 'warehouse_products.warehouse_id')
            ->where('warehouse_products.tenant_id', $tenantId)
            ->select(
                'warehouses.id as warehouse_id',
                'warehouses.name as warehouse_name',
                DB::raw('ROUND(SUM(warehouse_products.quantity * warehouse_products.average_cost), 6) as warehouse_valuation')
            )
            ->groupBy('warehouses.id', 'warehouses.name')
            ->get()
            ->toArray();

        // 4. Product Breakdown
        $productBreakdown = DB::connection('tenant')->table('warehouse_products')
            ->join('products', 'products.id', '=', 'warehouse_products.product_id')
            ->where('warehouse_products.tenant_id', $tenantId)
            ->select(
                'products.id as product_id',
                'products.name as product_name',
                DB::raw('ROUND(SUM(warehouse_products.quantity * warehouse_products.average_cost), 6) as product_valuation')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('product_valuation')
            ->get()
            ->toArray();

        return new InventoryReconciliationReportDTO(
            glBalance: $glBalance,
            inventoryValuation: $inventoryValuation,
            difference: $difference,
            isReconciled: $isReconciled,
            warehouseBreakdown: $warehouseBreakdown,
            productBreakdown: $productBreakdown
        );
    }
}
