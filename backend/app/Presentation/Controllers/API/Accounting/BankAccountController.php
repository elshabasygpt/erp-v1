<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Domain\Accounting\Services\BankReconciliationService;
use App\Infrastructure\Eloquent\Models\Accounting\BankAccountModel;
use App\Infrastructure\Eloquent\Models\Accounting\ReconciliationModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankAccountController extends BaseTenantController
{
    public function __construct(
        private BankReconciliationService $bankReconciliationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $accounts = BankAccountModel::query()->where('tenant_id', $this->getTenantId($request))->with('ledgerAccount')->get();

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

        return $this->success($account, 'Bank account created successfully', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'account_number' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:255',
            'currency_id' => 'nullable|uuid',
            'opening_balance' => 'numeric',
            'chart_of_account_id' => 'nullable|uuid|exists:tenant.accounts,id',
        ]);

        $account = BankAccountModel::query()->where('tenant_id', $this->getTenantId($request))->findOrFail($id);
        
        if (isset($validated['opening_balance'])) {
            // If there are no transactions, the current balance should always be exactly the opening balance
            if ($account->transactions()->count() === 0) {
                $validated['current_balance'] = $validated['opening_balance'];
            } else if ((float)$validated['opening_balance'] !== (float)$account->opening_balance) {
                // If there are transactions, only adjust by the difference
                $diff = (float)$validated['opening_balance'] - (float)$account->opening_balance;
                $validated['current_balance'] = $account->current_balance + $diff;
            }
        }

        $account->update($validated);

        return $this->success($account, 'Bank account updated successfully');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $account = BankAccountModel::query()->where('tenant_id', $this->getTenantId($request))->findOrFail($id);
        
        // Ensure no transactions exist before deleting
        if ($account->transactions()->count() > 0) {
            return $this->error('Cannot delete bank account because it has transactions.', 400);
        }

        $account->delete();

        return $this->success(null, 'Bank account deleted successfully');
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
            return $this->error('Failed to import transactions: '.$e->getMessage(), 422);
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

            return $this->success($reconciliation, 'Reconciliation started successfully', 201);
        } catch (\Exception $e) {
            return $this->error('Failed to start reconciliation: '.$e->getMessage(), 422);
        }
    }

    public function getReconciliations(Request $request, string $id): JsonResponse
    {
        $reconciliations = ReconciliationModel::query()->where('tenant_id', $this->getTenantId($request))->where('bank_account_id', $id)
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
            return $this->error('Failed to match transaction: '.$e->getMessage(), 422);
        }
    }

    public function completeReconciliation(Request $request, string $reconciliationId): JsonResponse
    {
        $forceComplete = (bool) $request->input('force_complete', false);
        try {
            $reconciliation = $this->bankReconciliationService->completeReconciliation(
                $reconciliationId,
                auth()->id() ?? '',
                $forceComplete
            );

            return $this->success($reconciliation, 'Reconciliation completed successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to complete reconciliation: '.$e->getMessage(), 422);
        }
    }

    public function autoMatch(Request $request, string $reconciliationId): JsonResponse
    {
        $days = (int) $request->input('date_tolerance_days', 5);
        try {
            $result = $this->bankReconciliationService->autoMatch($reconciliationId, $days);
            return $this->success($result, "Auto-matched {$result['matched']} transaction(s)");
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
