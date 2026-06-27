<?php

declare(strict_types=1);

namespace App\Domain\Tenancy\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;

class PitrRecoveryService
{
    /**
     * Executes the simulated active PITR validation workflow.
     */
    public function executeActiveValidation(): array
    {
        $metrics = [];
        $isPgsql = config('database.connections.' . config('database.default') . '.driver') === 'pgsql';

        if (! $isPgsql) {
            return $this->executeActiveValidationSqlite($metrics);
        }

        return $this->executeActiveValidationPgsql($metrics);
    }

    /**
     * SQLite PITR emulation using a fully isolated temporary database.
     * Never touches the real application database.
     */
    private function executeActiveValidationSqlite(array $metrics): array
    {
        $uuid = Str::uuid()->toString();
        $metrics['test_uuid'] = $uuid;

        $tempDbPath = storage_path('app/tmp/pitr_test_' . Str::random(8) . '.sqlite');
        $snapshotPath = $tempDbPath . '.bak';

        File::ensureDirectoryExists(dirname($tempDbPath));

        config(['database.connections.pitr_test' => [
            'driver'                  => 'sqlite',
            'database'                => $tempDbPath,
            'foreign_key_constraints' => false,
        ]]);

        try {
            // 1. Create test record in isolated DB
            DB::connection('pitr_test')->statement(
                'CREATE TABLE IF NOT EXISTS pitr_audit_logs (id VARCHAR(255) PRIMARY KEY, created_at TEXT)'
            );
            DB::connection('pitr_test')->table('pitr_audit_logs')->insert([
                'id'         => $uuid,
                'created_at' => now()->toIso8601String(),
            ]);
            $metrics['step_1_created'] = true;

            // 2. Take snapshot before deletion (simulates WAL checkpoint)
            $timestamp = Carbon::now();
            $metrics['recovery_target_time'] = $timestamp->toIso8601String();
            DB::purge('pitr_test'); // close file handle before copying
            copy($tempDbPath, $snapshotPath);

            // Reconnect to perform the deletion
            config(['database.connections.pitr_test.database' => $tempDbPath]);

            // 3. Delete record (simulates accidental data loss after the checkpoint)
            DB::connection('pitr_test')->table('pitr_audit_logs')->where('id', $uuid)->delete();
            $metrics['step_3_deleted'] = true;

            // 4. Restore: overwrite the isolated DB with the pre-deletion snapshot
            DB::purge('pitr_test');
            copy($snapshotPath, $tempDbPath);
            $metrics['step_4_restored'] = true;

            // 5. Verify the record is back
            $exists = DB::connection('pitr_test')
                ->table('pitr_audit_logs')
                ->where('id', $uuid)
                ->exists();

            $metrics['step_5_verified'] = $exists;

        } finally {
            DB::purge('pitr_test');
            @unlink($tempDbPath);
            @unlink($snapshotPath);
        }

        return $metrics;
    }

    /**
     * PostgreSQL PITR via pg_basebackup + recovery.signal on a secondary cluster.
     */
    private function executeActiveValidationPgsql(array $metrics): array
    {
        $uuid = Str::uuid()->toString();
        $metrics['test_uuid'] = $uuid;

        try {
            DB::statement('CREATE TABLE IF NOT EXISTS pitr_audit_logs (id VARCHAR(255) PRIMARY KEY, created_at TIMESTAMP)');
            DB::table('pitr_audit_logs')->insert(['id' => $uuid, 'created_at' => now()]);
            $metrics['step_1_created'] = true;
        } catch (\Exception $e) {
            $metrics['step_1_created'] = false;
        }

        sleep(1);
        $timestamp = Carbon::now();
        $metrics['recovery_target_time'] = $timestamp->toIso8601String();

        sleep(1);
        try {
            DB::table('pitr_audit_logs')->where('id', $uuid)->delete();
            $metrics['step_3_deleted'] = true;
        } catch (\Exception $e) {
            $metrics['step_3_deleted'] = false;
        }

        $metrics['step_4_restored'] = $this->orchestratePgsqlRestore($timestamp);
        $metrics['step_5_verified']  = $this->verifyPgsqlRecovery($uuid);

        return $metrics;
    }

    private function orchestratePgsqlRestore(Carbon $timestamp): bool
    {
        $backupDir = '/var/lib/postgresql/data_pitr_test';

        $commands = [
            "pg_basebackup -D {$backupDir} -Fp -Xs -P",
            "echo \"restore_command = 'cp /mnt/archive/%f %p'\" > {$backupDir}/postgresql.auto.conf",
            "echo \"recovery_target_time = '{$timestamp->toIso8601String()}'\" >> {$backupDir}/postgresql.auto.conf",
            "echo \"recovery_target_action = 'promote'\" >> {$backupDir}/postgresql.auto.conf",
            "touch {$backupDir}/recovery.signal",
            "pg_ctl -D {$backupDir} -o '-p 5433' start",
        ];

        foreach ($commands as $cmd) {
            $result = Process::run($cmd);
            if ($result->failed()) {
                throw new \RuntimeException('PITR command failed: ' . $result->errorOutput());
            }
        }

        return true;
    }

    private function verifyPgsqlRecovery(string $uuid): bool
    {
        config(['database.connections.pgsql_pitr' => array_merge(
            config('database.connections.pgsql'),
            ['port' => 5433]
        )]);

        try {
            return DB::connection('pgsql_pitr')
                ->table('pitr_audit_logs')
                ->where('id', $uuid)
                ->exists();
        } catch (\Exception $e) {
            return false;
        }
    }
}
