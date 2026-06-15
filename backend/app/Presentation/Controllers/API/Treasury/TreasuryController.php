<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Treasury;

use App\Presentation\Controllers\API\BaseController;
use App\Application\Treasury\UseCases\CreateTreasuryReceiptUseCase;
use App\Application\Treasury\UseCases\CreateTreasuryPaymentUseCase;
use App\Application\Treasury\UseCases\TransferBetweenSafesUseCase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TreasuryController extends BaseController
{
    public function __construct(
        private readonly CreateTreasuryReceiptUseCase $receiptUseCase,
        private readonly CreateTreasuryPaymentUseCase $paymentUseCase,
        private readonly TransferBetweenSafesUseCase $transferUseCase
    ) {}

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
            \Log::error('Treasury receipt failed: ' . $e->getMessage());
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
            \Log::error('Treasury payment failed: ' . $e->getMessage());
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
            \Log::error('Transfer failed: ' . $e->getMessage());
            return $this->error('Failed to process transfer.', 500);
        }
    }
}
