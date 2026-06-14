<?php

declare(strict_types=1);

namespace App\Presentation\Middleware;

use Closure;
use Illuminate\Http\Request;

class RolePermissionMiddleware
{
    public function handle(Request $request, Closure $next, string ...$permissions)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (empty($permissions)) {
            return $next($request);
        }

        // Load user's role and permissions
        $userPermissions = $user->role?->permissions?->pluck('name')->toArray() ?? [];

        foreach ($permissions as $permission) {
            if (!in_array($permission, $userPermissions)) {
                return response()->json([
                    'message' => "You do not have permission: {$permission}",
                    'error' => 'insufficient_permissions',
                ], 403);
            }
        }

        return $next($request);
    }
}
