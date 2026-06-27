<?php

declare(strict_types=1);

namespace App\Presentation\Middleware;

use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Eloquent\Models\TenantPersonalAccessToken;
use App\Infrastructure\Services\TenantDatabaseManager;
use Closure;
use Illuminate\Http\Request;

class TenantAuthMiddleware
{
    public function __construct(
        private TenantDatabaseManager $databaseManager,
    ) {}

    public function handle(Request $request, Closure $next)
    {
        // Step 0: Capture bearer token early for the unauthenticated check.
        // NOTE: Do NOT call auth()->guard('sanctum')->user() here — it uses
        // TenantPersonalAccessToken (connection=tenant) before the DB switch,
        // which causes "no such table: personal_access_tokens" errors.
        $bearerToken = $request->bearerToken();

        // Step 1: Resolve tenant from header
        $tenantId = $request->header(config('tenancy.header_name', 'X-Tenant-ID'));

        if (! $tenantId) {
            // If no tenant header and no bearer token, reject as unauthenticated
            if (! $bearerToken) {
                return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
            }
            return response()->json([
                'message' => 'Tenant identification required.',
                'error'   => 'missing_tenant',
            ], 400);
        }

        $tenant = TenantModel::where('id', $tenantId)
            ->orWhere('domain', $tenantId)
            ->first();

        if (! $tenant) {
            return response()->json([
                'message' => 'Tenant not found.',
                'error'   => 'tenant_not_found',
            ], 404);
        }

        if ($tenant->status === 'suspended') {
            return response()->json([
                'message' => 'Your account has been suspended.',
                'error'   => 'tenant_suspended',
            ], 403);
        }

        if ($tenant->status === 'trial' && $tenant->trial_ends_at && $tenant->trial_ends_at->isPast()) {
            return response()->json([
                'message' => 'Your trial period has expired.',
                'error'   => 'trial_expired',
            ], 403);
        }

        // Step 2: Switch to tenant database BEFORE any auth check
        $this->databaseManager->switchToDatabase($tenant->database_name);

        // Store tenant for downstream use
        $request->merge(['tenant' => $tenant]);
        app()->instance('current_tenant', $tenant);

        // Step 3: Now that the tenant DB is active, check for a pre-authenticated
        // user (e.g. actingAs() in tests). This must run AFTER switchToDatabase so
        // TenantPersonalAccessToken queries the correct database.
        $preAuthed = auth()->guard('sanctum')->user();

        if (! $bearerToken && ! $preAuthed) {
            $this->databaseManager->resetConnection();
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        // Short-circuit: if the Sanctum guard already resolved a user (e.g. actingAs in tests),
        // skip the Bearer-token lookup so test helpers work without a real token.
        if ($preAuthed) {
            // When a real Bearer token is present (production path), enforce is_active.
            // actingAs() in tests sets the guard without a bearer token, so this is skipped there.
            if ($bearerToken && ! $preAuthed->is_active) {
                $this->databaseManager->resetConnection();
                return response()->json(['success' => false, 'message' => 'Account is deactivated.'], 403);
            }
            $request->setUserResolver(fn () => $preAuthed);
            $response = $next($request);
            $this->databaseManager->resetConnection();
            return $response;
        }

        // Step 4: Verify Bearer token in the NOW-correct tenant DB
        $accessToken = TenantPersonalAccessToken::findToken($bearerToken);

        if (! $accessToken || ! $accessToken->tokenable) {
            $this->databaseManager->resetConnection();
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $user = $accessToken->tokenable;

        if (! $user->is_active) {
            $this->databaseManager->resetConnection();
            return response()->json(['success' => false, 'message' => 'Account is deactivated.'], 403);
        }

        // Bind authenticated user so $request->user() works in controllers
        auth()->guard('sanctum')->setUser($user);
        $request->setUserResolver(fn () => $user);

        $response = $next($request);

        $this->databaseManager->resetConnection();

        return $response;
    }
}
