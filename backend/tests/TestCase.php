<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Migrate central/default migrations if in testing and using sqlite
        if (config('database.default') === 'sqlite') {
            $this->artisan('migrate', [
                '--path' => 'database/migrations/central',
                '--force' => true,
            ]);
        }

        // Migrate tenant migrations on the tenant connection if using sqlite
        if (config('database.connections.tenant.driver') === 'sqlite') {
            $this->artisan('migrate', [
                '--database' => 'tenant',
                '--path' => 'database/migrations/tenant',
                '--force' => true,
            ]);
        }
    }
}
