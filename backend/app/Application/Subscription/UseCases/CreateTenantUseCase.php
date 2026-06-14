<?php

declare(strict_types=1);

namespace App\Application\Subscription\UseCases;

use App\Domain\Subscription\Entities\Tenant;
use App\Domain\Subscription\Entities\Subscription;
use App\Domain\Subscription\Repositories\PlanRepositoryInterface;
use App\Infrastructure\Services\TenantDatabaseManager;

final class CreateTenantUseCase
{
    public function __construct(
        private PlanRepositoryInterface $planRepository,
        private TenantDatabaseManager $databaseManager,
    ) {}

    public function execute(string $name, string $domain, string $planSlug, string $ownerEmail): array
    {
        // 1. Get plan
        $plan = $this->planRepository->findBySlug($planSlug);
        if (!$plan) {
            throw new \DomainException("Plan not found: {$planSlug}");
        }

        // 2. Generate database name
        $databaseName = config('tenancy.database_prefix') . str_replace(['-', '.', ' '], '_', strtolower($domain));

        // 3. Create tenant entity
        $trialDays = $plan->getTrialDays() ?? config('tenancy.trial_days', 14);
        $tenant = new Tenant(
            id: null,
            name: $name,
            domain: $domain,
            databaseName: $databaseName,
            status: 'trial',
            trialEndsAt: new \DateTimeImmutable("+{$trialDays} days"),
        );

        // 4. Create subscription
        $now = new \DateTimeImmutable();
        $subscription = new Subscription(
            id: null,
            tenantId: $tenant->getId(),
            planId: $plan->getId(),
            status: 'active',
            startsAt: $now,
            endsAt: $now->modify('+1 month'),
            trialEndsAt: $now->modify("+{$trialDays} days"),
        );

        // 5. Provision tenant database
        $this->databaseManager->createDatabase($databaseName);
        $this->databaseManager->runMigrations($databaseName);

        return [
            'tenant' => $tenant->toArray(),
            'subscription' => $subscription->toArray(),
        ];
    }
}
