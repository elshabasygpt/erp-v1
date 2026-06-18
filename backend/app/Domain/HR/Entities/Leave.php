<?php

namespace App\Domain\HR\Entities;

class Leave
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $employeeId,
        public readonly string $type,
        public readonly string $startDate,
        public readonly string $endDate,
        public readonly string $status,
    ) {}

    public static function create(array $data): self
    {
        return new self(
            id: null,
            employeeId: $data['employee_id'],
            type: $data['type'],
            startDate: $data['start_date'],
            endDate: $data['end_date'],
            status: 'pending',
        );
    }
}
