<?php

namespace Tests;

use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel;
use App\Infrastructure\Eloquent\Models\BaseTenantModel;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use App\Presentation\Middleware\TenantMiddleware;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Str;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        if (! class_exists(BaseTenantModel::class)) {
            class_alias(Model::class, BaseTenantModel::class);
        }

        parent::setUp();

        Factory::guessFactoryNamesUsing(function (string $modelName) {
            $basename = str_replace('Model', '', class_basename($modelName));

            return 'Database\\Factories\\'.$basename.'Factory';
        });

        // Ensure default tenant exists for all tests
        $tenantExists = \DB::connection('sqlite')
            ->table('tenants')
            ->where('id', '00000000-0000-0000-0000-000000000001')
            ->exists();

        if (! $tenantExists) {
            \DB::connection('sqlite')->table('tenants')->insert([
                'id' => '00000000-0000-0000-0000-000000000001',
                'name' => 'Test Tenant',
                'domain' => 'test.example.com',
                'database_name' => ':memory:',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    protected function refreshTestDatabase()
    {
        // Override all connections to use sqlite
        $sqliteConfig = [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => false,
        ];

        config(['database.connections.pgsql' => $sqliteConfig]);
        config(['database.connections.tenant' => $sqliteConfig]);
        config(['database.default' => 'sqlite']);

        if (! RefreshDatabaseState::$migrated) {

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
                '--force' => true,
            ]);

            \Artisan::call('migrate', [
                '--path' => 'database/migrations/central',
                '--database' => 'sqlite',
                '--force' => true,
            ]);

            \Artisan::call('migrate', [
                '--path' => 'database/migrations/tenant',
                '--database' => 'sqlite',
                '--force' => true,
            ]);

            // Create cache tables manually if missing
            if (! \Schema::connection('sqlite')->hasTable('cache')) {
                \Schema::connection('sqlite')->create('cache', function ($table) {
                    $table->string('key')->primary();
                    $table->mediumText('value');
                    $table->integer('expiration');
                });
            }

            if (! \Schema::connection('sqlite')->hasTable('cache_locks')) {
                \Schema::connection('sqlite')->create('cache_locks', function ($table) {
                    $table->string('key')->primary();
                    $table->string('owner');
                    $table->integer('expiration');
                });
            }

            RefreshDatabaseState::$migrated = true;

            // Share the sqlite PDO for all memory connections so Laravel natively reuses it!
        }

        // To bump the transaction levels WITHOUT throwing PDO exception on the shared PDO,
        // we use Reflection to set the internal transactions counter to 1.
        // This ensures subsequent beginTransaction() calls use SAVEPOINTs.
        $sqlite = \DB::connection('sqlite');

        foreach (['pgsql', 'tenant'] as $conn) {
            $connection = \DB::connection($conn);
            $connection->setPdo($sqlite->getPdo());

            $reflection = new \ReflectionClass($connection);
            $property = $reflection->getProperty('transactions');
            $property->setAccessible(true);
            $property->setValue($connection, 1);

            if ($conn === 'tenant') {
                \Log::info('Tenant setUp spl: '.spl_object_id($connection));
            }
        }

        // Now tell Laravel to natively reuse this PDO for any future reconnects
        foreach (['sqlite', 'pgsql', 'tenant'] as $name) {
            RefreshDatabaseState::$inMemoryConnections[$name] = $sqlite->getPdo();
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

    protected function actingAsAuthenticatedUser($tenantId = 1): UserModel
    {
        // Bypass tenant middleware completely
        $this->withoutMiddleware([
            TenantMiddleware::class,
        ]);

        $tenant = TenantModel::find(
            '00000000-0000-0000-0000-000000000001'
        );

        // Bind tenant to container
        $this->app->instance('current_tenant', $tenant);

        // Create or get admin role
        $role = \DB::connection('sqlite')
            ->table('roles')
            ->where('name', 'admin')
            ->first();

        if (! $role) {
            $roleId = Str::uuid()->toString();
            \DB::connection('sqlite')->table('roles')->insert([
                'id' => $roleId,
                'name' => 'admin',
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $roleId = $role->id;
        }

        // Create base currency if missing
        $currencyExists = \DB::connection('tenant')
            ->table('currencies')
            ->where('tenant_id', '00000000-0000-0000-0000-000000000001')
            ->where('is_base', 1)
            ->exists();

        if (! $currencyExists) {
            \DB::connection('tenant')->table('currencies')->insert([
                'id' => Str::uuid()->toString(),
                'tenant_id' => '00000000-0000-0000-0000-000000000001',
                'name' => 'US Dollar',
                'code' => 'USD',
                'symbol' => '$',
                'is_base' => 1,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Create fiscal period if missing
        $fiscalExists = \DB::connection('tenant')
            ->table('fiscal_periods')
            ->where('tenant_id', '00000000-0000-0000-0000-000000000001')
            ->exists();

        if (! $fiscalExists) {
            \DB::connection('tenant')->table('fiscal_periods')->insert([
                'id' => Str::uuid()->toString(),
                'tenant_id' => '00000000-0000-0000-0000-000000000001',
                'name' => 'Current Year',
                'start_date' => now()->startOfYear()->toDateString(),
                'end_date' => now()->endOfYear()->toDateString(),
                'status' => 'open',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Create dummy account for tests
        $accountExists = \DB::connection('tenant')
            ->table('accounts')
            ->where('id', 'a209d5c4-0000-4000-8000-000000000000')
            ->exists();

        if (! $accountExists) {
            \DB::connection('tenant')->table('accounts')->insert([
                'id' => 'a209d5c4-0000-4000-8000-000000000000',
                'tenant_id' => '00000000-0000-0000-0000-000000000001',
                'code' => '9999',
                'name' => 'Dummy Test Account',
                'name_ar' => 'حساب وهمي',
                'type' => 'asset',
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Create test user
        $user = UserModel::factory()->create([
            'tenant_id' => '00000000-0000-0000-0000-000000000001',
            'email' => 'test_'.uniqid().'@example.com',
            'role_id' => $roleId,
        ]);

        $this->actingAs($user, 'sanctum');

        $this->withHeaders([
            'X-Tenant-ID' => 'test.example.com',
            'Accept' => 'application/json',
        ]);

        return $user;
    }

    protected function createEmployee(array $overrides = [])
    {
        return EmployeeModel::factory()
            ->create($overrides);
    }

    protected function createSafe(array $overrides = [])
    {
        return SafeModel::factory()
            ->create($overrides);
    }

    protected function createApprovalRequest(array $overrides = [])
    {
        return ApprovalRequestModel::factory()
            ->create($overrides);
    }
}
