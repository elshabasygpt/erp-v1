<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\HR;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\PayrollModel;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
use App\Infrastructure\Eloquent\Models\ExpenseModel;
use App\Infrastructure\Eloquent\Models\ExpenseCategoryModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $month = $request->query('month', date('n'));
        $year = $request->query('year', date('Y'));

        $query = PayrollModel::with('employee')
            ->where('month', $month)
            ->where('year', $year)
            ->orderBy('created_at', 'desc');

        $payrolls = $query->paginate((int) $limit);

        return $this->paginated($payrolls->toArray(), 'Payrolls retrieved successfully');
    }

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2000',
        ]);

        $month = (int) $validated['month'];
        $year = (int) $validated['year'];

        try {
            DB::beginTransaction();

            $employees = EmployeeModel::where('is_active', true)->get();
            $generatedCount = 0;

            foreach ($employees as $employee) {
                // Check if payroll already exists for this month
                $existing = PayrollModel::where('employee_id', $employee->id)
                    ->where('month', $month)
                    ->where('year', $year)
                    ->first();

                if ($existing) continue;

                // Simple logic: Base deduction on late minutes (e.g. 1 unit of currency per minute)
                // In a real ERP, this links to HR policies. For now, we do a basic deduction calculation.
                $attendances = $employee->attendances()
                    ->whereMonth('date', $month)
                    ->whereYear('date', $year)
                    ->get();

                $totalLateMinutes = $attendances->sum('late_minutes');
                // Assume 1 late minute = 0.5 deduction
                $deductions = $totalLateMinutes * 0.5;

                // Base Salary
                $baseSalary = (float)$employee->base_salary;
                $bonuses = 0; // Fixed bonuses could be added
                $netSalary = $baseSalary + $bonuses - $deductions;

                PayrollModel::create([
                    'id' => Str::uuid()->toString(),
                    'employee_id' => $employee->id,
                    'month' => $month,
                    'year' => $year,
                    'base_salary' => $baseSalary,
                    'bonuses' => $bonuses,
                    'deductions' => $deductions,
                    'net_salary' => $netSalary,
                    'status' => 'draft'
                ]);

                $generatedCount++;
            }

            DB::commit();

            return $this->success(['generated_count' => $generatedCount], "Generated payrolls for $generatedCount employees.", 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Failed to generate payrolls: ' . $e->getMessage(), 500);
        }
    }

    public function markAsPaid(Request $request, string $id): JsonResponse
    {
        $payroll = PayrollModel::with('employee')->find($id);

        if (!$payroll) {
            return $this->error('Payroll record not found', 404);
        }

        if ($payroll->status === 'paid') {
            return $this->error('Payroll is already paid', 400);
        }

        try {
            DB::beginTransaction();

            // 1. Create/Find an Expense Category for Salaries
            $category = ExpenseCategoryModel::firstOrCreate(
                ['name' => 'Salaries & Wages'],
                ['id' => Str::uuid()->toString(), 'description' => 'Employee Salaries']
            );

            // 2. Create the Expense
            $expenseDate = now()->toDateString();
            $expense = ExpenseModel::create([
                'id' => Str::uuid()->toString(),
                'category_id' => $category->id,
                'amount' => $payroll->net_salary,
                'expense_date' => $expenseDate,
                'reference_number' => 'PR-' . $payroll->year . '-' . str_pad((string)$payroll->month, 2, '0', STR_PAD_LEFT) . '-' . substr($payroll->employee_id, 0, 4),
                'description' => 'Salary payment for ' . $payroll->employee->name . ' (' . $payroll->month . '/' . $payroll->year . ')',
                'notes' => 'Generated automatically from HR Payroll'
            ]);

            // 3. Update Payroll Status
            $payroll->update([
                'status' => 'paid',
                'expense_id' => $expense->id
            ]);

            DB::commit();

            return $this->success($payroll, 'Payroll marked as paid and expense recorded successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Failed to process payment: ' . $e->getMessage(), 500);
        }
    }
}
