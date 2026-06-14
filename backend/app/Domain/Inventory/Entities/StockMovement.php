<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Entities;

use App\Domain\Shared\Entity;

final class StockMovement extends Entity
{
    public function __construct(
        ?string $id,
        private string $productId,
        private string $warehouseId,
        private string $type, // in, out, transfer, adjustment
        private float $quantity,
        private float $costPerUnit,
        private ?string $referenceType = null, // invoice, purchase, adjustment
        private ?string $referenceId = null,
        private ?string $notes = null,
        private ?string $createdBy = null,
        private ?\DateTimeImmutable $createdAt = null,
    ) {
        parent::__construct($id);
        $this->createdAt = $createdAt ?? new \DateTimeImmutable();
    }

    public function getProductId(): string { return $this->productId; }
    public function getWarehouseId(): string { return $this->warehouseId; }
    public function getType(): string { return $this->type; }
    public function getQuantity(): float { return $this->quantity; }
    public function getCostPerUnit(): float { return $this->costPerUnit; }
    public function getReferenceType(): ?string { return $this->referenceType; }
    public function getReferenceId(): ?string { return $this->referenceId; }
    public function getNotes(): ?string { return $this->notes; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->productId,
            'warehouse_id' => $this->warehouseId,
            'type' => $this->type,
            'quantity' => $this->quantity,
            'cost_per_unit' => $this->costPerUnit,
            'reference_type' => $this->referenceType,
            'reference_id' => $this->referenceId,
            'notes' => $this->notes,
        ];
    }
}
