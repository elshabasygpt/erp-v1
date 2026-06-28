<?php

namespace App\Jobs;

use App\Infrastructure\Eloquent\Models\EmployeeModel;
use App\Infrastructure\Eloquent\Models\PayrollModel;
use App\Infrastructure\Eloquent\Models\EmployeeLoanInstallmentModel;
use App\Jobs\Concerns\RunsInTenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GeneratePayrollJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, RunsInTenantContext, SerializesModels;

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
        $tenant = $this->bootTenantContext($this->tenantId);
        if (! $tenant) {
            return;
        }

        Log::info('GeneratePayrollJob started', [
            'tenant_id' => $this->tenantId,
            'month' => $this->month,
            'year' => $this->year,
        ]);

        try {
            DB::connection('tenant')->beginTransaction();

            $employees = EmployeeModel::query()->where('is_active', true)->get();
            $generatedCount = 0;

            /** @var EmployeeModel $employee */
            foreach ($employees as $employee) {
                // Check if payroll already exists for this month
                $existing = PayrollModel::query()->where('employee_id', $employee->id)
                    ->where('month', $this->month)
                    ->where('year', $this->year)
                    ->first();

                if ($existing) {
                    continue;
                }

                $attendances = $employee->attendances()
                    ->whereMonth('date', $this->month)
                    ->whereYear('date', $this->year)
                    ->get();

                $baseSalary = (float) $employee->base_salary;

                // 1. جزاءات التأخير من سجل الحضور
                $lateDeductions = (float) $attendances->sum('penalty_amount');
                if ($lateDeductions == 0 && $attendances->sum('late_minutes') > 0) {
                    $lateDeductions = $attendances->sum('late_minutes') * 0.5;
                }

                // 2. جلب بنود الراتب للشهر (مدخلة يدوياً)
                $payrollItems = \App\Infrastructure\Eloquent\Models\PayrollItemModel::where('employee_id', $employee->id)
                    ->where('month', $this->month)
                    ->where('year', $this->year)
                    ->where('status', 'approved')
                    ->whereNull('payroll_id') // فقط البنود غير المربوطة بعد
                    ->get();

                $manualDeductions = $payrollItems->filter->isDeduction()->sum('amount');
                $manualBonuses    = $payrollItems->filter->isAddition()->sum('amount');

                $totalDeductions = $lateDeductions + $manualDeductions;
                $totalBonuses    = $manualBonuses;

                // ── خصم أقساط السلف المستحقة هذا الشهر ────────────────────────
                $loanInstallments = EmployeeLoanInstallmentModel::where('tenant_id', $this->tenantId)
                    ->where('month', $this->month)
                    ->where('year', $this->year)
                    ->where('status', 'pending')
                    ->whereHas('loan', fn($q) => $q
                        ->where('employee_id', $employee->id)
                        ->where('status', 'active')
                    )
                    ->get();

                $loanDeductionsTotal = (float) $loanInstallments->sum('amount');

                // أعد حساب netSalary بعد خصم السلف
                $netSalary = max(0, $baseSalary + $totalBonuses - $totalDeductions - $loanDeductionsTotal);

                // بناء الـ breakdown
                $deductionsBreakdown = [];
                if ($lateDeductions > 0) {
                    $deductionsBreakdown[] = ['reason' => 'جزاءات التأخير', 'type' => 'خصم تأخير', 'amount' => $lateDeductions];
                }
                foreach ($payrollItems->filter->isDeduction() as $item) {
                    $deductionsBreakdown[] = ['reason' => $item->reason, 'type' => $item->type_label, 'amount' => (float)$item->amount];
                }

                $bonusesBreakdown = $payrollItems->filter->isAddition()
                    ->map(fn($i) => ['reason' => $i->reason, 'type' => $i->type_label, 'amount' => (float)$i->amount])
                    ->values()->toArray();

                $advancesBreakdown = $payrollItems->where('type', 'advance')
                    ->map(fn($i) => ['reason' => $i->reason, 'amount' => (float)$i->amount])
                    ->values()->toArray();

                $payroll = PayrollModel::create([
                    'id'                   => Str::uuid()->toString(),
                    'employee_id'          => $employee->id,
                    'month'                => $this->month,
                    'year'                 => $this->year,
                    'base_salary'          => $baseSalary,
                    'bonuses'              => $totalBonuses,
                    'deductions'           => $totalDeductions,
                    'loan_deductions'      => $loanDeductionsTotal,
                    'net_salary'           => $netSalary,
                    'status'               => 'draft',
                    'deductions_breakdown' => $deductionsBreakdown,
                    'bonuses_breakdown'    => $bonusesBreakdown,
                    'advances_breakdown'   => $advancesBreakdown,
                ]);

                // ربط البنود اليدوية بالـ payroll الجديد
                $payrollItems->each(fn($item) => $item->update(['payroll_id' => $payroll->id]));

                // ── ربط الأقساط بالراتب وتحديث السلفة ─────────────────────────
                foreach ($loanInstallments as $installment) {
                    $installment->update([
                        'status'       => 'deducted',
                        'payroll_id'   => $payroll->id,
                        'deducted_at'  => now(),
                    ]);

                    // قلّل remaining_amount في السلفة
                    $loan = $installment->loan;
                    $loan->decrement('remaining_amount', (float) $installment->amount);

                    // لو اكتملت السلفة
                    if ((float) $loan->fresh()->remaining_amount <= 0) {
                        $loan->update(['status' => 'completed', 'remaining_amount' => 0]);
                    }
                }

                $generatedCount++;
            }

            DB::connection('tenant')->commit();

            Log::info('GeneratePayrollJob completed', [
                'tenant_id' => $this->tenantId,
                'payrolls_created' => $generatedCount,
            ]);

        } catch (\Throwable $e) {
            DB::connection('tenant')->rollBack();
            Log::error('GeneratePayrollJob failed', [
                'tenant_id' => $this->tenantId,
                'error' => $e->getMessage(),
            ]);

            throw $e; // يخلي الـ Queue يعمل retry
        } finally {
            $this->shutdownTenantContext();
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('GeneratePayrollJob permanently failed', [
            'tenant_id' => $this->tenantId,
            'error' => $exception->getMessage(),
        ]);
    }
}
