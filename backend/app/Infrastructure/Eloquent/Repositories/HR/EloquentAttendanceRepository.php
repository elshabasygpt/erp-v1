<?php
namespace App\Infrastructure\Eloquent\Repositories\HR;

use App\Domain\HR\Entities\Attendance;
use App\Domain\HR\Repositories\AttendanceRepositoryInterface;
use App\Infrastructure\Eloquent\Models\AttendanceModel;

class EloquentAttendanceRepository implements AttendanceRepositoryInterface
{
    public function findByEmployee(int $employeeId, array $filters = []): array
    {
        $query = AttendanceModel::where('employee_id', $employeeId);

        if (!empty($filters['from'])) {
            $query->whereDate('check_in', '>=', $filters['from']);
        }
        if (!empty($filters['to'])) {
            $query->whereDate('check_in', '<=', $filters['to']);
        }

        return $query->get()->map(fn(AttendanceModel $m) => $this->toEntity($m))->toArray();
    }

    public function findAll(int $tenantId, array $filters = []): array
    {
        return AttendanceModel::whereHas('employee', fn($q) => $q->where('tenant_id', $tenantId))
            ->get()
            ->map(fn(AttendanceModel $m) => $this->toEntity($m))
            ->toArray();
    }

    public function findActiveCheckIn(int $employeeId): ?Attendance
    {
        $model = AttendanceModel::where('employee_id', $employeeId)
            ->whereNull('check_out')
            ->latest()
            ->first();

        return $model ? $this->toEntity($model) : null;
    }

    public function save(Attendance $attendance): Attendance
    {
        $model = new AttendanceModel();
        $model->fill([
            'employee_id' => $attendance->employeeId,
            'check_in'    => $attendance->checkIn,
            'check_out'   => $attendance->checkOut,
            'status'      => $attendance->status,
        ])->save();

        return $this->toEntity($model);
    }

    public function update(int $id, array $data): Attendance
    {
        $model = AttendanceModel::findOrFail($id);
        $model->update($data);
        return $this->toEntity($model->fresh());
    }

    private function toEntity(AttendanceModel $model): Attendance
    {
        return new Attendance(
            id: $model->id,
            employeeId: $model->employee_id,
            checkIn: $model->check_in,
            checkOut: $model->check_out,
            status: $model->status,
        );
    }
}
