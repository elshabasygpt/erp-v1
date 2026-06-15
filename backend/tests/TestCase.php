<?php
namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use App\Infrastructure\Eloquent\Models\UserModel;

abstract class TestCase extends BaseTestCase
{
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    protected function setUp(): void
    {
        if (!class_exists(\App\Infrastructure\Eloquent\Models\BaseTenantModel::class)) {
            class_alias(\Illuminate\Database\Eloquent\Model::class, \App\Infrastructure\Eloquent\Models\BaseTenantModel::class);
        }

        parent::setUp();
        
        \Illuminate\Database\Eloquent\Factories\Factory::guessFactoryNamesUsing(function (string $modelName) {
            $basename = str_replace('Model', '', class_basename($modelName));
            return 'Database\\Factories\\'.$basename.'Factory';
        });
    }

                    protected function refreshTestDatabase()
    {
        // Override all connections to use sqlite
        $sqliteConfig = [
            'driver'   => 'sqlite',
            'database' => ':memory:',
            'prefix'   => '',
            'foreign_key_constraints' => false,
        ];

        config(['database.connections.pgsql'  => $sqliteConfig]);
        config(['database.connections.tenant' => $sqliteConfig]);
        config(['database.default'            => 'sqlite']);

        if (!\Illuminate\Foundation\Testing\RefreshDatabaseState::$migrated) {

            // Purge cached connections ONLY on first run
            \DB::purge('pgsql');
            \DB::purge('tenant');
            \DB::purge('sqlite');

            // Get fresh sqlite connection
            $sqlite = \DB::connection('sqlite');

            // Bump transaction levels so any further beginTransaction() uses savepoints
            \DB::connection('pgsql')->beginTransaction();
            \DB::connection('tenant')->beginTransaction();

            // Share PDO with all connections
            \DB::connection('pgsql')->setPdo($sqlite->getPdo());
            \DB::connection('tenant')->setPdo($sqlite->getPdo());

            // Run all migrations on sqlite
            \Artisan::call('migrate:fresh', [
                '--database' => 'sqlite',
                '--force'    => true,
            ]);

            \Artisan::call('migrate', [
                '--path'     => 'database/migrations/central',
                '--database' => 'sqlite',
                '--force'    => true,
            ]);

            \Artisan::call('migrate', [
                '--path'     => 'database/migrations/tenant',
                '--database' => 'sqlite',
                '--force'    => true,
            ]);

            // Create cache tables manually if missing
            if (!\Schema::connection('sqlite')->hasTable('cache')) {
                \Schema::connection('sqlite')->create('cache', function ($table) {
                    $table->string('key')->primary();
                    $table->mediumText('value');
                    $table->integer('expiration');
                });
            }

            if (!\Schema::connection('sqlite')->hasTable('cache_locks')) {
                \Schema::connection('sqlite')->create('cache_locks', function ($table) {
                    $table->string('key')->primary();
                    $table->string('owner');
                    $table->integer('expiration');
                });
            }

            \Illuminate\Foundation\Testing\RefreshDatabaseState::$migrated = true;
            
            // Share the sqlite PDO for all memory connections so Laravel natively reuses it!
            foreach (['sqlite', 'pgsql', 'tenant'] as $name) {
                \Illuminate\Foundation\Testing\RefreshDatabaseState::$inMemoryConnections[$name] = $sqlite->getPdo();
            }
        } else {
            // For subsequent tests, just ensure the PDO is shared
            $sqlite = \DB::connection('sqlite');

            // Bump transaction levels so any further beginTransaction() uses savepoints
            \DB::connection('pgsql')->beginTransaction();
            \DB::connection('tenant')->beginTransaction();

            \DB::connection('pgsql')->setPdo($sqlite->getPdo());
            \DB::connection('tenant')->setPdo($sqlite->getPdo());
        }

        $this->beginDatabaseTransaction();
    }

    protected function connectionsToTransact()
    {
        return ['sqlite'];
    }

    protected function tearDown(): void
    {
        $pdo = \Illuminate\Support\Facades\DB::connection('sqlite')->getPdo();
        while ($pdo && $pdo->inTransaction()) {
            $pdo->rollBack();
        }

        parent::tearDown();
    }

        protected function actingAsAuthenticatedUser($tenantId = 1): void
    {
        // Bypass tenant middleware completely
        $this->withoutMiddleware([
            \App\Presentation\Middleware\TenantMiddleware::class,
        ]);

        // Create tenant directly via DB (bypass Eloquent UUID issues)
        $tenantExists = \DB::connection('sqlite')
            ->table('tenants')
            ->where('id', '00000000-0000-0000-0000-000000000001')
            ->exists();

        if (!$tenantExists) {
            \DB::connection('sqlite')->table('tenants')->insert([
                'id'            => '00000000-0000-0000-0000-000000000001',
                'name'          => 'Test Tenant',
                'domain'        => 'test.example.com',
                'database_name' => 'sqlite',
                'status'        => 'active',
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }

        $tenant = \App\Infrastructure\Eloquent\Models\TenantModel::find(
            '00000000-0000-0000-0000-000000000001'
        );

        // Bind tenant to container
        $this->app->instance('current_tenant', $tenant);

        // Create or get admin role
        $role = \DB::connection('sqlite')
            ->table('roles')
            ->where('name', 'admin')
            ->first();

        if (!$role) {
            $roleId = \Illuminate\Support\Str::uuid()->toString();
            \DB::connection('sqlite')->table('roles')->insert([
                'id'         => $roleId,
                'name'       => 'admin',
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $roleId = $role->id;
        }

        // Create test user
        $user = \App\Infrastructure\Eloquent\Models\UserModel::factory()->create([
            'tenant_id' => '00000000-0000-0000-0000-000000000001',
            'email'     => 'test_' . uniqid() . '@example.com',
            'role_id'   => $roleId,
        ]);

        $this->actingAs($user, 'sanctum');

        $this->withHeaders([
            'X-Tenant-ID' => 'test.example.com',
            'Accept'      => 'application/json',
        ]);
    }

    protected function createEmployee(array $overrides = [])
    {
        return \App\Infrastructure\Eloquent\Models\EmployeeModel::factory()
            ->create($overrides);
    }

    protected function createSafe(array $overrides = [])
    {
        return \App\Infrastructure\Eloquent\Models\SafeModel::factory()
            ->create($overrides);
    }

    protected function createApprovalRequest(array $overrides = [])
    {
        return \App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel::factory()
            ->create($overrides);
    }
}
