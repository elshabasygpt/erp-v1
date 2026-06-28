<?php

declare(strict_types=1);

namespace Tests\Feature\Jobs;

use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Services\TenantDatabaseManager;
use App\Jobs\Concerns\RunsInTenantContext;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Proves the queue-job tenant-context contract: a job must switch the `tenant`
 * connection to the dispatching tenant's OWN database before touching any
 * tenant-scoped data. Without this, a queue worker (which boots with the tenant
 * connection still pointing at the central DB) reads/writes the wrong tenant.
 *
 * TenantDatabaseManager is `final`, so instead of a Mockery double we bind a
 * lightweight recording spy (the container binding and the `app(...)->method()`
 * call site enforce no type, so duck typing is sufficient).
 */
class TenantJobIsolationTest extends TestCase
{
    private function recordingManager(): object
    {
        return new class
        {
            public array $switchedTo = [];
            public int $resets = 0;

            public function switchToDatabase(string $databaseName): void
            {
                $this->switchedTo[] = $databaseName;
            }

            public function resetConnection(): void
            {
                $this->resets++;
            }
        };
    }

    public function test_boot_tenant_context_switches_to_the_resolved_tenant_database(): void
    {
        $tenant = TenantModel::create([
            'id'            => Str::uuid()->toString(),
            'name'          => 'Isolation Co',
            'domain'        => 'isolation-'.Str::random(6).'.example.com',
            'database_name' => 'tenant_isolation_db',
            'status'        => 'active',
        ]);

        $spy = $this->recordingManager();
        $this->app->instance(TenantDatabaseManager::class, $spy);

        $boundTenantId = (new class
        {
            use RunsInTenantContext;

            public function run(string $tenantId): ?string
            {
                $this->bootTenantContext($tenantId);
                $bound = app()->bound('current_tenant') ? app('current_tenant')->id : null;
                $this->shutdownTenantContext();

                return $bound;
            }
        })->run($tenant->id);

        $this->assertSame(['tenant_isolation_db'], $spy->switchedTo, 'must switch to the tenant\'s own database, exactly once');
        $this->assertSame(1, $spy->resets, 'must reset the tenant connection on shutdown');
        $this->assertSame($tenant->id, $boundTenantId, 'current_tenant must be bound to the resolved tenant');
        $this->assertFalse(app()->bound('current_tenant'), 'current_tenant must be cleared on shutdown');
    }

    public function test_boot_tenant_context_aborts_and_never_switches_when_tenant_is_missing(): void
    {
        $spy = $this->recordingManager();
        $this->app->instance(TenantDatabaseManager::class, $spy);

        $resolved = (new class
        {
            use RunsInTenantContext;

            public function run(string $tenantId): bool
            {
                return $this->bootTenantContext($tenantId) !== null;
            }
        })->run('00000000-0000-4000-8000-000000000999');

        $this->assertFalse($resolved, 'a missing tenant must abort the job (return null)');
        $this->assertSame([], $spy->switchedTo, 'must never switch databases for a missing tenant');
    }
}
