<?php

namespace App\Jobs;

use App\Domain\Tenancy\Services\TenantBackupAlertService;
use App\Domain\Tenancy\Services\TenantBackupService;
use App\Infrastructure\Eloquent\Models\TenantBackupModel;
use App\Infrastructure\Eloquent\Models\TenantModel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RestoreTenantBackupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 7200;

    public function __construct(
        public readonly string $tenantId,
        public readonly string $sourceBackupId,
        public readonly string $restoreRecordId,
    ) {}

    public function handle(TenantBackupService $service): void
    {
        $tenant = TenantModel::query()->find($this->tenantId);
        $sourceBackup = TenantBackupModel::query()->find($this->sourceBackupId);
        $restoreRecord = TenantBackupModel::query()->find($this->restoreRecordId);

        if (! $tenant || ! $sourceBackup || ! $restoreRecord) {
            Log::warning('RestoreTenantBackupJob skipped — tenant, backup, or restore record not found', [
                'tenant_id' => $this->tenantId,
                'backup_id' => $this->sourceBackupId,
                'restore_record_id' => $this->restoreRecordId,
            ]);

            return;
        }

        $service->restore($tenant, $sourceBackup, $restoreRecord);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('RestoreTenantBackupJob permanently failed', [
            'tenant_id' => $this->tenantId,
            'backup_id' => $this->sourceBackupId,
            'error' => $exception->getMessage(),
        ]);

        $restoreRecord = TenantBackupModel::query()->find($this->restoreRecordId);
        if ($restoreRecord && $restoreRecord->status === 'running') {
            $restoreRecord->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
                'completed_at' => now(),
            ]);
        }

        $tenant = TenantModel::query()->find($this->tenantId);
        if ($tenant) {
            app(TenantBackupAlertService::class)->notifyFailure($tenant, 'Restore', $exception->getMessage());
        }
    }
}
