<?php

declare(strict_types=1);

namespace App\Domain\Subscription\Repositories;

use App\Domain\Subscription\Entities\Plan;

interface PlanRepositoryInterface
{
    public function findById(string $id): ?Plan;

    public function findBySlug(string $slug): ?Plan;

    public function getAll(): array;

    public function getActive(): array;

    public function create(Plan $plan): Plan;

    public function update(Plan $plan): Plan;

    public function delete(string $id): bool;
}
