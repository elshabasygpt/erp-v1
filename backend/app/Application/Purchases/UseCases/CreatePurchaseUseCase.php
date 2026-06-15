<?php

declare(strict_types=1);

namespace App\Application\Purchases\UseCases;

use App\Application\Purchases\DTOs\CreatePurchaseDTO;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceItemModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * CreatePurchaseUseCase
 *
 * Handles the creation of a purchase invoice (draft or confirmed).
 * If status is 'confirmed', delegates to ConfirmPurchaseUseCase.
 */
final class CreatePurchaseUseCase
{
    public function __construct(
        private ConfirmPurchaseUseCase $confirmUseCase,
    ) {}

    public function execute(CreatePurchaseDTO $dto, string $userId): PurchaseInvoiceModel
    {
        return DB::connection('tenant')->transaction(function () use ($dto, $userId) {
            $invoiceId = Str::uuid()->toString();
            $subtotalAmount = 0;
            $taxAmount = 0;

            foreach ($dto->items as $item) {
                $itemSub = round($item['quantity'] * $item['unit_price'], 2);
                $itemTax = round($itemSub * ($item['tax_rate'] / 100), 2);
                $subtotalAmount += $itemSub;
                $taxAmount += $itemTax;
            }
            $totalAmount = round($subtotalAmount + $taxAmount, 2);

            // Generate invoice number
            $lastInvoice = PurchaseInvoiceModel::latest('created_at')->first();
            $nextNum = $lastInvoice ? ((int) str_replace('PO-', '', $lastInvoice->invoice_number)) + 1 : 1;
            $invoiceNumber = 'PO-' . str_pad((string)$nextNum, 6, '0', STR_PAD_LEFT);

            $purchase = PurchaseInvoiceModel::create([
                'id' => $invoiceId,
                'invoice_number' => $invoiceNumber,
                'supplier_id' => $dto->supplierId,
                'warehouse_id' => $dto->warehouseId,
                'invoice_date' => $dto->issueDate,
                'subtotal' => $subtotalAmount,
                'vat_amount' => $taxAmount,
                'total' => $totalAmount,
                'status' => $dto->status === 'confirmed' ? 'draft' : $dto->status,
                'notes' => $dto->notes,
                'created_by' => $userId,
                'cost_center_id' => $dto->costCenterId,
                'currency_id' => $dto->currencyId,
                'exchange_rate' => $dto->exchangeRate,
            ]);

            foreach ($dto->items as $item) {
                $itemSub = round($item['quantity'] * $item['unit_price'], 2);
                $itemTax = round($itemSub * ($item['tax_rate'] / 100), 2);

                PurchaseInvoiceItemModel::create([
                    'id' => Str::uuid()->toString(),
                    'purchase_invoice_id' => $purchase->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'vat_rate' => $item['tax_rate'],
                    'total' => round($itemSub + $itemTax, 2),
                    'lot_number' => $item['lot_number'] ?? null,
                    'serial_number' => $item['serial_number'] ?? null,
                    'production_date' => $item['production_date'] ?? null,
                    'expiry_date' => $item['expiry_date'] ?? null,
                ]);
            }

            // If requested as confirmed, run the confirmation flow
            if ($dto->status === 'confirmed') {
                $this->confirmUseCase->execute($purchase->id, $dto->paymentType, $userId);
                $purchase->refresh();
            }

            return $purchase->load('items');
        });
    }
}
