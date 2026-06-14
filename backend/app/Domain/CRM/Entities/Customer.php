<?php

declare(strict_types=1);

namespace App\Domain\CRM\Entities;

use App\Domain\Shared\Entity;

final class Customer extends Entity
{
    public function __construct(
        ?string $id,
        private string $name,
        private ?string $email = null,
        private ?string $phone = null,
        private ?string $address = null,
        private ?string $taxNumber = null,
        private float $balance = 0,
        private bool $isActive = true,
        private ?string $createdBy = null,
        private ?string $updatedBy = null,
    ) {
        parent::__construct($id);
    }

    public function getName(): string { return $this->name; }
    public function getEmail(): ?string { return $this->email; }
    public function getPhone(): ?string { return $this->phone; }
    public function getAddress(): ?string { return $this->address; }
    public function getTaxNumber(): ?string { return $this->taxNumber; }
    public function getBalance(): float { return $this->balance; }
    public function isActive(): bool { return $this->isActive; }

    public function adjustBalance(float $amount): void
    {
        $this->balance += $amount;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'tax_number' => $this->taxNumber,
            'balance' => $this->balance,
            'is_active' => $this->isActive,
        ];
    }
}
