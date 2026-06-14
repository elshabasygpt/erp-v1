<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\HR;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class EmployeeController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $query = EmployeeModel::with('user');

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('position', 'like', "%{$search}%");
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $employees = $query->orderBy('created_at', 'desc')->paginate((int) $limit);

        return $this->paginated($employees->toArray(), 'Employees retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'nullable|uuid|exists:users,id',
            'name' => 'required|string|max:255',
            'position' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'base_salary' => 'required|numeric|min:0',
            'shift_start' => 'nullable|date_format:H:i',
            'shift_end' => 'nullable|date_format:H:i',
            'is_active' => 'boolean'
        ]);

        $employee = EmployeeModel::create([
            'id' => Str::uuid()->toString(),
            'user_id' => $validated['user_id'] ?? null,
            'name' => $validated['name'],
            'position' => $validated['position'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'base_salary' => $validated['base_salary'],
            'shift_start' => $validated['shift_start'] ?? null,
            'shift_end' => $validated['shift_end'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return $this->success($employee->load('user'), 'Employee created successfully', 201);
    }

    public function show(string $id): JsonResponse
    {
        $employee = EmployeeModel::with('user')->find($id);

        if (!$employee) {
            return $this->error('Employee not found', 404);
        }

        return $this->success($employee, 'Employee retrieved successfully');
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $employee = EmployeeModel::find($id);

        if (!$employee) {
            return $this->error('Employee not found', 404);
        }

        $validated = $request->validate([
            'user_id' => 'nullable|uuid|exists:users,id',
            'name' => 'sometimes|required|string|max:255',
            'position' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'base_salary' => 'sometimes|required|numeric|min:0',
            'shift_start' => 'nullable|date_format:H:i:s,H:i',
            'shift_end' => 'nullable|date_format:H:i:s,H:i',
            'is_active' => 'boolean'
        ]);

        // Fix potential H:i:s formatting issues from front-end
        if (isset($validated['shift_start']) && strlen($validated['shift_start']) === 5) {
             $validated['shift_start'] .= ':00';
        }
        if (isset($validated['shift_end']) && strlen($validated['shift_end']) === 5) {
             $validated['shift_end'] .= ':00';
        }

        $employee->update($validated);

        return $this->success($employee->load('user'), 'Employee updated successfully');
    }

    public function destroy(string $id): JsonResponse
    {
        $employee = EmployeeModel::find($id);

        if (!$employee) {
            return $this->error('Employee not found', 404);
        }

        // Only soft delete
        $employee->delete();

        return $this->success(null, 'Employee deleted successfully');
    }
}
