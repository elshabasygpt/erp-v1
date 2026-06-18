<?php

declare(strict_types=1);

namespace App\Domain\Sales\Entities;

use App\Domain\Shared\Entity;

final class Invoice extends Entity
{
    private array $items = [];

    public function __construct(
        ?string $id,
        private string $invoiceNumber,
        private ?string $customerId,
        private string $type, // cash, credit
        private float $subtotal,
        private float $vatAmount,
        private float $discountAmount,
        private float $total,
        private string $status, // draft, confirmed, cancelled, returned
        private ?string $notes = null,
        private ?string $warehouseId = null,
        private ?string $createdBy = null,
        private ?string $updatedBy = null,
        private ?\DateTimeImmutable $invoiceDate = null,
        private ?string $zatcaQrCode = null,
        private ?string $zatcaXml = null,
        private ?string $zatcaHash = null,
        private ?string $zatcaUuid = null,
        private string $zatcaStatus = 'pending',
        private ?string $zatcaErrorMessage = null,
        private ?string $salesChannelId = null,
        private ?string $salesChannelName = null,
        private ?string $pricingAdjustmentType = null,
        private ?float $pricingAdjustmentValue = null,
        private ?\DateTimeImmutable $dueDate = null,
        private ?string $internalNotes = null,
        private ?string $referenceNo = null,
        private float $paidAmount = 0,
        private ?string $salespersonId = null,
        private ?string $costCenterId = null,
        private ?string $currencyId = null,
        private ?float $exchangeRate = null,
    ) {
        parent::__construct($id);
        $this->invoiceDate = $invoiceDate ?? new \DateTimeImmutable;
    }

    // Getters
    public function getInvoiceNumber(): string
    {
        return $this->invoiceNumber;
    }

    public function getCustomerId(): ?string
    {
        return $this->customerId;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getSubtotal(): float
    {
        return $this->subtotal;
    }

    public function getVatAmount(): float
    {
        return $this->vatAmount;
    }

    public function getDiscountAmount(): float
    {
        return $this->discountAmount;
    }

    public function getTotal(): float
    {
        return $this->total;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function getWarehouseId(): ?string
    {
        return $this->warehouseId;
    }

    public function getCreatedBy(): ?string
    {
        return $this->createdBy;
    }

    public function getInvoiceDate(): \DateTimeImmutable
    {
        return $this->invoiceDate;
    }

    public function getItems(): array
    {
        return $this->items;
    }

    public function getSalesChannelId(): ?string
    {
        return $this->salesChannelId;
    }

    public function getSalesChannelName(): ?string
    {
        return $this->salesChannelName;
    }

    public function getPricingAdjustmentType(): ?string
    {
        return $this->pricingAdjustmentType;
    }

    public function getPricingAdjustmentValue(): ?float
    {
        return $this->pricingAdjustmentValue;
    }

    public function getDueDate(): ?\DateTimeImmutable
    {
        return $this->dueDate;
    }

    public function getInternalNotes(): ?string
    {
        return $this->internalNotes;
    }

    public function getReferenceNo(): ?string
    {
        return $this->referenceNo;
    }

    public function getPaidAmount(): float
    {
        return $this->paidAmount;
    }

    public function getSalespersonId(): ?string
    {
        return $this->salespersonId;
    }

    public function getCostCenterId(): ?string
    {
        return $this->costCenterId;
    }

    public function getCurrencyId(): ?string
    {
        return $this->currencyId;
    }

    public function getExchangeRate(): ?float
    {
        return $this->exchangeRate;
    }

    public function getZatcaQrCode(): ?string
    {
        return $this->zatcaQrCode;
    }

    public function getZatcaXml(): ?string
    {
        return $this->zatcaXml;
    }

    public function getZatcaHash(): ?string
    {
        return $this->zatcaHash;
    }

    public function getZatcaUuid(): ?string
    {
        return $this->zatcaUuid;
    }

    public function getZatcaStatus(): string
    {
        return $this->zatcaStatus;
    }

    public function getZatcaErrorMessage(): ?string
    {
        return $this->zatcaErrorMessage;
    }

    public function setZatcaQrCode(?string $qrCode): void
    {
        $this->zatcaQrCode = $qrCode;
    }

    public function setZatcaPhase2Data(?string $xml, ?string $hash, ?string $uuid): void
    {
        $this->zatcaXml = $xml;
        $this->zatcaHash = $hash;
        $this->zatcaUuid = $uuid;
    }

    public function updateZatcaStatus(string $status, ?string $errorMessage = null): void
    {
        $this->zatcaStatus = $status;
        $this->zatcaErrorMessage = $errorMessage;
    }

    public function addItem(InvoiceItem $item): void
    {
        $this->items[] = $item;
        $this->recalculate();
    }

    public function setItems(array $items): void
    {
        $this->items = $items;
        $this->recalculate();
    }

    public function confirm(): void
    {
        if ($this->status !== 'draft') {
            throw new \DomainException('Only draft invoices can be confirmed.');
        }
        $this->status = 'confirmed';
    }

    public function setStatus(string $status): void
    {
        $validStatuses = ['draft', 'pending_approval', 'confirmed', 'cancelled', 'returned'];
        if (! in_array($status, $validStatuses)) {
            throw new \DomainException("Invalid invoice status: {$status}");
        }
        $this->status = $status;
    }

    public function cancel(): void
    {
        if ($this->status === 'cancelled') {
            throw new \DomainException('Invoice is already cancelled.');
        }
        $this->status = 'cancelled';
    }

    public function markAsReturned(): void
    {
        if ($this->status !== 'confirmed') {
            throw new \DomainException('Only confirmed invoices can be returned.');
        }
        $this->status = 'returned';
    }

    private function recalculate(): void
    {
        $this->subtotal = 0;
        $this->vatAmount = 0;
        $this->discountAmount = 0;

        foreach ($this->items as $item) {
            $this->subtotal += $item->getSubtotal();
            $this->vatAmount += $item->getVatTotal();
            $this->discountAmount += $item->getDiscountTotal();
        }

        $this->total = $this->subtotal + $this->vatAmount - $this->discountAmount;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoiceNumber,
            'customer_id' => $this->customerId,
            'type' => $this->type,
            'subtotal' => $this->subtotal,
            'vat_amount' => $this->vatAmount,
            'discount_amount' => $this->discountAmount,
            'total' => $this->total,
            'status' => $this->status,
            'notes' => $this->notes,
            'warehouse_id' => $this->warehouseId,
            'invoice_date' => $this->invoiceDate->format('Y-m-d H:i:s'),
            'zatca_qr_code' => $this->zatcaQrCode,
            'zatca_status' => $this->zatcaStatus,
            'zatca_error_message' => $this->zatcaErrorMessage,
            'cost_center_id' => $this->costCenterId,
            'currency_id' => $this->currencyId,
            'exchange_rate' => $this->exchangeRate,
            'items' => array_map(fn (InvoiceItem $item) => $item->toArray(), $this->items),
        ];
    }
}
