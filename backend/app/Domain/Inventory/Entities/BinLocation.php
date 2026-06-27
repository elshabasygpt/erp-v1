<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Entities;

use App\Domain\Shared\Entity;

final class BinLocation extends Entity
{
    public function __construct(
        ?string $id,
        private string $warehouseId,
        private ?string $zone,
        private ?string $rack,
        private ?string $shelf,
        private ?string $bin,
        private ?string $name = null,
        private ?string $description = null,
        private bool $isActive = true,
        private ?float $capacity = null,
        private ?string $createdBy = null,
    ) {
        parent::__construct($id);
    }

    public function getWarehouseId(): string { return $this->warehouseId; }
    public function getZone(): ?string { return $this->zone; }
    public function getRack(): ?string { return $this->rack; }
    public function getShelf(): ?string { return $this->shelf; }
    public function getBin(): ?string { return $this->bin; }
    public function getName(): ?string { return $this->name; }
    public function getDescription(): ?string { return $this->description; }
    public function isActive(): bool { return $this->isActive; }
    public function getCapacity(): ?float { return $this->capacity; }

    public function getFullPath(): string
    {
        return implode('-', array_filter([$this->zone, $this->rack, $this->shelf, $this->bin]));
    }

    public function toArray(): array
    {
        return [
            'id'           => $this->id,
            'warehouse_id' => $this->warehouseId,
            'zone'         => $this->zone,
            'rack'         => $this->rack,
            'shelf'        => $this->shelf,
            'bin'          => $this->bin,
            'full_path'    => $this->getFullPath(),
            'name'         => $this->name,
            'description'  => $this->description,
            'is_active'    => $this->isActive,
            'capacity'     => $this->capacity,
        ];
    }
}
