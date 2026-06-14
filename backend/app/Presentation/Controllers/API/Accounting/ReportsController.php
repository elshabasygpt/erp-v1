<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Presentation\Controllers\API\BaseController;
use App\Application\Accounting\Services\AccountingService;
use App\Application\Accounting\UseCases\GenerateTrialBalanceUseCase;
use App\Domain\Accounting\Repositories\AccountRepositoryInterface;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportsController extends BaseController
{
    public function __construct(
        private AccountingService $accountingService,
        private GenerateTrialBalanceUseCase $trialBalanceUseCase,
        private AccountRepositoryInterface $accountRepository,
        private JournalEntryRepositoryInterface $journalEntryRepository,
    ) {}

    public function chartOfAccounts(): JsonResponse
    {
        return $this->success($this->accountRepository->getTree());
    }

    public function trialBalance(Request $request): JsonResponse
    {
        $asOf = new \DateTimeImmutable($request->get('as_of', date('Y-m-d')));
        return $this->success($this->trialBalanceUseCase->execute($asOf));
    }

    public function incomeStatement(Request $request): JsonResponse
    {
        $from = new \DateTimeImmutable($request->get('from', date('Y-m-01')));
        $to = new \DateTimeImmutable($request->get('to', date('Y-m-d')));
        return $this->success($this->accountingService->generateIncomeStatement($from, $to));
    }

    public function balanceSheet(Request $request): JsonResponse
    {
        $asOf = new \DateTimeImmutable($request->get('as_of', date('Y-m-d')));
        return $this->success($this->accountingService->generateBalanceSheet($asOf));
    }

    public function generalLedger(Request $request): JsonResponse
    {
        $from = new \DateTimeImmutable($request->get('from', date('Y-m-01')));
        $to = new \DateTimeImmutable($request->get('to', date('Y-m-d')));
        return $this->success($this->journalEntryRepository->getGeneralLedger($from, $to));
    }

    public function journalEntries(Request $request): JsonResponse
    {
        $filters = $request->only(['from', 'to', 'is_posted']);
        return $this->paginated($this->journalEntryRepository->paginate((int)$request->get('per_page', 15), $filters));
    }
}
