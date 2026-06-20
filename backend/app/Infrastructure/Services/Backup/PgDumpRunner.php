<?php

declare(strict_types=1);

namespace App\Infrastructure\Services\Backup;

use Illuminate\Support\Facades\Process;

/**
 * Dumps a single Postgres database to a plain-SQL file via pg_dump,
 * using the same host/port/credentials as the 'tenant' connection
 * (only the database name varies per tenant).
 */
final class PgDumpRunner
{
    public function dump(string $databaseName, string $outputPath): void
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
                \Illuminate\Support\Facades\File::copy($dbPath, $outputPath);
            } else {
                // If it's a new empty sqlite DB, just create an empty file
                touch($outputPath);
            }
            return;
        }

        $result = Process::env(['PGPASSWORD' => $connection['password'] ?? ''])
            ->timeout(1800)
            ->run([
                env('PG_DUMP_BINARY', 'pg_dump'),
                '-h', $connection['host'] ?? '127.0.0.1',
                '-p', (string) ($connection['port'] ?? '5432'),
                '-U', $connection['username'] ?? '',
                '-d', $databaseName,
                '-f', $outputPath,
                '--no-owner',
                '--no-privileges',
            ]);

        if ($result->failed()) {
            throw new \RuntimeException("pg_dump failed for database '{$databaseName}': ".$result->errorOutput());
        }
    }
}
