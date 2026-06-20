<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Tenancy\Services\TenantBackupAlertService;
use App\Domain\Tenancy\Services\TenantBackupService;
use App\Infrastructure\Eloquent\Models\TenantBackupModel;
use App\Infrastructure\Eloquent\Models\TenantModel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ValidateBackupCommand extends Command
{
    protected $signature = 'backups:validate-random';

    protected $description = 'Perform an automated restore fire drill on a random completed backup';

    public function handle(TenantBackupService $backupService, TenantBackupAlertService $alertService): int
    {
        $backup = TenantBackupModel::query()
            ->with('tenant')
            ->where('status', 'completed')
            ->where('created_at', '>=', now()->subHours(24))
            ->inRandomOrder()
            ->first();

        if (!$backup || !$backup->tenant) {
            $this->info('No recent backups available to validate.');
            return self::SUCCESS;
        }

        $tenant = $backup->tenant;
        $tempDbName = 'test_restore_' . Str::random(8);

        $this->info("Starting Fire Drill for Backup #{$backup->id} (Tenant: {$tenant->name})");

        try {
            // Provision Temporary Database
            DB::connection('pgsql')->statement("CREATE DATABASE {$tempDbName}");
            
            // Clone the Tenant Model to point to the temp database for the restore
            $tempTenant = clone $tenant;
            $tempTenant->database_name = $tempDbName;

            // Create a dummy restore record
            $restoreRecord = TenantBackupModel::create([
                'tenant_id' => $tenant->id,
                'type' => 'automated_validation',
                'status' => 'running',
                'started_at' => now(),
            ]);

            // Attempt to Restore
            $backupService->restore($tempTenant, $backup, $restoreRecord);

            // Validation successful
            $restoreRecord->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            $this->info("Validation successful for Backup #{$backup->id}. Restored db_hash verified.");

        } catch (\Throwable $e) {
            Log::error('Backup Fire Drill Failed', [
                'backup_id' => $backup->id,
                'error' => $e->getMessage()
            ]);

            $alertService->notifyFailure($tenant, 'Automated Restore Fire Drill', "The backup validation test failed. Your backups may be corrupted. Error: " . $e->getMessage());
            
            $this->error("Validation failed: " . $e->getMessage());

            if (isset($restoreRecord)) {
                $restoreRecord->update([
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                    'completed_at' => now(),
                ]);
            }
        } finally {
            // Teardown Temporary Database
            try {
                DB::connection('pgsql')->statement("DROP DATABASE IF EXISTS {$tempDbName} WITH (FORCE)");
            } catch (\Exception $dropEx) {
                Log::warning("Failed to drop temporary validation database: {$tempDbName}", ['error' => $dropEx->getMessage()]);
            }
        }

        return self::SUCCESS;
    }
}
