<?php

declare(strict_types=1);

namespace App\Application\Accounting\UseCases;

use App\Domain\Accounting\Services\YearEndClosingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use Illuminate\Support\Facades\DB;
use Exception;

class CloseFiscalYearUseCase
{
    public function __construct(
        private readonly YearEndClosingService $closingService,
        private readonly FiscalPeriodService $fiscalService
    ) {}

    public function execute(string $periodId, string $userId): void
    {
        $tenant = app('current_tenant');
        $tenantId = $tenant->id ?? 'tenant_context';
        
        DB::connection('tenant')->transaction(function () use ($tenantId, $periodId, $userId) {
            
            // 1. Validate and Close Period (Ensures no unposted drafts exist)
            // This will throw if the period can't be closed due to pending transactions
            $this->fiscalService->closePeriod($periodId, $userId, 'Initiated Year-End Closing');

            // 2. Generate P&L Transfer Journal Entry (Revenue/Expense -> Retained Earnings)
            $this->closingService->generateClosingEntry($tenantId, $periodId, $userId);

            // 3. Lock the Period permanently
            $this->fiscalService->lockPeriod($periodId, $userId);
            
        });
    }
}
