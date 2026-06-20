<?php

namespace App\Presentation\Controllers\API\HR;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends BaseController
{
    /**
     * Get all employees
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $employees = EmployeeModel::with('user')
                ->latest()
                ->get();
                
            return $this->success($employees, 'Employees retrieved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve employees: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Show a single employee
     */
    public function show($id): JsonResponse
    {
        try {
            $employee = EmployeeModel::with(['user', 'activeLoans'])->find($id);
            if (!$employee) {
                return $this->error('Employee not found', 404);
            }
            return $this->success($employee, 'Employee retrieved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve employee: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create a new employee
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'position' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'base_salary' => 'required|numeric|min:0',
            'shift_start' => 'nullable|date_format:H:i',
            'shift_end' => 'nullable|date_format:H:i',
            'is_active' => 'boolean',
        ]);

        try {
            $employee = EmployeeModel::create([
                'name' => $validated['name'],
                'position' => $validated['position'],
                'phone' => $validated['phone'] ?? null,
                'base_salary' => $validated['base_salary'],
                'shift_start' => $validated['shift_start'] ?? null,
                'shift_end' => $validated['shift_end'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            return $this->success($employee, 'Employee created successfully', 201);
        } catch (\Exception $e) {
            return $this->error('Failed to create employee: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update an employee
     */
    public function update(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'position' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'base_salary' => 'sometimes|required|numeric|min:0',
            'shift_start' => 'nullable|date_format:H:i|date_format:H:i:s',
            'shift_end' => 'nullable|date_format:H:i|date_format:H:i:s',
            'is_active' => 'boolean',
        ]);

        try {
            $employee = EmployeeModel::find($id);
            if (!$employee) {
                return $this->error('Employee not found', 404);
            }

            // Handle both H:i and H:i:s formats from frontend
            if (isset($validated['shift_start'])) {
                $employee->shift_start = substr($validated['shift_start'], 0, 5);
            }
            if (isset($validated['shift_end'])) {
                $employee->shift_end = substr($validated['shift_end'], 0, 5);
            }

            $employee->fill($request->except(['shift_start', 'shift_end']));
            $employee->save();

            return $this->success($employee, 'Employee updated successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to update employee: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete an employee
     */
    public function destroy($id): JsonResponse
    {
        try {
            $employee = EmployeeModel::find($id);
            if (!$employee) {
                return $this->error('Employee not found', 404);
            }

            $employee->delete(); // Soft delete

            return $this->success(null, 'Employee deleted successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to delete employee: ' . $e->getMessage(), 500);
        }
    }
}
