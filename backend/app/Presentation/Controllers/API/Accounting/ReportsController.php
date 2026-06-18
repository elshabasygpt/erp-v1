<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Application\Accounting\Services\AccountingService;
use App\Application\Accounting\Services\CashFlowService;
use App\Application\Accounting\UseCases\GenerateTrialBalanceUseCase;
use App\Application\Accounting\Services\ZakatCalculationService;
use App\Domain\Accounting\Repositories\AccountRepositoryInterface;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportsController extends BaseTenantController
{
    public function __construct(
        private AccountingService $accountingService,
        private GenerateTrialBalanceUseCase $trialBalanceUseCase,
        private AccountRepositoryInterface $accountRepository,
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private CashFlowService $cashFlowService,
        private ZakatCalculationService $zakatCalculationService,
    ) {}

    public function chartOfAccounts(): JsonResponse
    {
        return $this->success($this->accountRepository->getTree());
    }

    public function trialBalance(Request $request): JsonResponse
    {
        $asOf = new \DateTimeImmutable($request->get('as_of', date('Y-m-d')));
        $costCenterId = $request->get('cost_center_id');

        return $this->success($this->trialBalanceUseCase->execute($asOf, $costCenterId));
    }

    public function incomeStatement(Request $request): JsonResponse
    {
        $from = new \DateTimeImmutable($request->get('from', date('Y-m-01')));
        $to = new \DateTimeImmutable($request->get('to', date('Y-m-d')));
        $costCenterId = $request->get('cost_center_id');

        return $this->success($this->accountingService->generateIncomeStatement($from, $to, (string) $this->getTenantId($request), $costCenterId));
    }

    public function balanceSheet(Request $request): JsonResponse
    {
        $asOf = new \DateTimeImmutable($request->get('as_of', date('Y-m-d')));
        $costCenterId = $request->get('cost_center_id');

        return $this->success($this->accountingService->generateBalanceSheet($asOf, (string) $this->getTenantId($request), $costCenterId));
    }

    public function cashFlow(Request $request): JsonResponse
    {
        $from = new \DateTimeImmutable($request->get('from', date('Y-m-01')));
        $to = new \DateTimeImmutable($request->get('to', date('Y-m-d')));

        return $this->success($this->cashFlowService->generateCashFlowStatement($from, $to, (string) $this->getTenantId($request)));
    }

    public function generalLedger(Request $request): JsonResponse
    {
        $from = new \DateTimeImmutable($request->get('from', date('Y-m-01')));
        $to = new \DateTimeImmutable($request->get('to', date('Y-m-d')));
        $costCenterId = $request->get('cost_center_id');

        return $this->success($this->journalEntryRepository->getGeneralLedger($from, $to, $costCenterId));
    }

    public function journalEntries(Request $request): JsonResponse
    {
        $filters = $request->only(['from', 'to', 'is_posted']);

        return $this->paginated($this->journalEntryRepository->paginate((int) $request->get('per_page', 15), $filters));
    }

    public function zakatReport(Request $request): JsonResponse
    {
        $asOf = new \DateTimeImmutable($request->get('as_of', date('Y-m-d')));
        $method = $request->get('method', 'working_capital');
        $assetAccountIds = $request->get('asset_accounts', []);
        $liabilityAccountIds = $request->get('liability_accounts', []);
        $equityAccountIds = $request->get('equity_accounts', []);
        $longTermLiabilityAccountIds = $request->get('long_term_liability_accounts', []);
        $fixedAssetAccountIds = $request->get('fixed_asset_accounts', []);
        $provisionAccountIds = $request->get('provision_accounts', []);
        $rate = (float) $request->get('rate', 2.5); // 2.5 for Hijri, 2.577 for Gregorian

        $report = $this->zakatCalculationService->calculateZakatBase(
            (string) $this->getTenantId($request),
            $asOf,
            $method,
            $assetAccountIds,
            $liabilityAccountIds,
            $equityAccountIds,
            $longTermLiabilityAccountIds,
            $fixedAssetAccountIds,
            $provisionAccountIds
        );

        $zakatAmount = $report['zakat_base'] > 0 ? $report['zakat_base'] * ($rate / 100) : 0;
        $report['zakat_amount'] = $zakatAmount;
        $report['rate'] = $rate;

        return $this->success($report);
    }

    public function postZakatEntry(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date',
            'zakat_amount' => 'required|numeric|min:0.01',
        ]);

        $date = new \DateTimeImmutable($request->get('date'));
        $amount = (float) $request->get('zakat_amount');

        $this->zakatCalculationService->postZakatEntry(
            (string) $this->getTenantId($request),
            $date,
            $amount,
            (string) $this->getUserId()
        );

        return $this->success(null, 'Zakat entry posted successfully', 201);
    }

    public function payZakat(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'safe_account_id' => 'required|string',
            'reference_number' => 'nullable|string',
        ]);

        $date = new \DateTimeImmutable($request->get('date'));
        $amount = (float) $request->get('amount');
        $safeAccountId = $request->get('safe_account_id');
        $referenceNumber = $request->get('reference_number', '');

        $this->zakatCalculationService->payZakat(
            (string) $this->getTenantId($request),
            $date,
            $amount,
            $safeAccountId,
            (string) $this->getUserId(),
            $referenceNumber
        );

        return $this->success(null, 'Zakat payment processed successfully', 201);
    }
}
