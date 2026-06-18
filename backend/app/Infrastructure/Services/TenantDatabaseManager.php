<?php

declare(strict_types=1);

namespace App\Infrastructure\Services;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

final class TenantDatabaseManager
{
    /**
     * Create a new tenant database.
     */
    public function createDatabase(string $databaseName): void
    {
        DB::connection(env('DB_CONNECTION', 'pgsql'))->statement("CREATE DATABASE \"{$databaseName}\"");
    }

    /**
     * Drop a tenant database.
     */
    public function dropDatabase(string $databaseName): void
    {
        DB::connection(env('DB_CONNECTION', 'pgsql'))->statement("DROP DATABASE IF EXISTS \"{$databaseName}\"");
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
        if ($databaseName === ':memory:') {
            return;
        }

        if (app()->environment('testing')) {
            // dump("switchToDatabase called with $databaseName");
        }

        $driver = config('database.connections.tenant.driver');
        if ($driver === 'sqlite') {
            if ($databaseName === 'saas_accounting_central' || $databaseName === env('DB_DATABASE')) {
                $databaseName = database_path('database.sqlite');
            } else {
                if (! str_ends_with($databaseName, '.sqlite') && ! str_contains($databaseName, DIRECTORY_SEPARATOR)) {
                    $databaseName = database_path($databaseName.'.sqlite');
                }
            }
            if (! file_exists($databaseName)) {
                touch($databaseName);
            }
        }

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
        if (Config::get('database.connections.tenant.database') === ':memory:') {
            return;
        }

        if (app()->environment('testing')) {
            dump('resetConnection called! Purging tenant connection!');
        }

        Config::set('database.connections.tenant.database', null);
        DB::purge('tenant');
        DB::setDefaultConnection(config('database.default'));
    }

    /**
     * Check if a tenant database exists.
     */
    public function databaseExists(string $databaseName): bool
    {
        $result = DB::connection(env('DB_CONNECTION', 'pgsql'))
            ->select('SELECT 1 FROM pg_database WHERE datname = ?', [$databaseName]);

        return ! empty($result);
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
