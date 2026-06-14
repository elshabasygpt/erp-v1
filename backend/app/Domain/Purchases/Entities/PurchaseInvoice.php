<?php

declare(strict_types=1);

namespace App\Domain\Purchases\Entities;

use App\Domain\Shared\Entity;

final class PurchaseInvoice extends Entity
{
    private array $items = [];

    public function __construct(
        ?string $id,
        private string $invoiceNumber,
        private string $supplierId,
        private float $subtotal,
        private float $vatAmount,
        private float $total,
        private string $status, // draft, confirmed, cancelled
        private ?string $notes = null,
        private ?string $warehouseId = null,
        private ?string $createdBy = null,
        private ?string $updatedBy = null,
        private ?\DateTimeImmutable $invoiceDate = null,
    ) {
        parent::__construct($id);
        $this->invoiceDate = $invoiceDate ?? new \DateTimeImmutable();
    }

    public function getInvoiceNumber(): string { return $this->invoiceNumber; }
    public function getSupplierId(): string { return $this->supplierId; }
    public function getSubtotal(): float { return $this->subtotal; }
    public function getVatAmount(): float { return $this->vatAmount; }
    public function getTotal(): float { return $this->total; }
    public function getStatus(): string { return $this->status; }
    public function getNotes(): ?string { return $this->notes; }
    public function getWarehouseId(): ?string { return $this->warehouseId; }
    public function getInvoiceDate(): \DateTimeImmutable { return $this->invoiceDate; }
    public function getItems(): array { return $this->items; }

    public function setItems(array $items): void
    {
        $this->items = $items;
        $this->recalculate();
    }

    public function confirm(): void
    {
        if ($this->status !== 'draft') {
            throw new \DomainException('Only draft purchase invoices can be confirmed.');
        }
        $this->status = 'confirmed';
    }

    public function cancel(): void
    {
        if ($this->status === 'cancelled') {
            throw new \DomainException('Purchase invoice is already cancelled.');
        }
        $this->status = 'cancelled';
    }

    private function recalculate(): void
    {
        $this->subtotal = 0;
        $this->vatAmount = 0;

        foreach ($this->items as $item) {
            $lineTotal = $item['quantity'] * $item['unit_price'];
            $this->subtotal += $lineTotal;
            $this->vatAmount += $lineTotal * ($item['vat_rate'] / 100);
        }

        $this->total = $this->subtotal + $this->vatAmount;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoiceNumber,
            'supplier_id' => $this->supplierId,
            'subtotal' => $this->subtotal,
            'vat_amount' => $this->vatAmount,
            'total' => $this->total,
            'status' => $this->status,
            'notes' => $this->notes,
            'warehouse_id' => $this->warehouseId,
            'invoice_date' => $this->invoiceDate->format('Y-m-d H:i:s'),
        ];
    }
}
