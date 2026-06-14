<?php

declare(strict_types=1);

namespace App\Domain\CRM\Repositories;

use App\Domain\CRM\Entities\Customer;

interface CustomerRepositoryInterface
{
    public function findById(string $id): ?Customer;

    public function create(Customer $customer): Customer;

    public function update(Customer $customer): Customer;

    public function delete(string $id): bool;

    public function paginate(int $perPage = 15, array $filters = []): array;

    public function search(string $query, int $limit = 20): array;

    public function getStatement(string $customerId, ?\DateTimeImmutable $from = null, ?\DateTimeImmutable $to = null): array;
}
