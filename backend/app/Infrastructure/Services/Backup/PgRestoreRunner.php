<?php

declare(strict_types=1);

namespace App\Infrastructure\Services\Backup;

use App\Infrastructure\Services\TenantDatabaseManager;
use Illuminate\Support\Facades\Process;

/**
 * Restores a plain-SQL dump (produced by PgDumpRunner) into a database via psql.
 * Assumes the target database already exists and the caller has decided
 * whether to wipe it first.
 */
final class PgRestoreRunner
{
    public function __construct(
        private TenantDatabaseManager $databaseManager,
    ) {}

    public function restore(string $databaseName, string $dumpPath): void
    {
        $connection = config('database.connections.tenant');

        if (($connection['driver'] ?? 'pgsql') === 'sqlite') {
            if (\Illuminate\Support\Facades\File::exists($dumpPath)) {
                $dbPath = str_contains($databaseName, DIRECTORY_SEPARATOR) || str_contains($databaseName, '/') 
                    ? $databaseName 
                    : database_path($databaseName);
                if (!str_ends_with($dbPath, '.sqlite')) {
                    $dbPath .= '.sqlite';
                }
                \Illuminate\Support\Facades\File::copy($dumpPath, $dbPath);
            }
            return;
        }

        $result = Process::env(['PGPASSWORD' => $connection['password'] ?? ''])
            ->timeout(1800)
            ->run([
                env('PSQL_BINARY', 'psql'),
                '-h', $connection['host'] ?? '127.0.0.1',
                '-p', (string) ($connection['port'] ?? '5432'),
                '-U', $connection['username'] ?? '',
                '-d', $databaseName,
                '-v', 'ON_ERROR_STOP=1',
                '-f', $dumpPath,
            ]);

        if ($result->failed()) {
            throw new \RuntimeException("Restore failed for database '{$databaseName}': ".$result->errorOutput());
        }
    }

    /**
     * Drop and recreate the database before restoring, so the restore
     * starts from a clean slate (avoids leftover objects from current state).
     */
    public function wipeDatabase(string $databaseName): void
    {
        $connection = config('database.connections.tenant');
        if (($connection['driver'] ?? 'pgsql') === 'sqlite') {
            $dbPath = str_contains($databaseName, DIRECTORY_SEPARATOR) || str_contains($databaseName, '/') 
                ? $databaseName 
                : database_path($databaseName);
            if (!str_ends_with($dbPath, '.sqlite')) {
                $dbPath .= '.sqlite';
            }
            if (\Illuminate\Support\Facades\File::exists($dbPath)) {
                \Illuminate\Support\Facades\File::delete($dbPath);
            }
            touch($dbPath);
            return;
        }

        $this->databaseManager->dropDatabase($databaseName);
        $this->databaseManager->createDatabase($databaseName);
    }
}
