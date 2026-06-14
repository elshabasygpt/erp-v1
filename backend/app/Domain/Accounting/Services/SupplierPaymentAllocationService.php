<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Services;

use App\Infrastructure\Eloquent\Models\SupplierPaymentModel;
use App\Infrastructure\Eloquent\Models\Accounting\SupplierPaymentAllocationModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * SupplierPaymentAllocationService
 *
 * Handles allocation of a lump-sum supplier payment across multiple purchase invoices.
 */
class SupplierPaymentAllocationService
{
    /**
     * Allocate a supplier payment to multiple purchase invoices.
     * 
     * @param string $paymentId
     * @param array<array{invoice_id: string, amount: float}> $allocations
     */
    public function allocatePayment(string $paymentId, array $allocations): void
    {
        DB::connection('tenant')->transaction(function () use ($paymentId, $allocations) {
            $payment = SupplierPaymentModel::findOrFail($paymentId);

            $totalAllocated = collect($allocations)->sum('amount');

            // Validate that we are not allocating more than the payment amount
            $existingAllocationsSum = SupplierPaymentAllocationModel::where('supplier_payment_id', $paymentId)->sum('amount');
            
            if (($existingAllocationsSum + $totalAllocated) > $payment->amount) {
                throw new \DomainException("Total allocated amount exceeds the payment amount.");
            }

            foreach ($allocations as $allocation) {
                SupplierPaymentAllocationModel::create([
                    'id' => Str::uuid()->toString(),
                    'supplier_payment_id' => $paymentId,
                    'purchase_invoice_id' => $allocation['invoice_id'],
                    'amount' => $allocation['amount'],
                ]);

                // Update the purchase invoice's paid amount (we'd need a paid_amount column or similar logic)
                // For now, this just tracks the allocation. 
            }
        });
    }
}
