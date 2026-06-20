<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Tenancy\Services\TenantBackupService;
use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Eloquent\Models\TenantBackupModel;
use Illuminate\Console\Command;

class TenantRestoreCommand extends Command
{
    protected $signature = 'tenant:restore {tenantId} {--backup_id= : Specific backup UUID to restore from}';
    protected $description = 'Surgically restore a specific tenant without affecting others';

    public function handle(TenantBackupService $backupService): int
    {
        $tenantId = $this->argument('tenantId');
        $backupId = $this->option('backup_id');

        $this->info("==========================================");
        $this->info("🏥 SURGICAL TENANT RESTORE 🏥");
        $this->info("==========================================");
        $this->info("Target Tenant: {$tenantId}");

        try {
            $tenant = TenantModel::findOrFail($tenantId);

            if ($backupId) {
                $backup = TenantBackupModel::where('id', $backupId)->where('tenant_id', $tenantId)->firstOrFail();
            } else {
                $backup = TenantBackupModel::where('tenant_id', $tenantId)
                            ->where('status', 'completed')
                            ->orderBy('created_at', 'desc')
                            ->firstOrFail();
            }

            $this->info("Selected Backup: {$backup->id} (Created at: {$backup->created_at})");

            $restoreRecord = TenantBackupModel::create([
                'tenant_id' => $tenant->id,
                'type' => 'surgical_restore',
                'status' => 'running',
                'restored_from_backup_id' => $backup->id,
                'started_at' => now(),
            ]);

            $this->info("Initiating Vault Decryption and Structural Restoration...");
            
            $backupService->restore($tenant, $backup, $restoreRecord);

            $this->info("\n✅ RESULT: PASS");
            $this->info("Tenant isolated recovery successfully executed. Other tenants remain strictly unmodified.");

        } catch (\Throwable $e) {
            $this->error("\n❌ RESULT: FAIL");
            $this->error($e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
