<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Entities;

use App\Domain\Shared\Entity;

final class Warehouse extends Entity
{
    public function __construct(
        ?string $id,
        private string $name,
        private ?string $location = null,
        private bool $isDefault = false,
        private bool $isActive = true,
        private ?string $createdBy = null,
    ) {
        parent::__construct($id);
    }

    public function getName(): string { return $this->name; }
    public function getLocation(): ?string { return $this->location; }
    public function isDefault(): bool { return $this->isDefault; }
    public function isActive(): bool { return $this->isActive; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'location' => $this->location,
            'is_default' => $this->isDefault,
            'is_active' => $this->isActive,
        ];
    }
}
