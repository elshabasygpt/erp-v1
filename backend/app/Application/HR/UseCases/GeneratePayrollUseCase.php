<?php
namespace App\Application\HR\UseCases;

use App\Domain\HR\Repositories\EmployeeRepositoryInterface;
use App\Domain\HR\Repositories\AttendanceRepositoryInterface;
use App\Domain\HR\Repositories\PayrollRepositoryInterface;
use App\Domain\HR\Services\PayrollCalculationService;
use App\Domain\HR\Entities\Payroll;

class GeneratePayrollUseCase
{
    public function __construct(
        private EmployeeRepositoryInterface $employeeRepo,
        private AttendanceRepositoryInterface $attendanceRepo,
        private PayrollRepositoryInterface $payrollRepo,
        private PayrollCalculationService $calculator,
    ) {}

    public function execute(int $tenantId, string $periodStart, string $periodEnd, int $workingDays): array
    {
        $employees = $this->employeeRepo->findAll($tenantId, ['status' => 'active']);
        $results   = [];

        foreach ($employees as $employee) {
            $attendance  = $this->attendanceRepo->findByEmployee($employee->id, [
                'from' => $periodStart,
                'to'   => $periodEnd,
            ]);

            $absentDays = collect($attendance)
                ->where('status', 'absent')
                ->count();

            $calculated = $this->calculator->calculate(
                basicSalary: $employee->baseSalary,
                absentDays: $absentDays,
                workingDaysInMonth: $workingDays,
            );

            $payroll = Payroll::create([
                'employee_id'  => $employee->id,
                'period_start' => $periodStart,
                'period_end'   => $periodEnd,
                ...$calculated,
            ]);

            $results[] = $this->payrollRepo->save($payroll);
        }

        return $results;
    }
}
