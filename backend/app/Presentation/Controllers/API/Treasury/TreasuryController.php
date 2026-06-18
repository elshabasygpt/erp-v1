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
        $safes = SafeModel::query()->where('tenant_id', $this->getTenantId($request))
            ->with(['users', 'branch'])
            ->get();

        return $this->success($safes);
    }

    public function storeSafe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:cash,bank',
            'is_active' => 'nullable|boolean',
        ]);

        $safe = new SafeModel;
        $safe->tenant_id = $this->getTenantId($request);
        $safe->name = $validated['name'];
        $safe->type = $validated['type'];
        $safe->is_active = $validated['is_active'] ?? true;
        $safe->save();

        return $this->success($safe, 'Safe created successfully', 201);
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
