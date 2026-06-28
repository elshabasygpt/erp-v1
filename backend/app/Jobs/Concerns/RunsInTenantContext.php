<?php

declare(strict_types=1);

namespace App\Jobs\Concerns;

use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Services\TenantDatabaseManager;
use Illuminate\Support\Facades\Log;

/**
 * Establishes the correct per-tenant database context inside a queue job.
 *
 * Queue workers boot with the `tenant` connection still pointing at the central
 * default database (see config/database.php). A job that only calls
 * DB::setDefaultConnection('tenant') therefore reads/writes the WRONG database —
 * a cross-tenant data-corruption / isolation bug. This trait mirrors what
 * TenantMiddleware does for HTTP requests: resolve the tenant from the central
 * DB, switch the `tenant` connection to that tenant's physical database, and
 * bind it as `current_tenant` (so TenantScope and BaseModel auto-fill work).
 *
 * Usage inside handle()/failed():
 *
 *   $tenant = $this->bootTenantContext($this->tenantId);
 *   if (! $tenant) { return; }
 *   try { ... tenant queries ... }
 *   finally { $this->shutdownTenantContext(); }
 */
trait RunsInTenantContext
{
    /** True only when THIS job established the tenant context (and must tear it down). */
    private bool $establishedTenantContext = false;

    /** Whatever `current_tenant` was bound to before we switched (restored on shutdown). */
    private ?TenantModel $previousTenant = null;

    private bool $hadPreviousTenant = false;

    /**
     * Resolve the tenant from the CENTRAL database and switch the tenant
     * connection to its physical database. Must be called before any
     * tenant-scoped Eloquent/DB access in the job.
     *
     * Returns the resolved tenant, or null if it no longer exists (caller
     * should abort — the tenant was deleted between dispatch and execution).
     */
    protected function bootTenantContext(string $tenantId): ?TenantModel
    {
        // Already running inside the correct tenant context — e.g. dispatched on
        // the `sync` queue from within an HTTP request that already switched.
        // Do NOT touch the connection or the binding; leave the caller's context
        // exactly as we found it (tearing it down would break the outer request).
        if (app()->bound('current_tenant') && app('current_tenant')->id === $tenantId) {
            $this->establishedTenantContext = false;

            return app('current_tenant');
        }

        // Resolve against the central DB *before* switching the tenant connection.
        // TenantModel lives on the central/default connection.
        $tenant = TenantModel::query()->find($tenantId);

        if (! $tenant) {
            Log::warning(static::class.' aborted — tenant not found', [
                'tenant_id' => $tenantId,
            ]);

            return null;
        }

        $this->hadPreviousTenant = app()->bound('current_tenant');
        $this->previousTenant = $this->hadPreviousTenant ? app('current_tenant') : null;

        app(TenantDatabaseManager::class)->switchToDatabase($tenant->database_name);
        app()->instance('current_tenant', $tenant);
        $this->establishedTenantContext = true;

        return $tenant;
    }

    /**
     * Reset the tenant connection back to the default and restore the previous
     * tenant binding (if any). Call in a finally{} so a later job on the same
     * worker never inherits this job's tenant database. No-op when this job did
     * not establish the context (it ran inside an already-correct one).
     */
    protected function shutdownTenantContext(): void
    {
        if (! $this->establishedTenantContext) {
            return;
        }

        app(TenantDatabaseManager::class)->resetConnection();

        if ($this->hadPreviousTenant && $this->previousTenant !== null) {
            app()->instance('current_tenant', $this->previousTenant);
        } elseif (app()->bound('current_tenant')) {
            app()->forgetInstance('current_tenant');
        }

        $this->establishedTenantContext = false;
    }
}
