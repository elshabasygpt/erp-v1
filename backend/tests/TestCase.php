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
        $sqlite = \Illuminate\Support\Facades\DB::connection('sqlite');
        $pgsql = \Illuminate\Support\Facades\DB::connection('pgsql');
        $tenant = \Illuminate\Support\Facades\DB::connection('tenant');

        $pgsql->setPdo($sqlite->getPdo());
        $tenant->setPdo($sqlite->getPdo());

        $sync = function ($target, $source) {
            $target->transactions = &$source->transactions;
        };
        $sync = $sync->bindTo(null, \Illuminate\Database\Connection::class);
        $sync($pgsql, $sqlite);
        $sync($tenant, $sqlite);

        if (! \Illuminate\Foundation\Testing\RefreshDatabaseState::$migrated) {
            \Illuminate\Support\Facades\DB::connection('sqlite')->commit();

            Artisan::call('migrate:fresh', [
                '--database' => 'sqlite',
            ]);

            // Now we ONLY run migrations on the sqlite connection because they share the same PDO!
            Artisan::call('migrate', [
                '--path'     => 'database/migrations/central',
                '--database' => 'sqlite',
                '--force'    => true,
            ]);

            Artisan::call('migrate', [
                '--path'     => 'database/migrations/tenant',
                '--database' => 'sqlite',
                '--force'    => true,
            ]);

            if (!\Illuminate\Support\Facades\Schema::connection('sqlite')->hasTable('cache')) {
                \Illuminate\Support\Facades\Schema::connection('sqlite')->create('cache', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('key')->primary();
                    $table->mediumText('value');
                    $table->integer('expiration');
                });
                \Illuminate\Support\Facades\Schema::connection('sqlite')->create('cache_locks', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('key')->primary();
                    $table->string('owner');
                    $table->integer('expiration');
                });
            }

            \Illuminate\Foundation\Testing\RefreshDatabaseState::$migrated = true;
        }

        $this->beginDatabaseTransaction();

        foreach ($this->connectionsToTransact() as $name) {
            \Illuminate\Foundation\Testing\RefreshDatabaseState::$inMemoryConnections[$name] = \Illuminate\Support\Facades\DB::connection($name)->getPdo();
        }
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

    protected function actingAsAuthenticatedUser($tenantId = 1)   {
        $this->withoutMiddleware(\App\Presentation\Middleware\TenantMiddleware::class);

        // Create a Tenant in the central database
        $tenantId = '1';
        $tenant = \App\Infrastructure\Eloquent\Models\TenantModel::where('id', $tenantId)->first();
        if (!$tenant) {
            $tenant = \App\Infrastructure\Eloquent\Models\TenantModel::forceCreate([
                'id' => $tenantId,
                'name' => 'Test Tenant',
                'domain' => 'test.example.com',
                'database_name' => 'tenant', // This doesn't matter because DatabaseManager is mocked or we share PDO
                'status' => 'active',
            ]);
        }

        // Bind current tenant to the container, since we disabled the middleware
        $this->app->instance('current_tenant', $tenant);

        if (!\App\Infrastructure\Eloquent\Models\RoleModel::where('name', 'admin')->exists()) {
            $role = \App\Infrastructure\Eloquent\Models\RoleModel::forceCreate([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'name' => 'admin',
                'guard_name' => 'web',
            ]);
        } else {
            $role = \App\Infrastructure\Eloquent\Models\RoleModel::where('name', 'admin')->first();
        }

        $user = UserModel::factory()->create([
            'email'     => 'test@example.com',
            'role_id'   => $role->id,
        ]);

        $this->actingAs($user, 'sanctum');
        
        // Add the Tenant ID header for all subsequent API requests in the test!
        // We pass the domain because if it's not a UUID, the middleware checks domain
        $this->withHeaders([
            'X-Tenant-ID' => 'test.example.com',
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
