<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Tenancy\Services\TenantBackupAlertService;
use App\Infrastructure\Eloquent\Models\TenantBackupModel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckStaleBackupsCommand extends Command
{
    protected $signature = 'backups:check-stale';

    protected $description = 'Detect and fail any backup jobs that have been stuck in running state due to worker crashes';

    public function handle(TenantBackupAlertService $alertService): int
    {
        // Find backups stuck in 'running' for more than 4 hours
        $staleThreshold = now()->subHours(4);

        $staleBackups = TenantBackupModel::query()
            ->with('tenant')
            ->where('status', 'running')
            ->where('started_at', '<', $staleThreshold)
            ->get();

        if ($staleBackups->isEmpty()) {
            $this->info('No stale backups found.');
            return self::SUCCESS;
        }

        foreach ($staleBackups as $backup) {
            Log::error('Detected stale/zombie backup job', [
                'backup_id' => $backup->id,
                'tenant_id' => $backup->tenant_id,
                'started_at' => $backup->started_at,
            ]);

            $backup->update([
                'status' => 'failed',
                'error_message' => 'Backup job silently died (worker crash or timeout). Automatically failed by CheckStaleBackupsCommand.',
                'completed_at' => now(),
            ]);

            if ($backup->tenant) {
                $alertService->notifyFailure(
                    $backup->tenant, 
                    'Scheduled Backup', 
                    'The backup worker unexpectedly crashed or timed out. The backup was permanently stuck in a running state and has been forcefully failed.'
                );
            }
        }

        $this->error("Failed {$staleBackups->count()} stale backup(s).");

        return self::SUCCESS;
    }
}
