<?php

namespace App\Presentation\Controllers\API\HR;

use App\Infrastructure\Eloquent\Models\AttendanceModel;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
use App\Infrastructure\Eloquent\Models\ExpenseCategoryModel;
use App\Infrastructure\Eloquent\Models\ExpenseModel;
use App\Infrastructure\Eloquent\Models\LeaveModel;
use App\Infrastructure\Eloquent\Models\PayrollModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class HrController extends BaseTenantController
{
    // --- EMPLOYEES ---
    public function getEmployees()
    {
        $data = EmployeeModel::all();

        return $this->success($data);
    }

    public function storeEmployee(Request $request)
    {
        $validated['tenant_id'] = $this->getTenantId($request);
        $validated['tenant_id'] = $this->getTenantId($request);
        $employee = EmployeeModel::query()->create($validated);

        return $this->success($employee, 'Employee created', 201);
    }

    // --- ATTENDANCE ---
    public function getAttendances(Request $request)
    {
        $query = AttendanceModel::query()->where('tenant_id', $this->getTenantId($request))->with('employee')->orderBy('date', 'desc');
        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        return $this->success($query->get());
    }

    public function checkIn(Request $request)
    {
        $validated['tenant_id'] = $this->getTenantId($request);
        $validated['tenant_id'] = $this->getTenantId($request);
        $leave = LeaveModel::query()->create($validated);

        return $this->success($leave, 'Leave applied successfully', 201);
    }

    // --- PAYROLL ---
    public function getPayrolls(Request $request)
    {
        $payrolls = PayrollModel::query()->where('tenant_id', $this->getTenantId($request))->with(['employee', 'expense'])->orderBy('year', 'desc')->orderBy('month', 'desc')->get();

        return $this->success($payrolls);
    }

    public function generatePayroll(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:tenant.employees,id',
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2000',
        ]);

        $employee = EmployeeModel::query()->where('tenant_id', $this->getTenantId($request))->find($validated['employee_id']);

        // Calculate late minutes in this month
        $lateMinutes = AttendanceModel::query()->where('tenant_id', $this->getTenantId($request))->where('employee_id', $employee->id)
            ->whereMonth('date', $validated['month'])
            ->whereYear('date', $validated['year'])
            ->sum('late_minutes');

        // Hypothetical deduction: 1 monetary unit per minute late (could be parameterized)
        $minuteRate = ($employee->base_salary / 30 / 8 / 60); // assumes 30 days, 8 hrs
        $deductions = round($minuteRate * $lateMinutes, 6);

        // Unpaid leaves
        $unpaidDays = LeaveModel::query()->where('tenant_id', $this->getTenantId($request))->where('employee_id', $employee->id)
            ->where('type', 'unpaid')
            ->where('status', 'approved')
            ->whereMonth('start_date', $validated['month'])
            ->count();

        $dayRate = $employee->base_salary / 30;
        $deductions += round($unpaidDays * $dayRate, 6);

        $net = $employee->base_salary - $deductions;

        $payroll = PayrollModel::query()->updateOrCreate(
            ['employee_id' => $employee->id, 'month' => $validated['month'], 'year' => $validated['year']],
            [
                'base_salary' => $employee->base_salary,
                'deductions' => $deductions,
                'net_salary' => $net,
                'status' => 'draft',
            ]
        );

        return $this->success($payroll, 'Payroll generated');
    }

    public function payPayroll(Request $request, $id)
    {
        $validated = $request->validate([
            'safe_id' => 'required|exists:tenant.safes,id',
        ]);

        return DB::connection('tenant')->transaction(function () use ($id, $validated) {
            $payroll = PayrollModel::query()->where('tenant_id', $this->getTenantId($request))->findOrFail($id);
            if ($payroll->status === 'paid') {
                return $this->error('Payroll already paid', 400);
            }

            $safe = SafeModel::query()->lockForUpdate()->findOrFail($validated['safe_id']);
            if ((float) $safe->balance < (float) $payroll->net_salary) {
                return $this->error('Insufficient safe balance', 400);
            }

            // Deduct
            $safe->balance -= $payroll->net_salary;
            $safe->save();

            // Find or create category 'Salaries'
            $cat = ExpenseCategoryModel::query()->firstOrCreate(
                ['is_advance_or_salary' => true],
                ['name' => 'Salaries', 'name_ar' => 'رواتب']
            );

            // Record Expense
            $expense = ExpenseModel::query()->create([
                'tenant_id' => $this->getTenantId($request),
                'category_id' => $cat->id,
                'safe_id' => $safe->id,
                'amount' => $payroll->net_salary,
                'description' => "راتب الموظف في شهر {$payroll->month}/{$payroll->year}",
                'expense_date' => now(),
            ]);

            // Transaction
            SafeTransactionModel::query()->create([
                'tenant_id' => $this->getTenantId($request),
                'id' => Str::uuid()->toString(),
                'safe_id' => $safe->id,
                'type' => 'withdrawal',
                'amount' => $payroll->net_salary,
                'description' => 'دفع راتب (HR)',
                'reference_type' => 'expense',
                'reference_id' => $expense->id,
                'transaction_date' => now(),
            ]);

            $payroll->update([
                'status' => 'paid',
                'expense_id' => $expense->id,
            ]);

            return $this->success($payroll, 'Payroll paid via Treasury successfully');
        });
    }
}
