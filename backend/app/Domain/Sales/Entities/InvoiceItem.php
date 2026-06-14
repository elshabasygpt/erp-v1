<?php

declare(strict_types=1);

namespace App\Domain\Sales\Entities;

use App\Domain\Shared\Entity;

final class InvoiceItem extends Entity
{
    public function __construct(
        ?string $id,
        private string $invoiceId,
        private string $productId,
        private float $quantity,
        private float $unitPrice,
        private float $discountPercent,
        private float $vatRate,
        private ?string $productName = null,
        private ?float $baseUnitPrice = null,
        private ?float $adjustedUnitPrice = null,
        private ?float $adjustmentAmount = null,
        private ?string $stockLotId = null,
    ) {
        parent::__construct($id);
    }

    public function getInvoiceId(): string { return $this->invoiceId; }
    public function getProductId(): string { return $this->productId; }
    public function getQuantity(): float { return $this->quantity; }
    public function getUnitPrice(): float { return $this->unitPrice; }
    public function getDiscountPercent(): float { return $this->discountPercent; }
    public function getVatRate(): float { return $this->vatRate; }
    public function getProductName(): ?string { return $this->productName; }
    public function getBaseUnitPrice(): ?float { return $this->baseUnitPrice; }
    public function getAdjustedUnitPrice(): ?float { return $this->adjustedUnitPrice; }
    public function getAdjustmentAmount(): ?float { return $this->adjustmentAmount; }
    public function getStockLotId(): ?string { return $this->stockLotId; }

    public function getSubtotal(): float
    {
        return $this->quantity * $this->unitPrice;
    }

    public function getDiscountTotal(): float
    {
        return $this->getSubtotal() * ($this->discountPercent / 100);
    }

    public function getVatTotal(): float
    {
        $afterDiscount = $this->getSubtotal() - $this->getDiscountTotal();
        return $afterDiscount * ($this->vatRate / 100);
    }

    public function getTotal(): float
    {
        return $this->getSubtotal() - $this->getDiscountTotal() + $this->getVatTotal();
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'invoice_id' => $this->invoiceId,
            'product_id' => $this->productId,
            'product_name' => $this->productName,
            'quantity' => $this->quantity,
            'unit_price' => $this->unitPrice,
            'discount_percent' => $this->discountPercent,
            'vat_rate' => $this->vatRate,
            'subtotal' => $this->getSubtotal(),
            'discount_total' => $this->getDiscountTotal(),
            'vat_total' => $this->getVatTotal(),
            'total' => $this->getTotal(),
            'base_unit_price' => $this->baseUnitPrice,
            'adjusted_unit_price' => $this->adjustedUnitPrice,
            'adjustment_amount' => $this->adjustmentAmount,
            'stock_lot_id' => $this->stockLotId,
        ];
    }
}
