<?php

declare(strict_types=1);

namespace App\Domain\Sales\Services;

use App\Application\Sales\DTOs\CreateSalesOrderDTO;
use App\Application\Sales\UseCases\SalesOrders\CreateSalesOrderUseCase;
use App\Infrastructure\Eloquent\Models\QuotationModel;
use App\Infrastructure\Eloquent\Models\SalesOrderModel;
use DomainException;

class SalesWorkflowService
{
    public function __construct(
        private readonly QuotationService $quotationService,
        private readonly CreateSalesOrderUseCase $createSalesOrderUseCase
    ) {}

    /**
     * Converts an accepted quotation directly into a Sales Order.
     */
    public function convertQuotationToSalesOrder(string $tenantId, string $quotationId, string $userId): SalesOrderModel
    {
        $quotation = QuotationModel::query()->where('tenant_id', $tenantId)->with('items')->find($quotationId);

        if (! $quotation) {
            throw new DomainException('Quotation not found');
        }

        if ($this->quotationService->enforceExpiry($quotation)) {
            throw new DomainException('Cannot convert an expired quotation.');
        }

        if ($quotation->status !== 'accepted') {
            throw new DomainException('Quotation must be accepted before converting to a Sales Order.');
        }

        // Map items
        $items = $quotation->items->map(function ($item) {
            return [
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'vat_rate' => $item->vat_rate,
            ];
        })->toArray();

        // Prepare SO Data
        $data = [
            'tenant_id' => $tenantId,
            'customer_id' => $quotation->customer_id,
            'warehouse_id' => $quotation->warehouse_id ?? null, // Will fail validation if null but required by DTO
            'quotation_id' => $quotation->id,
            'status' => 'draft',
            'items' => $items,
        ];

        if (empty($data['warehouse_id'])) {
            throw new DomainException('Quotation is missing a designated warehouse for fulfillment.');
        }

        $dto = CreateSalesOrderDTO::fromRequest($data);

        // Use the CreateSalesOrderUseCase which handles stock reservations and calculations
        return $this->createSalesOrderUseCase->execute($dto, $userId);
    }
}
