<?php

declare(strict_types=1);

namespace App\Application\Purchases\DTOs;

/**
 * Data Transfer Object for creating a purchase invoice.
 * Validates and encapsulates all input data from the controller.
 */
final class CreatePurchaseDTO
{
    /**
     * @param array<array{product_id: string, quantity: float, unit_price: float, tax_rate: float, lot_number?: string, serial_number?: string, production_date?: string, expiry_date?: string}> $items
     */
    public function __construct(
        public readonly string $supplierId,
        public readonly string $warehouseId,
        public readonly string $issueDate,
        public readonly string $status,
        public readonly string $paymentType,
        public readonly ?string $notes,
        public readonly array $items,
        public readonly ?string $costCenterId = null,
        public readonly ?string $currencyId = null,
        public readonly ?float $exchangeRate = null,
    ) {}

    public static function fromRequest(array $validated): self
    {
        return new self(
            supplierId: $validated['supplier_id'],
            warehouseId: $validated['warehouse_id'],
            issueDate: $validated['issue_date'],
            status: $validated['status'],
            paymentType: $validated['payment_type'],
            notes: $validated['notes'] ?? null,
            items: $validated['items'],
            costCenterId: $validated['cost_center_id'] ?? null,
            currencyId: $validated['currency_id'] ?? null,
            exchangeRate: isset($validated['exchange_rate']) ? (float) $validated['exchange_rate'] : null,
        );
    }
}
