<?php

namespace App\Console\Commands\Accounting;

use App\Domain\Accounting\Services\FXGainLossService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RevalueForeignCurrencyCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'accounting:revalue-currency {--date= : The date for revaluation (Y-m-d)} {--tenant= : Specific tenant to revalue}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Perform month-end multi-currency revaluation to calculate Unrealized FX Gains/Losses';

    public function handle(FXGainLossService $fxService)
    {
        $date = $this->option('date') ?: now()->endOfMonth()->toDateString();
        $tenantId = $this->option('tenant');

        $this->info("Starting FX Revaluation for date: $date");

        // Ideally, we loop through all tenants
        $tenantsQuery = DB::table('tenants');
        if ($tenantId) {
            $tenantsQuery->where('id', $tenantId);
        }
        $tenants = $tenantsQuery->get();

        foreach ($tenants as $tenant) {
            $this->info("Revaluing for tenant: {$tenant->id}");
            // Set current tenant context if using a package, or pass tenant_id
            app()->singleton('current_tenant', fn () => $tenant->id);

            try {
                DB::connection('tenant')->beginTransaction();
                
                // Invoke FX Service to record unrealized gains/losses
                $entriesCount = $fxService->calculateUnrealizedGainsLosses($tenant->id, $date);
                
                DB::connection('tenant')->commit();
                $this->info("Successfully generated $entriesCount revaluation journal entries for tenant {$tenant->id}.");
            } catch (\Exception $e) {
                DB::connection('tenant')->rollBack();
                $this->error("Failed revaluation for tenant {$tenant->id}: " . $e->getMessage());
            }
        }

        $this->info('Multi-currency revaluation completed.');
        return Command::SUCCESS;
    }
}
