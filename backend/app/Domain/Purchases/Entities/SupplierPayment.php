<?php

declare(strict_types=1);

namespace App\Domain\Purchases\Entities;

use App\Domain\Shared\Entity;

final class SupplierPayment extends Entity
{
    public function __construct(
        ?string $id,
        private string $supplierId,
        private ?string $purchaseInvoiceId,
        private float $amount,
        private string $paymentMethod, // cash, bank_transfer, check
        private ?string $reference = null,
        private ?string $notes = null,
        private ?string $createdBy = null,
        private ?\DateTimeImmutable $paymentDate = null,
    ) {
        parent::__construct($id);
        $this->paymentDate = $paymentDate ?? new \DateTimeImmutable();
    }

    public function getSupplierId(): string { return $this->supplierId; }
    public function getPurchaseInvoiceId(): ?string { return $this->purchaseInvoiceId; }
    public function getAmount(): float { return $this->amount; }
    public function getPaymentMethod(): string { return $this->paymentMethod; }
    public function getReference(): ?string { return $this->reference; }
    public function getNotes(): ?string { return $this->notes; }
    public function getPaymentDate(): \DateTimeImmutable { return $this->paymentDate; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'supplier_id' => $this->supplierId,
            'purchase_invoice_id' => $this->purchaseInvoiceId,
            'amount' => $this->amount,
            'payment_method' => $this->paymentMethod,
            'reference' => $this->reference,
            'notes' => $this->notes,
            'payment_date' => $this->paymentDate->format('Y-m-d'),
        ];
    }
}
