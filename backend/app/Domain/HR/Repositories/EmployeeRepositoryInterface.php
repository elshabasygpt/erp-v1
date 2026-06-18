<?php

namespace App\Domain\HR\Repositories;

use App\Domain\HR\Entities\Employee;

interface EmployeeRepositoryInterface
{
    public function findById(int $id): ?Employee;

    public function findAll(int $tenantId, array $filters = []): array;

    public function save(Employee $employee): Employee;

    public function delete(int $id): void;
}
