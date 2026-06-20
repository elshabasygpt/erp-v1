<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Treasury;

use App\Application\Treasury\UseCases\CreateTreasuryPaymentUseCase;
use App\Application\Treasury\UseCases\CreateTreasuryReceiptUseCase;
use App\Application\Treasury\UseCases\TransferBetweenSafesUseCase;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeUserModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TreasuryController extends BaseTenantController
{
    public function __construct(
        private readonly CreateTreasuryReceiptUseCase $receiptUseCase,
        private readonly CreateTreasuryPaymentUseCase $paymentUseCase,
        private readonly TransferBetweenSafesUseCase $transferUseCase
    ) {}

    public function getSafes(Request $request): JsonResponse
    {
        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = SafeModel::query();
        $safes = $query->where(['tenant_id' => $this->getTenantId($request)])
            ->with(['users', 'bankAccount'])
            ->get()
            ->map(function ($safe) {
                if ($safe->type === 'bank' && $safe->bankAccount) {
                    $safe->balance = $safe->bankAccount->current_balance;
                }
                return $safe;
            });

        return $this->success($safes);
    }

    public function getTransactions(Request $request, string $id): JsonResponse
    {
        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = SafeModel::query();
        $safe = $query->where(['tenant_id' => $this->getTenantId($request)])->findOrFail($id);

        $transactions = \App\Infrastructure\Eloquent\Models\SafeTransactionModel::query()
            ->where('safe_id', $safe->id)
            ->orderBy('transaction_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return $this->success($transactions);
    }

    public function storeSafe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'type' => 'required|string|in:cash,bank,wallet',
            'account_id' => 'nullable|uuid|exists:tenant.accounts,id',
            'bank_account_id' => [
                'nullable',
                'uuid',
                'exists:tenant.bank_accounts,id',
                \Illuminate\Validation\Rule::unique('tenant.safes', 'bank_account_id')
                    ->where('tenant_id', $this->getTenantId($request))
            ],
            'balance' => 'nullable|numeric',
            'is_active' => 'nullable|boolean',
        ]);

        $safe = new SafeModel;
        $safe->tenant_id = $this->getTenantId($request);
        $safe->name = $validated['name'];
        $safe->name_ar = $validated['name_ar'] ?? null;
        $safe->type = $validated['type'];
        $safe->account_id = $validated['account_id'] ?? null;
        $safe->bank_account_id = $validated['bank_account_id'] ?? null;
        
        $balance = $validated['balance'] ?? 0;
        if ($safe->type === 'bank' && $safe->bank_account_id) {
            $bankAcc = \App\Infrastructure\Eloquent\Models\Accounting\BankAccountModel::find($safe->bank_account_id);
            if ($bankAcc) {
                $balance = $bankAcc->current_balance;
            }
        }
        $safe->balance = $balance;
        $safe->is_active = $validated['is_active'] ?? true;
        $safe->save();

        return $this->success($safe, 'Safe created successfully', 201);
    }

    public function updateSafe(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'type' => 'required|string|in:cash,bank,wallet',
            'account_id' => 'nullable|uuid|exists:tenant.accounts,id',
            'bank_account_id' => [
                'nullable',
                'uuid',
                'exists:tenant.bank_accounts,id',
                \Illuminate\Validation\Rule::unique('tenant.safes', 'bank_account_id')
                    ->where('tenant_id', $this->getTenantId($request))
                    ->ignore($id)
            ],
            'balance' => 'nullable|numeric',
            'is_active' => 'nullable|boolean',
        ]);

        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = SafeModel::query();
        $safe = $query->where('tenant_id', $this->getTenantId($request))->findOrFail($id);
        
        $safe->name = $validated['name'];
        if (array_key_exists('name_ar', $validated)) {
            $safe->name_ar = $validated['name_ar'];
        }
        $safe->type = $validated['type'];
        if (array_key_exists('account_id', $validated)) {
            $safe->account_id = $validated['account_id'];
        }
        if (array_key_exists('bank_account_id', $validated)) {
            $safe->bank_account_id = $validated['bank_account_id'];
        }
        
        if ($safe->type === 'bank' && $safe->bank_account_id) {
             $bankAcc = \App\Infrastructure\Eloquent\Models\Accounting\BankAccountModel::find($safe->bank_account_id);
             if ($bankAcc) {
                 $safe->balance = $bankAcc->current_balance;
             }
        } else if (array_key_exists('balance', $validated)) {
            $safe->balance = $validated['balance'];
        }
        
        if (array_key_exists('is_active', $validated)) {
            $safe->is_active = $validated['is_active'];
        }
        $safe->save();

        return $this->success($safe, 'Safe updated successfully');
    }

    public function destroySafe(Request $request, string $id): JsonResponse
    {
        $safe = SafeModel::query()->where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        if ($safe->transactions()->count() > 0) {
            return $this->error('Cannot delete safe with associated transactions.', 400);
        }

        $safe->delete();

        return $this->success(null, 'Safe deleted successfully');
    }

    public function assignUser(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:tenant.users,id',
            'is_manager' => 'nullable|boolean',
        ]);

        $safeUser = new SafeUserModel;
        $safeUser->tenant_id = $this->getTenantId($request);
        $safeUser->safe_id = $id;
        $safeUser->user_id = $validated['user_id'];
        $safeUser->is_manager = $validated['is_manager'] ?? false;
        $safeUser->save();

        return $this->success($safeUser, 'User assigned successfully');
    }

    public function storeTransaction(Request $request): JsonResponse
    {
        // Wrapper for receipt or payment based on type, if needed.
        // For now just defer to receipt or payment based on transaction_type if we have one.
        $type = $request->input('transaction_type');
        if ($type === 'payment' || $type === 'expense') {
            return $this->payment($request);
        }

        return $this->receipt($request);
    }

    public function receipt(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'safe_id' => 'required|uuid|exists:tenant.safes,id',
            'amount' => 'required|numeric|min:0.01',
            'account_id' => 'required|uuid|exists:tenant.accounts,id',
            'transaction_date' => 'nullable|date',
            'description' => 'nullable|string',
            'cost_center_id' => 'nullable|uuid|exists:tenant.cost_centers,id',
            'currency_id' => 'nullable|uuid|exists:tenant.currencies,id',
            'exchange_rate' => 'nullable|numeric|min:0.000001',
        ]);

        try {
            $transaction = $this->receiptUseCase->execute($this->getTenantId($request), $validated, auth()->id() ?? '');

            return $this->success($transaction->toArray(), 'Treasury receipt recorded successfully.', 201);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Treasury receipt failed: '.$e->getMessage());

            return $this->error('Failed to record treasury receipt.', 500);
        }
    }

    public function payment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'safe_id' => 'required|uuid|exists:tenant.safes,id',
            'amount' => 'required|numeric|min:0.01',
            'account_id' => 'required|uuid|exists:tenant.accounts,id',
            'transaction_date' => 'nullable|date',
            'description' => 'nullable|string',
            'cost_center_id' => 'nullable|uuid|exists:tenant.cost_centers,id',
            'currency_id' => 'nullable|uuid|exists:tenant.currencies,id',
            'exchange_rate' => 'nullable|numeric|min:0.000001',
        ]);

        try {
            $transaction = $this->paymentUseCase->execute($this->getTenantId($request), $validated, auth()->id() ?? '');

            return $this->success($transaction->toArray(), 'Treasury payment recorded successfully.', 201);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Treasury payment failed: '.$e->getMessage());

            return $this->error('Failed to record treasury payment.', 500);
        }
    }

    public function transfer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_safe_id' => 'required|uuid|exists:tenant.safes,id',
            'to_safe_id' => 'required|uuid|exists:tenant.safes,id|different:from_safe_id',
            'amount' => 'required|numeric|min:0.01',
            'fee_amount' => 'nullable|numeric|min:0',
            'transaction_date' => 'nullable|date',
            'description' => 'nullable|string',
            'cost_center_id' => 'nullable|uuid|exists:tenant.cost_centers,id',
            'currency_id' => 'nullable|uuid|exists:tenant.currencies,id',
            'exchange_rate' => 'nullable|numeric|min:0.000001',
        ]);

        try {
            $this->transferUseCase->execute(
                $this->getTenantId($request),
                $validated['from_safe_id'],
                $validated['to_safe_id'],
                (float) $validated['amount'],
                (float) ($validated['fee_amount'] ?? 0),
                auth()->id() ?? '',
                $validated['transaction_date'] ?? date('Y-m-d'),
                $validated['description'] ?? ''
            );

            return $this->success([], 'Transfer completed successfully.');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Transfer failed: '.$e->getMessage());

            return $this->error('Failed to process transfer.', 500);
        }
    }
}
