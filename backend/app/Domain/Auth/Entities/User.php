<?php

declare(strict_types=1);

namespace App\Domain\Auth\Entities;

use App\Domain\Shared\Entity;

final class User extends Entity
{
    public function __construct(
        ?string $id,
        private string $name,
        private string $email,
        private string $password,
        private ?string $roleId = null,
        private bool $isActive = true,
        private ?string $phone = null,
        private ?string $locale = 'en',
        private ?string $createdBy = null,
        private ?string $updatedBy = null,
    ) {
        parent::__construct($id);
    }

    public function getName(): string { return $this->name; }
    public function getEmail(): string { return $this->email; }
    public function getPassword(): string { return $this->password; }
    public function getRoleId(): ?string { return $this->roleId; }
    public function isActive(): bool { return $this->isActive; }
    public function getPhone(): ?string { return $this->phone; }
    public function getLocale(): ?string { return $this->locale; }
    public function getCreatedBy(): ?string { return $this->createdBy; }
    public function getUpdatedBy(): ?string { return $this->updatedBy; }

    public function deactivate(): void
    {
        $this->isActive = false;
    }

    public function activate(): void
    {
        $this->isActive = true;
    }

    public function changePassword(string $newPassword): void
    {
        $this->password = $newPassword;
    }

    public function assignRole(string $roleId): void
    {
        $this->roleId = $roleId;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role_id' => $this->roleId,
            'is_active' => $this->isActive,
            'phone' => $this->phone,
            'locale' => $this->locale,
        ];
    }
}
