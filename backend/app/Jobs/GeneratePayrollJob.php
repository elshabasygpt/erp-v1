<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Infrastructure\Eloquent\Models\PayrollModel;
use App\Infrastructure\Eloquent\Models\EmployeeModel;

class GeneratePayrollJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 120;
    public int $backoff = 60;

    public function __construct(
        public readonly string $tenantId,
        public readonly int $month,
        public readonly int $year,
    ) {}

    public function handle(): void
    {
        // Switch to tenant DB context
        DB::setDefaultConnection('tenant');

        Log::info('GeneratePayrollJob started', [
            'tenant_id' => $this->tenantId,
            'month'     => $this->month,
            'year'      => $this->year,
        ]);

        try {
            DB::beginTransaction();

            $employees = EmployeeModel::where('is_active', true)->get();
            $generatedCount = 0;

            /** @var EmployeeModel $employee */
            foreach ($employees as $employee) {
                // Check if payroll already exists for this month
                $existing = PayrollModel::where('employee_id', $employee->id)
                    ->where('month', $this->month)
                    ->where('year', $this->year)
                    ->first();

                if ($existing) continue;

                $attendances = $employee->attendances()
                    ->whereMonth('date', $this->month)
                    ->whereYear('date', $this->year)
                    ->get();

                $totalLateMinutes = $attendances->sum('late_minutes');
                $deductions = $totalLateMinutes * 0.5;

                $baseSalary = (float)$employee->base_salary;
                $bonuses = 0; 
                $netSalary = $baseSalary + $bonuses - $deductions;

                PayrollModel::create([
                    'id' => Str::uuid()->toString(),
                    'employee_id' => $employee->id,
                    'month' => $this->month,
                    'year' => $this->year,
                    'base_salary' => $baseSalary,
                    'bonuses' => $bonuses,
                    'deductions' => $deductions,
                    'net_salary' => $netSalary,
                    'status' => 'draft'
                ]);

                $generatedCount++;
            }

            DB::commit();

            Log::info('GeneratePayrollJob completed', [
                'tenant_id'       => $this->tenantId,
                'payrolls_created' => $generatedCount,
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('GeneratePayrollJob failed', [
                'tenant_id' => $this->tenantId,
                'error'     => $e->getMessage(),
            ]);

            throw $e; // يخلي الـ Queue يعمل retry
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('GeneratePayrollJob permanently failed', [
            'tenant_id' => $this->tenantId,
            'error'     => $exception->getMessage(),
        ]);
    }
}
