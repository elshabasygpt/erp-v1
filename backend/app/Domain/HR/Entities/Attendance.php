<?php

namespace App\Domain\HR\Entities;

class Attendance
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $employeeId,
        public readonly string $checkIn,
        public readonly ?string $checkOut,
        public readonly string $status,
    ) {}

    public static function create(array $data): self
    {
        return new self(
            id: null,
            employeeId: $data['employee_id'],
            checkIn: $data['check_in'],
            checkOut: $data['check_out'] ?? null,
            status: $data['status'] ?? 'present',
        );
    }
}
