<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\Returns;

use App\Application\Approvals\Services\ApprovalWorkflowService;
use App\Application\Exceptions\ApprovalRequiredException;
use App\Application\Sales\DTOs\Returns\ProcessSalesReturnDTO;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\SalesReturnItemModel;
use App\Infrastructure\Eloquent\Models\SalesReturnModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ProcessSalesReturnUseCase
{
    public function __construct(
        private readonly ApprovalWorkflowService $approvalService
    ) {}

    public function execute(ProcessSalesReturnDTO $dto, string $userId): SalesReturnModel
    {
        return DB::connection('tenant')->transaction(function () use ($dto, $userId) {
            $invoice = InvoiceModel::query()->with('items')->findOrFail($dto->invoiceId);
            $customer = CustomerModel::query()->findOrFail($dto->customerId);

            // Validation and calculation
            $subtotalAmount = 0;
            $taxAmount = 0;
            $totalProfit = 0;
            $itemsToReturn = [];

            foreach ($dto->items as $reqItem) {
                // Find matching item in invoice to get exact price and tax rate
                $invItem = $invoice->items->firstWhere('product_id', $reqItem['productId']);
                if (! $invItem) {
                    throw new \DomainException("Product ID {$reqItem['productId']} was not found on the selected invoice.");
                }

                if ($reqItem['quantity'] > $invItem->quantity) {
                    throw new \DomainException("Cannot return more than invoiced quantity for product {$reqItem['productId']}");
                }

                // Note: We should ideally track previously returned quantities, but keeping it simple for MVP.

                $gross = $reqItem['quantity'] * $invItem->unit_price;
                $itemTax = $gross * ($invItem->vat_rate / 100);

                $subtotalAmount += $gross;
                $taxAmount += $itemTax;
                $totalProfit += ($invItem->unit_price - $invItem->cost_price) * $reqItem['quantity'];

                $itemsToReturn[] = [
                    'product_id' => $reqItem['productId'],
                    'quantity' => $reqItem['quantity'],
                    'unit_price' => $invItem->unit_price,
                    'cost_price' => $invItem->cost_price,
                    'vat_rate' => $invItem->vat_rate,
                    'total' => $gross + $itemTax,
                    'condition' => $reqItem['condition'],
                ];
            }

            $totalAmount = $subtotalAmount + $taxAmount;

            // Calculate Commission reversal (negative)
            $currentUser = auth()->user();
            $commissionRate = (float) ($currentUser->commission_rate ?? 0);
            $commissionAmount = -($totalProfit * ($commissionRate / 100));

            // Generate Return Number
            $lastReturn = SalesReturnModel::latest('created_at')->first();
            $nextNum = $lastReturn ? ((int) str_replace('RET-', '', $lastReturn->return_number)) + 1 : 1;
            $returnNumber = 'RET-'.str_pad((string) $nextNum, 6, '0', STR_PAD_LEFT);

            // 4.5. Evaluate Approvals
            $triggers = $this->approvalService->evaluateReturn($dto);
            if (! empty($triggers)) {
                // Create Return Entity as pending_approval
                $salesReturn = SalesReturnModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'return_number' => $returnNumber,
                    'invoice_id' => $invoice->id,
                    'customer_id' => $customer->id,
                    'warehouse_id' => $dto->warehouseId,
                    'return_date' => now(),
                    'subtotal' => $subtotalAmount,
                    'vat_amount' => $taxAmount,
                    'total' => $totalAmount,
                    'commission_amount' => $commissionAmount,
                    'status' => 'pending_approval',
                    'return_type' => $dto->returnType,
                    'refund_method' => $dto->refundMethod,
                    'reason' => $dto->reason,
                    'approval_status' => 'pending',
                    'notes' => $dto->notes,
                    'created_by' => $userId,
                ]);

                // Save items
                foreach ($itemsToReturn as $item) {
                    SalesReturnItemModel::query()->create([
                        'id' => Str::uuid()->toString(),
                        'sales_return_id' => $salesReturn->id,
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'cost_price' => $item['cost_price'],
                        'vat_rate' => $item['vat_rate'],
                        'total' => $item['total'],
                        'condition' => $item['condition'],
                    ]);
                }

                $this->approvalService->requestApproval('return', $salesReturn->id, $triggers, $userId);
                throw new ApprovalRequiredException('Sales Return requires manager approval due to: '.$triggers[0]['reason'], $salesReturn->id);
            }

            // 1. Create Return Entity
            $salesReturn = SalesReturnModel::query()->create([
                'id' => Str::uuid()->toString(),
                'return_number' => $returnNumber,
                'invoice_id' => $invoice->id,
                'customer_id' => $customer->id,
                'warehouse_id' => $dto->warehouseId,
                'return_date' => now(),
                'subtotal' => $subtotalAmount,
                'vat_amount' => $taxAmount,
                'total' => $totalAmount,
                'commission_amount' => $commissionAmount,
                'status' => 'draft',
                'return_type' => $dto->returnType,
                'refund_method' => $dto->refundMethod,
                'reason' => $dto->reason,
                'approval_status' => 'approved',
                'notes' => $dto->notes,
                'created_by' => $userId,
            ]);

            foreach ($itemsToReturn as $item) {
                SalesReturnItemModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'sales_return_id' => $salesReturn->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'cost_price' => $item['cost_price'],
                    'vat_rate' => $item['vat_rate'],
                    'total' => $item['total'],
                    'condition' => $item['condition'],
                ]);
            }

            // Immediately confirm if no approval needed
            $confirmUseCase = app(ConfirmSalesReturnUseCase::class);
            $confirmUseCase->execute($salesReturn->id, $userId);

            return $salesReturn->load('items.product');
        });
    }
}
