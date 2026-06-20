<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Services\Backup\PgRestoreRunner;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class DeployRollbackCommand extends Command
{
    protected $signature = 'deploy:rollback {--tag= : The tag/release version of the snapshot to restore}';

    protected $description = 'Instantly rollback a deployment by restoring a fast local snapshot';

    public function handle(PgRestoreRunner $restoreRunner): int
    {
        $tag = $this->option('tag');
        if (!$tag) {
            $this->error('You must specify the snapshot tag to rollback to, e.g. --tag=20231015_120000');
            return self::FAILURE;
        }

        $snapshotDir = storage_path("app/snapshots/deploy_{$tag}");

        if (!File::exists($snapshotDir)) {
            $this->error("Snapshot directory not found: {$snapshotDir}");
            return self::FAILURE;
        }

        if (!$this->confirm("WARNING: This will instantly drop and overwrite ALL databases with the snapshot '{$tag}'. Are you absolutely sure?")) {
            $this->info('Rollback aborted.');
            return self::SUCCESS;
        }

        $this->info("Rolling back databases to snapshot '{$tag}'...");

        // 1. Restore Central Database
        $centralDb = config('database.connections.pgsql.database');
        $centralDumpPath = "{$snapshotDir}/central.sql";
        if (File::exists($centralDumpPath)) {
            $this->info("Restoring central database: {$centralDb}...");
            $restoreRunner->wipeDatabase($centralDb);
            $restoreRunner->restore($centralDb, $centralDumpPath);
        } else {
            $this->warn("No central database snapshot found at {$centralDumpPath}. Skipping.");
        }

        // 2. Restore Tenant Databases
        $tenants = TenantModel::query()->get();
        $this->info("Restoring {$tenants->count()} tenant database(s)...");

        $bar = $this->output->createProgressBar($tenants->count());
        $bar->start();

        foreach ($tenants as $tenant) {
            $tenantDumpPath = "{$snapshotDir}/tenant_{$tenant->id}.sql";
            if (File::exists($tenantDumpPath)) {
                $restoreRunner->wipeDatabase($tenant->database_name);
                $restoreRunner->restore($tenant->database_name, $tenantDumpPath);
            } else {
                $this->warn("\nMissing snapshot for tenant: {$tenant->database_name}");
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("Deployment successfully rolled back to '{$tag}'!");

        return self::SUCCESS;
    }
}
