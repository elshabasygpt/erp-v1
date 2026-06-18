<?php

declare(strict_types=1);

namespace App\Domain\Sales\Services;

use App\Infrastructure\Eloquent\Models\QuotationItemModel;
use App\Infrastructure\Eloquent\Models\QuotationModel;
use Carbon\Carbon;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QuotationService
{
    /**
     * Updates a quotation with strict recalculation of subtotal, tax, and total.
     */
    public function updateQuotation(string $tenantId, string $quotationId, array $data): QuotationModel
    {
        $quotation = QuotationModel::query()->where('tenant_id', $tenantId)->find($quotationId);

        if (! $quotation) {
            throw new DomainException('Quotation not found');
        }

        if (in_array($quotation->status, ['accepted', 'rejected', 'expired'])) {
            throw new DomainException("Cannot modify a quotation that is {$quotation->status}");
        }

        DB::connection('tenant')->beginTransaction();
        try {
            QuotationItemModel::query()->where('quotation_id', $quotation->id)->delete();

            $subtotalAmount = 0;
            $taxAmount = 0;

            foreach ($data['items'] as $item) {
                $gross = $item['quantity'] * $item['unit_price'];
                $itemTax = $gross * ($item['vat_rate'] / 100);
                $subtotalAmount += $gross;
                $taxAmount += $itemTax;
            }

            $totalAmount = $subtotalAmount + $taxAmount;

            $quotation->update([
                'customer_id' => $data['customer_id'],
                'issue_date' => $data['issue_date'] ?? $quotation->issue_date,
                'expiry_date' => $data['expiry_date'] ?? null,
                'subtotal' => $subtotalAmount,
                'vat_amount' => $taxAmount,
                'total' => $totalAmount,
                'status' => $data['status'],
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $gross = $item['quantity'] * $item['unit_price'];
                $itemTax = $gross * ($item['vat_rate'] / 100);

                QuotationItemModel::query()->create([
                    'tenant_id' => $tenantId,
                    'id' => Str::uuid()->toString(),
                    'quotation_id' => $quotation->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'vat_rate' => $item['vat_rate'],
                    'total' => $gross + $itemTax,
                ]);
            }

            DB::connection('tenant')->commit();

            return $quotation->load('items');
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            throw $e;
        }
    }

    /**
     * Checks and marks the quotation as expired if the expiry date has passed.
     */
    public function enforceExpiry(QuotationModel $quotation): bool
    {
        if ($quotation->status === 'expired') {
            return true;
        }

        if ($quotation->expiry_date && Carbon::parse($quotation->expiry_date)->isPast()) {
            if (! in_array($quotation->status, ['accepted', 'rejected'])) {
                $quotation->update(['status' => 'expired']);

                return true;
            }
        }

        return false;
    }
}
