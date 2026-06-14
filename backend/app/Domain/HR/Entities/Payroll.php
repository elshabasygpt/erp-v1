<?php
namespace App\Domain\HR\Entities;

class Payroll
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $employeeId,
        public readonly string $periodStart,
        public readonly string $periodEnd,
        public readonly float $basicSalary,
        public readonly float $deductions,
        public readonly float $bonuses,
        public readonly float $netSalary,
        public readonly string $status,
    ) {}

    public static function create(array $data): self
    {
        return new self(
            id: null,
            employeeId: $data['employee_id'],
            periodStart: $data['period_start'],
            periodEnd: $data['period_end'],
            basicSalary: (float) $data['basic_salary'],
            deductions: (float) ($data['deductions'] ?? 0),
            bonuses: (float) ($data['bonuses'] ?? 0),
            netSalary: (float) $data['net_salary'],
            status: 'draft',
        );
    }
}
