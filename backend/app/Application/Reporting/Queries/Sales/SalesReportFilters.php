<?php

declare(strict_types=1);

namespace App\Application\Reporting\Queries\Sales;

class SalesReportFilters
{
    public function __construct(
        public readonly string $tenantId,
        public readonly string $dateFrom,
        public readonly string $dateTo,
        public readonly ?string $branchId = null,
        public readonly ?string $warehouseId = null,
        public readonly ?string $employeeId = null,
    ) {}

    public static function fromArray(string $tenantId, array $data): self
    {
        $dateFrom = $data['date_from'] ?? now()->startOfMonth()->toDateString();
        $dateTo = $data['date_to'] ?? now()->endOfMonth()->toDateString();

        if ($dateFrom > $dateTo) {
            $temp = $dateFrom;
            $dateFrom = $dateTo;
            $dateTo = $temp;
        }

        return new self(
            tenantId: $tenantId,
            dateFrom: $dateFrom . ' 00:00:00',
            dateTo: $dateTo . ' 23:59:59',
            branchId: $data['branch_id'] ?? null,
            warehouseId: $data['warehouse_id'] ?? null,
            employeeId: $data['employee_id'] ?? null,
        );
    }
}
