<?php

declare(strict_types=1);

namespace App\Domain\CRM\Repositories;

use App\Domain\CRM\Entities\Supplier;

interface SupplierRepositoryInterface
{
    public function findById(string $id): ?Supplier;

    public function create(Supplier $supplier): Supplier;

    public function update(Supplier $supplier): Supplier;

    public function delete(string $id): bool;

    public function paginate(int $perPage = 15, array $filters = []): array;

    public function search(string $query, int $limit = 20): array;
}
