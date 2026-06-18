<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\Quotations;

use App\Application\Sales\DTOs\CreateQuotationDTO;
use App\Infrastructure\Eloquent\Models\QuotationItemModel;
use App\Infrastructure\Eloquent\Models\QuotationModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreateQuotationUseCase
{
    public function execute(CreateQuotationDTO $dto, string $userId): QuotationModel
    {
        return DB::connection('tenant')->transaction(function () use ($dto, $userId) {

            $subtotal = 0;
            $vatAmount = 0;

            // Calculate totals manually or rely on DTO items
            // Assuming $dto->items is an array of arrays from request for simplicity
            $itemsData = [];
            foreach ($dto->items as $item) {
                $qty = (float) $item['quantity'];
                $price = (float) $item['unit_price'];
                $vatRate = (float) ($item['vat_rate'] ?? 15);

                $lineSubtotal = $qty * $price;
                $lineVat = $lineSubtotal * ($vatRate / 100);
                $lineTotal = $lineSubtotal + $lineVat;

                $subtotal += $lineSubtotal;
                $vatAmount += $lineVat;

                $itemsData[] = [
                    'id' => Str::uuid()->toString(),
                    'product_id' => $item['product_id'],
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'vat_rate' => $vatRate,
                    'total' => $lineTotal,
                ];
            }

            $total = $subtotal + $vatAmount;

            $revisionNumber = 1;
            if ($dto->parentId) {
                $parent = QuotationModel::query()->find($dto->parentId);
                if ($parent) {
                    $revisionNumber = QuotationModel::query()->where('parent_id', $dto->parentId)
                        ->orWhere('id', $dto->parentId)
                        ->max('revision_number') + 1;
                }
            }

            $quotation = QuotationModel::query()->create([
                'id' => Str::uuid()->toString(),
                'quotation_number' => 'QT-'.date('YmdHis').rand(10, 99),
                'parent_id' => $dto->parentId,
                'revision_number' => $revisionNumber,
                'customer_id' => $dto->customerId,
                'warehouse_id' => $dto->warehouseId,
                'issue_date' => $dto->issueDate ?? now(),
                'expiry_date' => $dto->expiryDate,
                'subtotal' => $subtotal,
                'vat_amount' => $vatAmount,
                'total' => $total,
                'status' => 'draft',
                'notes' => $dto->notes,
                'created_by' => $userId,
            ]);

            foreach ($itemsData as $itemData) {
                $itemData['quotation_id'] = $quotation->id;
                QuotationItemModel::query()->create($itemData);
            }

            return $quotation->load('items');
        });
    }
}
