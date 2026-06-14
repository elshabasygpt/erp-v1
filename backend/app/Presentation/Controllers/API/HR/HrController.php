<?php

namespace App\Presentation\Controllers\API\HR;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
use App\Infrastructure\Eloquent\Models\AttendanceModel;
use App\Infrastructure\Eloquent\Models\LeaveModel;
use App\Infrastructure\Eloquent\Models\PayrollModel;
use App\Infrastructure\Eloquent\Models\ExpenseModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use App\Infrastructure\Eloquent\Models\ExpenseCategoryModel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Str;

class HrController extends BaseController
{
    // --- EMPLOYEES ---
    public function getEmployees()
    {
        $data = EmployeeModel::all();
        return $this->success($data);
    }

    public function storeEmployee(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'position' => 'nullable|string',
            'phone' => 'nullable|string',
            'base_salary' => 'required|numeric|min:0',
            'shift_start' => 'nullable', // "09:00"
            'shift_end' => 'nullable',   // "17:00"
        ]);

        $employee = EmployeeModel::create($validated);
        return $this->success($employee, 'Employee created', 201);
    }

    // --- ATTENDANCE ---
    public function getAttendances(Request $request)
    {
        $query = AttendanceModel::with('employee')->orderBy('date', 'desc');
        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }
        return $this->success($query->get());
    }

    public function checkIn(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:tenant.employees,id',
            'time' => 'nullable|date_format:H:i'
        ]);

        $employee = EmployeeModel::find($validated['employee_id']);
        $timeStr = $validated['time'] ?? now()->format('H:i');
        
        $lateMins = 0;
        if ($employee->shift_start) {
            $shiftStart = Carbon::createFromFormat('H:i:s', $employee->shift_start);
            $actualIn = Carbon::createFromFormat('H:i', $timeStr);
            if ($actualIn > $shiftStart) {
                $lateMins = abs($actualIn->diffInMinutes($shiftStart));
            }
        }

        $att = AttendanceModel::updateOrCreate(
            ['employee_id' => $employee->id, 'date' => now()->toDateString()],
            [
                'check_in' => $timeStr,
                'late_minutes' => $lateMins,
                'status' => $lateMins > 0 ? 'late' : 'present'
            ]
        );

        return $this->success($att, 'Check-in recorded');
    }

    public function checkOut(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:tenant.employees,id',
            'time' => 'nullable|date_format:H:i'
        ]);

        $timeStr = $validated['time'] ?? now()->format('H:i');
        
        $att = AttendanceModel::where('employee_id', $validated['employee_id'])
            ->where('date', now()->toDateString())
            ->first();

        if (!$att) {
            return $this->error('No check-in found today', 400);
        }

        $att->update(['check_out' => $timeStr]);
        return $this->success($att, 'Check-out recorded');
    }

    // --- LEAVES ---
    public function getLeaves(Request $request)
    {
        $query = LeaveModel::with('employee')->orderBy('start_date', 'desc');
        return $this->success($query->get());
    }

    public function applyLeave(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:tenant.employees,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'type' => 'required|in:annual,sick,unpaid,other',
            'reason' => 'required|string'
        ]);

        $leave = LeaveModel::create($validated);
        return $this->success($leave, 'Leave applied successfully', 201);
    }

    // --- PAYROLL ---
    public function getPayrolls(Request $request)
    {
        $payrolls = PayrollModel::with(['employee', 'expense'])->orderBy('year', 'desc')->orderBy('month', 'desc')->get();
        return $this->success($payrolls);
    }

    public function generatePayroll(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:tenant.employees,id',
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2000',
        ]);

        $employee = EmployeeModel::find($validated['employee_id']);
        
        // Calculate late minutes in this month
        $lateMinutes = AttendanceModel::where('employee_id', $employee->id)
            ->whereMonth('date', $validated['month'])
            ->whereYear('date', $validated['year'])
            ->sum('late_minutes');

        // Hypothetical deduction: 1 monetary unit per minute late (could be parameterized)
        $minuteRate = ($employee->base_salary / 30 / 8 / 60); // assumes 30 days, 8 hrs
        $deductions = round($minuteRate * $lateMinutes, 2);
        
        // Unpaid leaves
        $unpaidDays = LeaveModel::where('employee_id', $employee->id)
            ->where('type', 'unpaid')
            ->where('status', 'approved')
            ->whereMonth('start_date', $validated['month'])
            ->count();
            
        $dayRate = $employee->base_salary / 30;
        $deductions += round($unpaidDays * $dayRate, 2);

        $net = $employee->base_salary - $deductions;

        $payroll = PayrollModel::updateOrCreate(
            ['employee_id' => $employee->id, 'month' => $validated['month'], 'year' => $validated['year']],
            [
                'base_salary' => $employee->base_salary,
                'deductions' => $deductions,
                'net_salary' => $net,
                'status' => 'draft'
            ]
        );

        return $this->success($payroll, 'Payroll generated');
    }

    public function payPayroll(Request $request, $id)
    {
        $validated = $request->validate([
            'safe_id' => 'required|exists:tenant.safes,id'
        ]);

        return DB::transaction(function () use ($id, $validated) {
            $payroll = PayrollModel::findOrFail($id);
            if ($payroll->status === 'paid') {
                return $this->error('Payroll already paid', 400);
            }

            $safe = SafeModel::lockForUpdate()->findOrFail($validated['safe_id']);
            if ((float)$safe->balance < (float)$payroll->net_salary) {
                return $this->error('Insufficient safe balance', 400);
            }

            // Deduct
            $safe->balance -= $payroll->net_salary;
            $safe->save();

            // Find or create category 'Salaries'
            $cat = ExpenseCategoryModel::firstOrCreate(
                ['is_advance_or_salary' => true],
                ['name' => 'Salaries', 'name_ar' => 'رواتب']
            );

            // Record Expense
            $expense = ExpenseModel::create([
                'category_id' => $cat->id,
                'safe_id' => $safe->id,
                'amount' => $payroll->net_salary,
                'description' => "راتب الموظف في شهر {$payroll->month}/{$payroll->year}",
                'expense_date' => now()
            ]);

            // Transaction
            SafeTransactionModel::create([
                'id' => Str::uuid()->toString(),
                'safe_id' => $safe->id,
                'type' => 'withdrawal',
                'amount' => $payroll->net_salary,
                'description' => "دفع راتب (HR)",
                'reference_type' => 'expense',
                'reference_id' => $expense->id,
                'transaction_date' => now()
            ]);

            $payroll->update([
                'status' => 'paid',
                'expense_id' => $expense->id
            ]);

            return $this->success($payroll, 'Payroll paid via Treasury successfully');
        });
    }
}
