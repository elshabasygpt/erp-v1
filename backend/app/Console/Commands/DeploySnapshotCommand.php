<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Services\Backup\PgDumpRunner;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class DeploySnapshotCommand extends Command
{
    protected $signature = 'deploy:snapshot {--tag= : An optional tag or release version for the snapshot}';

    protected $description = 'Take a high-speed, local-only snapshot of all databases prior to deployment';

    public function handle(PgDumpRunner $dumpRunner): int
    {
        $tag = $this->option('tag') ?: now()->format('Ymd_His');
        $snapshotDir = storage_path("app/snapshots/deploy_{$tag}");

        if (File::exists($snapshotDir)) {
            $this->error("Snapshot directory already exists: {$snapshotDir}");
            return self::FAILURE;
        }

        File::ensureDirectoryExists($snapshotDir);
        $this->info("Creating pre-deployment snapshot at: {$snapshotDir}");

        // 1. Snapshot Central Database
        $centralDb = config('database.connections.pgsql.database');
        $centralDumpPath = "{$snapshotDir}/central.sql";
        $this->info("Dumping central database: {$centralDb}...");
        $dumpRunner->dump($centralDb, $centralDumpPath);

        // 2. Snapshot Tenant Databases
        $tenants = TenantModel::query()->get();
        $this->info("Dumping {$tenants->count()} tenant database(s)...");

        $bar = $this->output->createProgressBar($tenants->count());
        $bar->start();

        foreach ($tenants as $tenant) {
            $tenantDumpPath = "{$snapshotDir}/tenant_{$tenant->id}.sql";
            $dumpRunner->dump($tenant->database_name, $tenantDumpPath);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("Snapshot '{$tag}' created successfully in " . round(microtime(true) - LARAVEL_START, 2) . " seconds.");
        $this->info("Run 'php artisan deploy:rollback --tag={$tag}' to instantly restore these snapshots.");

        return self::SUCCESS;
    }
}
