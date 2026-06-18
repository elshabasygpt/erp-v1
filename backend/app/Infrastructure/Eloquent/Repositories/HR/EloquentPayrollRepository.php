<?php

namespace App\Infrastructure\Eloquent\Repositories\HR;

use App\Domain\HR\Entities\Payroll;
use App\Domain\HR\Repositories\PayrollRepositoryInterface;
use App\Infrastructure\Eloquent\Models\PayrollModel;

class EloquentPayrollRepository implements PayrollRepositoryInterface
{
    public function findAll(int $tenantId, array $filters = []): array
    {
        return PayrollModel::whereHas('employee', fn ($q) => $q->where('tenant_id', $tenantId))
            ->get()
            ->map(fn (PayrollModel $m) => $this->toEntity($m))
            ->toArray();
    }

    public function save(Payroll $payroll): Payroll
    {
        $model = new PayrollModel;
        $model->fill([
            'employee_id' => $payroll->employeeId,
            'period_start' => $payroll->periodStart,
            'period_end' => $payroll->periodEnd,
            'basic_salary' => $payroll->basicSalary,
            'deductions' => $payroll->deductions,
            'bonuses' => $payroll->bonuses,
            'net_salary' => $payroll->netSalary,
            'status' => $payroll->status,
        ])->save();

        return $this->toEntity($model);
    }

    public function markAsPaid(int $id): Payroll
    {
        $model = PayrollModel::query()->findOrFail($id);
        $model->update(['status' => 'paid']);

        return $this->toEntity($model->fresh());
    }

    private function toEntity(PayrollModel $model): Payroll
    {
        return new Payroll(
            id: $model->id,
            employeeId: $model->employee_id,
            periodStart: $model->period_start,
            periodEnd: $model->period_end,
            basicSalary: (float) $model->basic_salary,
            deductions: (float) $model->deductions,
            bonuses: (float) $model->bonuses,
            netSalary: (float) $model->net_salary,
            status: $model->status,
        );
    }
}
