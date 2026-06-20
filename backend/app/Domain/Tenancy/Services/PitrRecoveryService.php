<?php

declare(strict_types=1);

namespace App\Domain\Tenancy\Services;

use App\Infrastructure\Eloquent\Models\TenantModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PitrRecoveryService
{
    /**
     * Executes the simulated active PITR validation workflow.
     */
    public function executeActiveValidation(): array
    {
        $metrics = [];
        $connection = config('database.default');
        $isPgsql = config("database.connections.{$connection}.driver") === 'pgsql';

        // 1. Create test record
        $uuid = Str::uuid()->toString();
        $metrics['test_uuid'] = $uuid;
        
        // Use a dedicated table to avoid complex schema cascades during automated audits
        try {
            DB::statement('CREATE TABLE IF NOT EXISTS pitr_audit_logs (id VARCHAR(255) PRIMARY KEY, created_at TIMESTAMP)');
            DB::table('pitr_audit_logs')->insert([
                'id' => $uuid,
                'created_at' => now(),
            ]);
            $metrics['step_1_created'] = true;
        } catch (\Exception $e) {
            $metrics['step_1_created'] = false;
        }

        // 2. Save exact timestamp
        // Sleep slightly to ensure the WAL timestamp delta is clean
        sleep(1);
        $timestamp = Carbon::now();
        $metrics['recovery_target_time'] = $timestamp->toIso8601String();
        
        if (!$isPgsql) {
            $dbPath = config("database.connections.{$connection}.database");
            $backupPath = storage_path("app/pitr_sqlite_wal.bak");
            copy($dbPath, $backupPath);
        }

        // 3. Delete record
        // Another short sleep to ensure the deletion is recorded *after* the timestamp
        sleep(1);
        try {
            DB::table('pitr_audit_logs')->where('id', $uuid)->delete();
            $metrics['step_3_deleted'] = true;
        } catch (\Exception $e) {
            $metrics['step_3_deleted'] = false;
        }

        // 4. Restore database to timestamp
        $metrics['step_4_restored'] = $this->orchestratePhysicalRestore($timestamp, $isPgsql);

        // 5. Verify record exists
        $metrics['step_5_verified'] = $this->verifyRecovery($uuid, $isPgsql);

        // Cleanup local test record if SQLite bypassed the physical restore
        if (!$isPgsql && TenantModel::where('id', $uuid)->exists()) {
             TenantModel::where('id', $uuid)->forceDelete();
        }

        return $metrics;
    }

    /**
     * Orchestrates the actual OS-level recovery commands.
     */
    private function orchestratePhysicalRestore(Carbon $timestamp, bool $isPgsql): bool
    {
        if (!$isPgsql) {
            // For SQLite, "PITR" is emulated by taking a physical copy of the file
            // Note: This must be captured *before* deletion in the main loop to act as the WAL.
            // Since we are restoring here, we overwrite the current db with the backup taken at $timestamp.
            $connection = config('database.default');
            $dbPath = config("database.connections.{$connection}.database");
            $backupPath = storage_path("app/pitr_sqlite_wal.bak");
            
            if (file_exists($backupPath)) {
                copy($backupPath, $dbPath);
                return true;
            }
            return false;
        }

        /* 
         * POSTGRESQL ENTERPRISE EXECUTION: 
         */
        $backupDir = '/var/lib/postgresql/data_pitr_test';
        
        $commands = [
            "pg_basebackup -D {$backupDir} -Fp -Xs -P",
            "echo \"restore_command = 'cp /mnt/archive/%f %p'\" > {$backupDir}/postgresql.auto.conf",
            "echo \"recovery_target_time = '{$timestamp->toIso8601String()}'\" >> {$backupDir}/postgresql.auto.conf",
            "echo \"recovery_target_action = 'promote'\" >> {$backupDir}/postgresql.auto.conf",
            "touch {$backupDir}/recovery.signal",
            "pg_ctl -D {$backupDir} -o '-p 5433' start"
        ];

        foreach ($commands as $cmd) {
            exec($cmd . ' 2>&1', $output, $returnVar);
            if ($returnVar !== 0) {
                // Real failure if pg_basebackup is not installed or fails
                throw new \Exception("PITR OS Command Failed: " . implode("\n", $output));
            }
        }

        return true;
    }

    private function verifyRecovery(string $uuid, bool $isPgsql): bool
    {
        if (!$isPgsql) {
            // Actually query the SQLite database to prove the record was physically restored
            $exists = DB::table('pitr_audit_logs')->where('id', $uuid)->exists();
            return $exists;
        }

        // For Postgres, connect to the secondary cluster on port 5433
        config(['database.connections.pgsql_pitr' => array_merge(
            config('database.connections.pgsql'),
            ['port' => 5433]
        )]);
        
        try {
            return DB::connection('pgsql_pitr')->table('pitr_audit_logs')->where('id', $uuid)->exists();
        } catch (\Exception $e) {
            return false;
        }
    }
}
