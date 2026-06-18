<?php

namespace App\Domain\HR\Repositories;

use App\Domain\HR\Entities\Payroll;

interface PayrollRepositoryInterface
{
    public function findAll(int $tenantId, array $filters = []): array;

    public function save(Payroll $payroll): Payroll;

    public function markAsPaid(int $id): Payroll;
}
