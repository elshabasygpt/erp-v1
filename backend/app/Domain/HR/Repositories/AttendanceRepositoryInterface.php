<?php

namespace App\Domain\HR\Repositories;

use App\Domain\HR\Entities\Attendance;

interface AttendanceRepositoryInterface
{
    public function findByEmployee(int $employeeId, array $filters = []): array;

    public function findAll(int $tenantId, array $filters = []): array;

    public function findActiveCheckIn(int $employeeId): ?Attendance;

    public function save(Attendance $attendance): Attendance;

    public function update(int $id, array $data): Attendance;
}
