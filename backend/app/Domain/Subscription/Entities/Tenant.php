<?php

declare(strict_types=1);

namespace App\Domain\Subscription\Entities;

use App\Domain\Shared\Entity;

final class Tenant extends Entity
{
    public function __construct(
        ?string $id,
        private string $name,
        private string $domain,
        private string $databaseName,
        private string $status, // active, suspended, trial, cancelled
        private ?\DateTimeImmutable $trialEndsAt = null,
        private ?string $createdBy = null,
        private ?\DateTimeImmutable $createdAt = null,
    ) {
        parent::__construct($id);
        $this->createdAt = $createdAt ?? new \DateTimeImmutable();
    }

    public function getName(): string { return $this->name; }
    public function getDomain(): string { return $this->domain; }
    public function getDatabaseName(): string { return $this->databaseName; }
    public function getStatus(): string { return $this->status; }
    public function getTrialEndsAt(): ?\DateTimeImmutable { return $this->trialEndsAt; }

    public function suspend(): void
    {
        $this->status = 'suspended';
    }

    public function activate(): void
    {
        $this->status = 'active';
    }

    public function isTrialExpired(): bool
    {
        if ($this->trialEndsAt === null) {
            return false;
        }
        return $this->trialEndsAt < new \DateTimeImmutable();
    }

    public function isActive(): bool
    {
        return $this->status === 'active' || ($this->status === 'trial' && !$this->isTrialExpired());
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'domain' => $this->domain,
            'database_name' => $this->databaseName,
            'status' => $this->status,
            'trial_ends_at' => $this->trialEndsAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->createdAt->format('Y-m-d H:i:s'),
        ];
    }
}
