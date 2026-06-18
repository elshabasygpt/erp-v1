<?php

declare(strict_types=1);

namespace App\Application\Sales\DTOs;

final class InvoiceItemDTO
{
    public function __construct(
        public readonly string $productId,
        public readonly float $quantity,
        public readonly float $unitPrice,
        public readonly float $discountPercent = 0,
        public readonly float $vatRate = 15, // Default 15% VAT
        public readonly ?float $baseUnitPrice = 0.0,
        public readonly ?float $adjustedUnitPrice = 0.0,
        public readonly ?float $adjustmentAmount = 0.0,
        public readonly bool $coreChargeApplied = false,
        public readonly float $coreChargeAmount = 0.0,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            productId: $data['product_id'],
            quantity: (float) $data['quantity'],
            unitPrice: (float) $data['unit_price'],
            discountPercent: (float) ($data['discount_percent'] ?? 0),
            vatRate: (float) ($data['vat_rate'] ?? 15),
            baseUnitPrice: isset($data['base_unit_price']) ? (float) $data['base_unit_price'] : (float) $data['unit_price'],
            adjustedUnitPrice: isset($data['adjusted_unit_price']) ? (float) $data['adjusted_unit_price'] : (float) $data['unit_price'],
            adjustmentAmount: isset($data['adjustment_amount']) ? (float) $data['adjustment_amount'] : 0.0,
            coreChargeApplied: isset($data['core_charge_applied']) ? (bool) $data['core_charge_applied'] : false,
            coreChargeAmount: isset($data['core_charge_amount']) ? (float) $data['core_charge_amount'] : 0.0,
        );
    }
}
