<?php

declare(strict_types=1);

namespace App\Presentation\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Infrastructure\Services\TenantDatabaseManager;
use App\Infrastructure\Eloquent\Models\TenantModel;

class TenantMiddleware
{
    public function __construct(
        private TenantDatabaseManager $databaseManager,
    ) {}

    public function handle(Request $request, Closure $next)
    {
        $tenantId = $request->header(config('tenancy.header_name', 'X-Tenant-ID'));

        if (!$tenantId) {
            return response()->json([
                'message' => 'Tenant identification required.',
                'error' => 'missing_tenant',
            ], 400);
        }

        $tenant = \Illuminate\Support\Str::isUuid($tenantId)
            ? TenantModel::where('id', $tenantId)->orWhere('domain', $tenantId)->first()
            : TenantModel::where('domain', $tenantId)->first();

        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not found.',
                'error' => 'tenant_not_found',
            ], 404);
        }

        if ($tenant->status === 'suspended') {
            return response()->json([
                'message' => 'Your account has been suspended. Please contact support or renew your subscription.',
                'error' => 'tenant_suspended',
            ], 403);
        }

        // Check trial expiry
        if ($tenant->status === 'trial' && $tenant->trial_ends_at && $tenant->trial_ends_at->isPast()) {
            return response()->json([
                'message' => 'Your trial period has expired. Please subscribe to continue.',
                'error' => 'trial_expired',
            ], 403);
        }

        // Switch to tenant database
        $this->databaseManager->switchToDatabase($tenant->database_name);

        // Store tenant in request for downstream use
        $request->merge(['tenant' => $tenant]);
        app()->instance('current_tenant', $tenant);

        $response = $next($request);

        // Reset connection after request
        $this->databaseManager->resetConnection();

        return $response;
    }
}
