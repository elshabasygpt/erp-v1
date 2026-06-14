<?php

declare(strict_types=1);

namespace App\Domain\Subscription\Entities;

use App\Domain\Shared\Entity;

final class Plan extends Entity
{
    public function __construct(
        ?string $id,
        private string $name,
        private string $slug,
        private float $price,
        private string $billingCycle, // monthly, yearly
        private int $maxUsers,
        private int $maxProducts,
        private array $features = [],
        private bool $isActive = true,
        private ?int $trialDays = null,
        private ?string $description = null,
    ) {
        parent::__construct($id);
    }

    public function getName(): string { return $this->name; }
    public function getSlug(): string { return $this->slug; }
    public function getPrice(): float { return $this->price; }
    public function getBillingCycle(): string { return $this->billingCycle; }
    public function getMaxUsers(): int { return $this->maxUsers; }
    public function getMaxProducts(): int { return $this->maxProducts; }
    public function getFeatures(): array { return $this->features; }
    public function isActive(): bool { return $this->isActive; }
    public function getTrialDays(): ?int { return $this->trialDays; }
    public function getDescription(): ?string { return $this->description; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'price' => $this->price,
            'billing_cycle' => $this->billingCycle,
            'max_users' => $this->maxUsers,
            'max_products' => $this->maxProducts,
            'features' => $this->features,
            'is_active' => $this->isActive,
            'trial_days' => $this->trialDays,
            'description' => $this->description,
        ];
    }
}
