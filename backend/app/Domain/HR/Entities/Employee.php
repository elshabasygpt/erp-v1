<?php
namespace App\Domain\HR\Entities;

class Employee
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $tenantId,
        public readonly string $name,
        public readonly string $email,
        public readonly string $jobTitle,
        public readonly float $baseSalary,
        public readonly string $status,
        public readonly ?string $hiredAt,
    ) {}

    public static function create(array $data): self
    {
        return new self(
            id: null,
            tenantId: $data['tenant_id'],
            name: $data['name'],
            email: $data['email'],
            jobTitle: $data['job_title'],
            baseSalary: (float) $data['base_salary'],
            status: $data['status'] ?? 'active',
            hiredAt: $data['hired_at'] ?? null,
        );
    }
}
