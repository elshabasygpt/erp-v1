<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Auth;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends BaseController
{
    /**
     * Display a listing of the users.
     */
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 15);
        $search = $request->query('search');

        $query = UserModel::with('role');

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'ilike', '%' . $search . '%')
                  ->orWhere('email', 'ilike', '%' . $search . '%')
                  ->orWhere('phone', 'ilike', '%' . $search . '%');
            });
        }

        $users = $query->orderBy('created_at', 'desc')->paginate((int) $limit);

        return $this->paginated($users->toArray(), 'Users retrieved successfully');
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
            'role_id' => 'nullable|uuid|exists:roles,id',
            'is_active' => 'boolean',
            'locale' => 'nullable|string|in:ar,en',
        ]);

        $user = UserModel::create([
            'id' => Str::uuid()->toString(),
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'role_id' => $validated['role_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'locale' => $validated['locale'] ?? 'ar',
        ]);

        return $this->success($user, 'User created successfully', 201);
    }

    /**
     * Display the specified user.
     */
    public function show(string $id): JsonResponse
    {
        $user = UserModel::with('role')->find($id);

        if (!$user) {
            return $this->error('User not found', 404);
        }

        return $this->success($user, 'User retrieved successfully');
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = UserModel::find($id);

        if (!$user) {
            return $this->error('User not found', 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,' . $id,
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8',
            'role_id' => 'nullable|uuid|exists:roles,id',
            'is_active' => 'boolean',
            'locale' => 'nullable|string|in:ar,en',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return $this->success($user, 'User updated successfully');
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $user = UserModel::find($id);

        if (!$user) {
            return $this->error('User not found', 404);
        }

        // Prevent deleting self (In a real app, verify against Auth::id())
        if (request()->user() && request()->user()->id === $id) {
            return $this->error('Cannot delete the currently logged in user.', 403);
        }

        $user->delete();

        return $this->success(null, 'User deleted successfully');
    }
}
