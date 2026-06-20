<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Tenancy\Services\TenantBackupService;
use App\Infrastructure\Eloquent\Models\TenantModel;
use Illuminate\Console\Command;

class PruneTenantBackupsCommand extends Command
{
    protected $signature = 'backups:prune';

    protected $description = 'Delete the storage for old completed backups beyond the retention window, keeping a minimum number per tenant';

    public function handle(TenantBackupService $service): int
    {
        $retentionDays = (int) env('BACKUP_RETENTION_DAYS', 30);
        $keepMinimum = (int) env('BACKUP_KEEP_MINIMUM', 3);

        $tenants = TenantModel::query()->get();
        $totalPruned = 0;

        foreach ($tenants as $tenant) {
            $totalPruned += $service->pruneOldBackups($tenant, $retentionDays, $keepMinimum);
        }

        $this->info("Pruned {$totalPruned} backup(s) older than {$retentionDays} day(s) across {$tenants->count()} tenant(s), keeping at least {$keepMinimum} per tenant.");

        return self::SUCCESS;
    }
}
