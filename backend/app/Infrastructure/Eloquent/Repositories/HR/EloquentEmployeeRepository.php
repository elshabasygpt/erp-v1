<?php

namespace App\Infrastructure\Eloquent\Repositories\HR;

use App\Domain\HR\Entities\Employee;
use App\Domain\HR\Repositories\EmployeeRepositoryInterface;
use App\Infrastructure\Eloquent\Models\EmployeeModel;

class EloquentEmployeeRepository implements EmployeeRepositoryInterface
{
    public function findById(int $id): ?Employee
    {
        $model = EmployeeModel::query()->find($id);

        return $model ? $this->toEntity($model) : null;
    }

    public function findAll(int $tenantId, array $filters = []): array
    {
        $query = EmployeeModel::query()->where('tenant_id', $tenantId);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->get()->map(fn (EmployeeModel $m) => $this->toEntity($m))->toArray();
    }

    public function save(Employee $employee): Employee
    {
        $model = $employee->id
            ? EmployeeModel::query()->findOrFail($employee->id)
            : new EmployeeModel;

        $model->fill([
            'tenant_id' => $employee->tenantId,
            'name' => $employee->name,
            'email' => $employee->email,
            'job_title' => $employee->jobTitle,
            'base_salary' => $employee->baseSalary,
            'status' => $employee->status,
            'hired_at' => $employee->hiredAt,
        ])->save();

        return $this->toEntity($model);
    }

    public function delete(int $id): void
    {
        EmployeeModel::query()->findOrFail($id)->delete();
    }

    private function toEntity(EmployeeModel $model): Employee
    {
        return new Employee(
            id: $model->id,
            tenantId: $model->tenant_id,
            name: $model->name,
            email: $model->email,
            jobTitle: $model->job_title,
            baseSalary: (float) $model->base_salary,
            status: $model->status,
            hiredAt: $model->hired_at,
        );
    }
}
