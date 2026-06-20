<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Jobs\BackupTenantJob;
use Illuminate\Console\Command;

class RunDailyTenantBackupsCommand extends Command
{
    protected $signature = 'backups:run-daily';

    protected $description = 'Dispatch a scheduled backup job for every active tenant';

    public function handle(): int
    {
        $tenants = TenantModel::query()->where('status', '!=', 'suspended')->get();

        foreach ($tenants as $tenant) {
            BackupTenantJob::dispatch($tenant->id, 'scheduled');
        }

        $this->info("Dispatched backup jobs for {$tenants->count()} tenant(s).");

        return self::SUCCESS;
    }
}
