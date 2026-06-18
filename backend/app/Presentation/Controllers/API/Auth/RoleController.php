<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Auth;

use App\Infrastructure\Eloquent\Models\RoleModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RoleController extends BaseTenantController
{
    /**
     * Display a listing of roles with their permissions.
     */
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $orderCol = 'created_at';
        $roles = RoleModel::query()->with('permissions')
            ->orderBy($orderCol, 'desc')
            ->paginate((int) $limit);

        return $this->paginated($roles->toArray(), 'Roles retrieved successfully');
    }

    /**
     * Store a newly created role.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name']
        ]);

        $role = RoleModel::create([
            'id' => Str::uuid(),
            'name' => $validated['name'],
            'guard_name' => 'sanctum', // Ensure API guard
        ]);

        if (!empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        // Return with loaded permissions
        $role->load('permissions');

        return $this->success($role, 'Role created successfully', 201);
    }

    /**
     * Display the specified role.
     */
    public function show($id): JsonResponse
    {
        $role = RoleModel::with('permissions')->find($id);

        if (!$role) {
            return $this->error('Role not found', 404);
        }

        return $this->success($role, 'Role retrieved successfully');
    }

    /**
     * Update the specified role.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $role = RoleModel::find($id);

        if (!$role) {
            return $this->error('Role not found', 404);
        }

        if ($role->name === 'Super Admin') {
            return $this->error('Cannot modify the Super Admin role.', 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($id)],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name']
        ]);

        if (isset($validated['name'])) {
            $role->update(['name' => $validated['name']]);
        }

        if (array_key_exists('permissions', $validated)) {
            $role->syncPermissions($validated['permissions']);
        }

        $role->load('permissions');

        return $this->success($role, 'Role updated successfully');
    }

    /**
     * Remove the specified role.
     */
    public function destroy($id): JsonResponse
    {
        $role = RoleModel::find($id);

        if (!$role) {
            return $this->error('Role not found', 404);
        }

        if (in_array($role->name, ['Super Admin'])) {
            return $this->error('Cannot delete core system roles.', 403);
        }

        $role->delete();

        return $this->success(null, 'Role deleted successfully');
    }
}
