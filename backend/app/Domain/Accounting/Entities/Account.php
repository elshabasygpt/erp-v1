<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Entities;

use App\Domain\Shared\Entity;

final class Account extends Entity
{
    public function __construct(
        ?string $id,
        private string $code,
        private string $name,
        private string $nameAr,
        private string $type, // asset, liability, equity, revenue, expense
        private ?string $parentId = null,
        private bool $isActive = true,
        private ?string $description = null,
        private int $level = 1,
        private ?string $createdBy = null,
    ) {
        parent::__construct($id);
        $this->validateType($type);
    }

    public function getCode(): string { return $this->code; }
    public function getName(): string { return $this->name; }
    public function getNameAr(): string { return $this->nameAr; }
    public function getType(): string { return $this->type; }
    public function getParentId(): ?string { return $this->parentId; }
    public function isActive(): bool { return $this->isActive; }
    public function getDescription(): ?string { return $this->description; }
    public function getLevel(): int { return $this->level; }

    public function isDebitNormal(): bool
    {
        return in_array($this->type, ['asset', 'expense']);
    }

    public function isCreditNormal(): bool
    {
        return in_array($this->type, ['liability', 'equity', 'revenue']);
    }

    private function validateType(string $type): void
    {
        $allowed = ['asset', 'liability', 'equity', 'revenue', 'expense'];
        if (!in_array($type, $allowed)) {
            throw new \InvalidArgumentException("Invalid account type: {$type}. Allowed: " . implode(', ', $allowed));
        }
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'name_ar' => $this->nameAr,
            'type' => $this->type,
            'parent_id' => $this->parentId,
            'is_active' => $this->isActive,
            'description' => $this->description,
            'level' => $this->level,
        ];
    }
}
