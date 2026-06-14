<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Presentation\Controllers\API\BaseController;
use App\Domain\Accounting\Services\BankReconciliationService;
use App\Infrastructure\Eloquent\Models\Accounting\BankAccountModel;
use App\Infrastructure\Eloquent\Models\Accounting\ReconciliationModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankAccountController extends BaseController
{
    public function __construct(
        private BankReconciliationService $bankReconciliationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $accounts = BankAccountModel::with('ledgerAccount')->get();
        return $this->success($accounts, 'Bank accounts retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'account_number' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:255',
            'currency_id' => 'nullable|uuid',
            'opening_balance' => 'numeric',
            'chart_of_account_id' => 'nullable|uuid|exists:accounts,id',
        ]);

        $account = $this->bankReconciliationService->createBankAccount($validated, auth()->id() ?? '');

        return $this->created($account, 'Bank account created successfully');
    }

    public function importTransactions(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'transactions' => 'required|array',
            'transactions.*.transaction_date' => 'required|date',
            'transactions.*.type' => 'required|string|in:deposit,withdrawal,fee,interest',
            'transactions.*.amount' => 'required|numeric|min:0',
            'transactions.*.description' => 'nullable|string',
            'transactions.*.reference_number' => 'nullable|string',
        ]);

        try {
            $imported = $this->bankReconciliationService->importBankTransactions($id, $validated['transactions'], auth()->id() ?? '');
            return $this->success($imported, 'Transactions imported successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to import transactions: ' . $e->getMessage(), 422);
        }
    }

    public function startReconciliation(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'statement_balance' => 'required|numeric',
        ]);

        try {
            $reconciliation = $this->bankReconciliationService->startReconciliation(
                $id,
                $validated['start_date'],
                $validated['end_date'],
                (float) $validated['statement_balance'],
                auth()->id() ?? ''
            );
            return $this->created($reconciliation, 'Reconciliation started successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to start reconciliation: ' . $e->getMessage(), 422);
        }
    }

    public function getReconciliations(string $id): JsonResponse
    {
        $reconciliations = ReconciliationModel::where('bank_account_id', $id)
            ->orderBy('statement_date', 'desc')
            ->get();
        return $this->success($reconciliations, 'Reconciliations retrieved successfully');
    }

    public function matchTransaction(Request $request, string $reconciliationId): JsonResponse
    {
        $validated = $request->validate([
            'bank_transaction_id' => 'required|uuid|exists:bank_transactions,id',
            'journal_entry_line_id' => 'required|uuid|exists:journal_entry_lines,id',
        ]);

        try {
            $line = $this->bankReconciliationService->matchTransaction(
                $reconciliationId,
                $validated['bank_transaction_id'],
                $validated['journal_entry_line_id']
            );
            return $this->success($line, 'Transaction matched successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to match transaction: ' . $e->getMessage(), 422);
        }
    }

    public function completeReconciliation(string $reconciliationId): JsonResponse
    {
        try {
            $reconciliation = $this->bankReconciliationService->completeReconciliation($reconciliationId, auth()->id() ?? '');
            return $this->success($reconciliation, 'Reconciliation completed successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to complete reconciliation: ' . $e->getMessage(), 422);
        }
    }
}
