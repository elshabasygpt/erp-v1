<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountingSettingsController extends BaseTenantController
{
    public function __construct(
        private AccountMappingService $accountMapping,
        private FiscalPeriodService $fiscalPeriodService,
        private \App\Application\Accounting\UseCases\CloseFiscalYearUseCase $closeFiscalYearUseCase,
    ) {}

    // ── Account Mappings ──

    public function getAccountMappings(): JsonResponse
    {
        return $this->success($this->accountMapping->getAllMappings(), 'Account mappings retrieved');
    }

    public function updateAccountMappings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cash' => 'nullable|uuid',
            'ar' => 'nullable|uuid',
            'ap' => 'nullable|uuid',
            'revenue' => 'nullable|uuid',
            'cogs' => 'nullable|uuid',
            'inventory' => 'nullable|uuid',
            'vat_payable' => 'nullable|uuid',
            'vat_input' => 'nullable|uuid',
            'discount' => 'nullable|uuid',
            'bank' => 'nullable|uuid',
        ]);

        try {
            $mappings = array_filter($validated, fn ($v) => $v !== null);
            $this->accountMapping->saveMappings($mappings);

            return $this->success($this->accountMapping->getAllMappings(), 'Account mappings updated successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    // ── Fiscal Periods ──

    public function listFiscalPeriods(): JsonResponse
    {
        return $this->success($this->fiscalPeriodService->listPeriods(), 'Fiscal periods retrieved');
    }

    public function createFiscalPeriod(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        try {
            $id = $this->fiscalPeriodService->createPeriod(
                $validated['name'],
                $validated['start_date'],
                $validated['end_date']
            );

            return $this->created(['id' => $id], 'Fiscal period created successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function closeFiscalPeriod(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        try {
            $this->fiscalPeriodService->closePeriod($id, auth()->id() ?? '', $validated['notes'] ?? null);

            return $this->success(null, 'Fiscal period closed successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function reopenFiscalPeriod(string $id): JsonResponse
    {
        try {
            $this->fiscalPeriodService->reopenPeriod($id, auth()->id() ?? '');

            return $this->success(null, 'Fiscal period reopened successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function closeFiscalYear(string $id): JsonResponse
    {
        try {
            $this->closeFiscalYearUseCase->execute($id, auth()->id() ?? '');

            return $this->success(null, 'Fiscal year successfully closed, P&L transferred, and period permanently locked.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
