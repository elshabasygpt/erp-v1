<?php

namespace App\Jobs;

use App\Domain\Tenancy\Services\TenantBackupAlertService;
use App\Domain\Tenancy\Services\TenantBackupService;
use App\Infrastructure\Eloquent\Models\TenantModel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class BackupTenantJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 7200;

    public function __construct(
        public readonly string $tenantId,
        public readonly string $type = 'scheduled',
        public readonly ?string $backupId = null,
    ) {}

    public function handle(TenantBackupService $service): void
    {
        $tenant = TenantModel::query()->find($this->tenantId);

        if (! $tenant) {
            Log::warning('BackupTenantJob skipped — tenant not found', ['tenant_id' => $this->tenantId]);

            return;
        }

        $backup = null;
        if ($this->backupId) {
            $backup = \App\Infrastructure\Eloquent\Models\TenantBackupModel::query()->find($this->backupId);
        }

        $service->run($tenant, $this->type, $backup);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('BackupTenantJob permanently failed', [
            'tenant_id' => $this->tenantId,
            'error' => $exception->getMessage(),
        ]);

        if ($this->backupId) {
            $backup = \App\Infrastructure\Eloquent\Models\TenantBackupModel::query()->find($this->backupId);
            if ($backup && $backup->status === 'running') {
                $backup->update([
                    'status' => 'failed',
                    'error_message' => $exception->getMessage(),
                    'completed_at' => now(),
                ]);
            }
        }

        $tenant = TenantModel::query()->find($this->tenantId);
        if ($tenant) {
            app(TenantBackupAlertService::class)->notifyFailure($tenant, 'Backup', $exception->getMessage());
        }
    }
}
