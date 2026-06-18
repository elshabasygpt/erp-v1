<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceRbacMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Owners and Admins bypass all checks
        if ($user->is_owner || $user->role === 'admin') {
            return $next($request);
        }

        $path = $request->path();

        // RBAC Matrix Enforcement
        $matrix = [
            'sales' => ['api/sales', 'api/customers', 'api/inventory/products'],
            'accountant' => ['api/accounting', 'api/treasury', 'api/purchases', 'api/sales'],
            'manager' => ['api/sales', 'api/purchases', 'api/inventory', 'api/hr', 'api/treasury', 'api/accounting'],
            'hr' => ['api/hr', 'api/employees'],
            'inventory' => ['api/inventory', 'api/purchases'],
        ];

        $role = $user->role ?? 'guest';
        $allowedPrefixes = $matrix[$role] ?? [];

        $isAllowed = false;
        foreach ($allowedPrefixes as $prefix) {
            if (str_starts_with($path, $prefix)) {
                $isAllowed = true;
                break;
            }
        }

        if (! $isAllowed) {
            return response()->json([
                'message' => 'Forbidden. Your role ('.$role.') does not have permission to access this resource.'
            ], 403);
        }

        return $next($request);
    }
}
