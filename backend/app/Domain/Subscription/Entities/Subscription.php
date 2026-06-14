<?php

declare(strict_types=1);

namespace App\Domain\Subscription\Entities;

use App\Domain\Shared\Entity;

final class Subscription extends Entity
{
    public function __construct(
        ?string $id,
        private string $tenantId,
        private string $planId,
        private string $status, // active, cancelled, expired, past_due
        private \DateTimeImmutable $startsAt,
        private \DateTimeImmutable $endsAt,
        private ?\DateTimeImmutable $trialEndsAt = null,
        private ?\DateTimeImmutable $cancelledAt = null,
    ) {
        parent::__construct($id);
    }

    public function getTenantId(): string { return $this->tenantId; }
    public function getPlanId(): string { return $this->planId; }
    public function getStatus(): string { return $this->status; }
    public function getStartsAt(): \DateTimeImmutable { return $this->startsAt; }
    public function getEndsAt(): \DateTimeImmutable { return $this->endsAt; }
    public function getTrialEndsAt(): ?\DateTimeImmutable { return $this->trialEndsAt; }

    public function cancel(): void
    {
        $this->status = 'cancelled';
        $this->cancelledAt = new \DateTimeImmutable();
    }

    public function renew(\DateTimeImmutable $newEndsAt): void
    {
        $this->status = 'active';
        $this->endsAt = $newEndsAt;
    }

    public function isExpired(): bool
    {
        return $this->endsAt < new \DateTimeImmutable();
    }

    public function isOnTrial(): bool
    {
        return $this->trialEndsAt !== null && $this->trialEndsAt > new \DateTimeImmutable();
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && !$this->isExpired();
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenantId,
            'plan_id' => $this->planId,
            'status' => $this->status,
            'starts_at' => $this->startsAt->format('Y-m-d H:i:s'),
            'ends_at' => $this->endsAt->format('Y-m-d H:i:s'),
            'trial_ends_at' => $this->trialEndsAt?->format('Y-m-d H:i:s'),
            'cancelled_at' => $this->cancelledAt?->format('Y-m-d H:i:s'),
            'is_active' => $this->isActive(),
            'is_on_trial' => $this->isOnTrial(),
        ];
    }
}
