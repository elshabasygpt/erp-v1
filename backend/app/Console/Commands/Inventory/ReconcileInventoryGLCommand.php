<?php

namespace App\Console\Commands\Inventory;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Domain\Accounting\Services\AccountMappingService;

class ReconcileInventoryGLCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inventory:reconcile-gl {--tenant= : Specific tenant to reconcile}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reconcile Inventory Valuation mathematically against the General Ledger Inventory Account';

    public function handle(AccountMappingService $accountMappingService)
    {
        $tenantId = $this->option('tenant');

        $this->info("Starting Inventory vs GL Reconciliation...");

        $tenantsQuery = DB::table('tenants');
        if ($tenantId) {
            $tenantsQuery->where('id', $tenantId);
        }
        $tenants = $tenantsQuery->get();

        foreach ($tenants as $tenant) {
            $this->info("-------------------------------------------------");
            $this->info("Reconciling for Tenant: {$tenant->id}");
            
            // Set tenant scope
            app()->singleton('current_tenant', fn () => $tenant->id);

            // 1. Get Inventory Account ID
            $inventoryAccountId = $accountMappingService->resolve('inventory');
            if (!$inventoryAccountId) {
                $this->error("No inventory account mapping found for tenant {$tenant->id}");
                continue;
            }

            // 2. Calculate GL Balance
            // Net Balance = Sum(Debit) - Sum(Credit) for Asset Account
            $glBalance = DB::connection('tenant')->table('journal_entry_lines')
                ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
                ->where('journal_entries.tenant_id', $tenant->id)
                ->where('journal_entry_lines.account_id', $inventoryAccountId)
                ->where('journal_entries.is_posted', true)
                ->select(DB::raw('COALESCE(SUM(debit) - SUM(credit), 0) as balance'))
                ->value('balance');

            // 3. Calculate Valuation Balance
            // Valuation = SUM(quantity * average_cost) across all warehouse_products
            $valuationBalance = DB::connection('tenant')->table('warehouse_products')
                ->where('tenant_id', $tenant->id)
                ->select(DB::raw('COALESCE(SUM(quantity * average_cost), 0) as valuation'))
                ->value('valuation');

            // Float precision compare
            $glBalance = round((float) $glBalance, 6);
            $valuationBalance = round((float) $valuationBalance, 6);
            $difference = round(abs($glBalance - $valuationBalance), 6);

            $this->info("GL Inventory Balance:  $glBalance");
            $this->info("Valuation Balance:     $valuationBalance");

            if ($difference > 0.01) { // Alert on anything larger than 1 cent
                $this->error("🚨 MISMATCH DETECTED: Variance of $difference found!");
                \Log::error("Inventory GL Mismatch for Tenant {$tenant->id}. GL: {$glBalance}, Valuation: {$valuationBalance}, Diff: {$difference}");
            } else {
                $this->info("✅ RECONCILED: Matches perfectly (Tolerance < 0.01)");
            }
        }

        $this->info("-------------------------------------------------");
        $this->info("Reconciliation Complete.");
        return Command::SUCCESS;
    }
}
