<?php
namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use App\Infrastructure\Eloquent\Models\UserModel;

abstract class TestCase extends BaseTestCase
{
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    protected bool $migrationsRun = false;

    protected function setUp(): void
    {
        parent::setUp();
        $this->runMultiTenantMigrations();
    }

    protected function runMultiTenantMigrations(): void
    {
        // Central migrations
        Artisan::call('migrate', [
            '--path'     => 'database/migrations/central',
            '--database' => 'sqlite',
            '--force'    => true,
        ]);

        // Tenant migrations
        Artisan::call('migrate', [
            '--path'     => 'database/migrations/tenant',
            '--database' => 'sqlite',
            '--force'    => true,
        ]);
    }

    protected function actingAsAuthenticatedUser(): void
    {
        $user = UserModel::factory()->create([
            'tenant_id' => 1,
            'email'     => 'test@example.com',
        ]);

        $this->actingAs($user, 'sanctum');
    }

    protected function createEmployee(array $overrides = [])
    {
        return \App\Infrastructure\Eloquent\Models\EmployeeModel::factory()
            ->create(array_merge(['tenant_id' => 1], $overrides));
    }

    protected function createSafe(array $overrides = [])
    {
        return \App\Infrastructure\Eloquent\Models\SafeModel::factory()
            ->create(array_merge(['tenant_id' => 1], $overrides));
    }

    protected function createApprovalRequest(array $overrides = [])
    {
        return \App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel::factory()
            ->create(array_merge(['tenant_id' => 1], $overrides));
    }
}
