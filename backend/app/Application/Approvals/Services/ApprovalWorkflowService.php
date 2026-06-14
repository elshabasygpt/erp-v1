<?php

declare(strict_types=1);

namespace App\Application\Approvals\Services;

use App\Domain\Sales\Entities\Invoice;
use App\Application\Sales\DTOs\CreateInvoiceDTO;
use App\Application\Sales\DTOs\Returns\ProcessSalesReturnDTO;
use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRuleModel;
use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use Illuminate\Support\Str;

class ApprovalWorkflowService
{
    /**
     * Evaluate an invoice against approval rules.
     * Returns an array of triggered rules data, or empty array if clear.
     */
    public function evaluateInvoice(Invoice $invoice, CreateInvoiceDTO $dto): array
    {
        $triggers = [];
        $rules = ApprovalRuleModel::where('entity_type', 'invoice')->where('is_active', true)->get();

        if ($rules->isEmpty()) {
            return $triggers;
        }

        // Check High Discount
        $discountRule = $rules->firstWhere('trigger_type', 'high_discount');
        if ($discountRule) {
            $totalDiscountPercent = $invoice->getSubtotal() > 0 
                ? ($invoice->getDiscountAmount() / $invoice->getSubtotal()) * 100 
                : 0;
            
            // Also check item-level discounts
            $hasItemHighDiscount = false;
            foreach ($dto->items as $item) {
                if ($item->discountPercent > (float)$discountRule->threshold) {
                    $hasItemHighDiscount = true;
                    break;
                }
            }

            if ($totalDiscountPercent > (float)$discountRule->threshold || $hasItemHighDiscount) {
                $triggers[] = [
                    'rule' => $discountRule,
                    'reason' => "Discount limit of {$discountRule->threshold}% exceeded."
                ];
            }
        }

        // Check Negative Margin and Manual Price Override
        $marginRule = $rules->firstWhere('trigger_type', 'negative_margin');
        $priceOverrideRule = $rules->firstWhere('trigger_type', 'manual_price_override');
        
        $totalCost = 0;
        $hasPriceOverride = false;
        
        foreach ($dto->items as $item) {
            $product = ProductModel::find($item->productId);
            if ($product) {
                $totalCost += ($product->cost_price * $item->quantity);
                if ($priceOverrideRule && $item->unitPrice != $product->sell_price) {
                    $hasPriceOverride = true;
                }
            }
        }

        if ($marginRule && $invoice->getTotal() < $totalCost) {
            $triggers[] = [
                'rule' => $marginRule,
                'reason' => "Negative margin detected. Total: {$invoice->getTotal()}, Cost: {$totalCost}."
            ];
        }

        if ($priceOverrideRule && $hasPriceOverride) {
            $triggers[] = [
                'rule' => $priceOverrideRule,
                'reason' => "Manual price override detected on one or more items."
            ];
        }

        // Check Credit Limit Exceeded
        $creditRule = $rules->firstWhere('trigger_type', 'credit_limit_exceeded');
        if ($creditRule && $dto->type === 'credit' && $dto->customerId) {
            $customer = CustomerModel::find($dto->customerId);
            if ($customer) {
                $dueAmount = $invoice->getTotal() - $dto->paidAmount;
                if ($dueAmount > 0 && ($customer->balance + $dueAmount) > $customer->credit_limit) {
                    $triggers[] = [
                        'rule' => $creditRule,
                        'reason' => "Credit limit exceeded. Customer balance: {$customer->balance}, Limit: {$customer->credit_limit}."
                    ];
                }
            }
        }

        return $triggers;
    }

    /**
     * Evaluate a sales return against approval rules.
     */
    public function evaluateReturn(ProcessSalesReturnDTO $dto): array
    {
        $triggers = [];
        $rules = ApprovalRuleModel::where('entity_type', 'return')->where('is_active', true)->get();

        if ($rules->isEmpty()) {
            return $triggers;
        }

        $refundRule = $rules->firstWhere('trigger_type', 'refund');
        if ($refundRule && in_array($dto->refundMethod, ['cash', 'card', 'bank_transfer'])) {
            $triggers[] = [
                'rule' => $refundRule,
                'reason' => "Direct refund method ({$dto->refundMethod}) requires approval."
            ];
        }

        $exchangeRule = $rules->firstWhere('trigger_type', 'exchange');
        if ($exchangeRule && $dto->reason === 'exchange') {
            $triggers[] = [
                'rule' => $exchangeRule,
                'reason' => "Exchange request requires approval."
            ];
        }

        return $triggers;
    }

    /**
     * Create an approval request
     */
    public function requestApproval(string $entityType, string $entityId, array $triggers, string $userId, array $payload = []): void
    {
        foreach ($triggers as $trigger) {
            ApprovalRequestModel::create([
                'id' => Str::uuid()->toString(),
                'rule_id' => $trigger['rule']->id,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'trigger_type' => $trigger['rule']->trigger_type,
                'status' => 'pending',
                'requested_by' => $userId,
                'notes' => $trigger['reason'],
                'payload' => $payload
            ]);
        }
    }
}
