<?php

declare(strict_types=1);

namespace App\Infrastructure\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;

final class TenantDatabaseManager
{
    /**
     * Create a new tenant database.
     */
    public function createDatabase(string $databaseName): void
    {
        DB::connection('pgsql')->statement("CREATE DATABASE \"{$databaseName}\"");
    }

    /**
     * Drop a tenant database.
     */
    public function dropDatabase(string $databaseName): void
    {
        DB::connection('pgsql')->statement("DROP DATABASE IF EXISTS \"{$databaseName}\"");
    }

    /**
     * Run migrations on a tenant database.
     */
    public function runMigrations(string $databaseName): void
    {
        $this->switchToDatabase($databaseName);

        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
            '--force' => true,
        ]);

        $this->resetConnection();
    }

    /**
     * Switch the tenant connection to target a specific database.
     */
    public function switchToDatabase(string $databaseName): void
    {
        Config::set('database.connections.tenant.database', $databaseName);
        DB::purge('tenant');
        DB::reconnect('tenant');
        DB::setDefaultConnection('tenant');
    }

    /**
     * Reset the tenant connection.
     */
    public function resetConnection(): void
    {
        Config::set('database.connections.tenant.database', null);
        DB::purge('tenant');
        DB::setDefaultConnection(config('tenancy.central_connection', 'pgsql'));
    }

    /**
     * Check if a tenant database exists.
     */
    public function databaseExists(string $databaseName): bool
    {
        $result = DB::connection('pgsql')
            ->select("SELECT 1 FROM pg_database WHERE datname = ?", [$databaseName]);

        return !empty($result);
    }

    /**
     * Seed a freshly-created tenant database with default data
     * (e.g. default Chart of Accounts, roles, permissions).
     */
    public function seedTenantDefaults(string $databaseName): void
    {
        $this->switchToDatabase($databaseName);

        Artisan::call('db:seed', [
            '--database' => 'tenant',
            '--class' => 'TenantDefaultSeeder',
            '--force' => true,
        ]);

        $this->resetConnection();
    }
}
