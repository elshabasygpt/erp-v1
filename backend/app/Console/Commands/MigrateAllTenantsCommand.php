<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Services\TenantDatabaseManager;
use Illuminate\Console\Command;

class MigrateAllTenantsCommand extends Command
{
    protected $signature = 'tenants:migrate
                            {--tenant= : Run only for a specific tenant ID or domain}
                            {--fresh : Run migrate:fresh (drops all tables first — DANGEROUS)}';

    protected $description = 'Run pending tenant migrations on all (or a specific) tenant database(s)';

    public function __construct(private TenantDatabaseManager $manager)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $query = TenantModel::query();

        if ($tenantFilter = $this->option('tenant')) {
            $query->where('id', $tenantFilter)->orWhere('domain', $tenantFilter);
        }

        $tenants = $query->get();

        if ($tenants->isEmpty()) {
            $this->warn('No tenants found.');
            return self::SUCCESS;
        }

        $isFresh = $this->option('fresh');

        if ($isFresh && ! $this->confirm('⚠️  migrate:fresh will DROP all tables in every tenant DB. Continue?', false)) {
            return self::SUCCESS;
        }

        $ok = 0;
        $fail = 0;

        foreach ($tenants as $tenant) {
            $this->line("→ <info>{$tenant->name}</info> ({$tenant->database_name})");
            try {
                $this->manager->switchToDatabase($tenant->database_name);

                $command = $isFresh ? 'migrate:fresh' : 'migrate';
                \Illuminate\Support\Facades\Artisan::call($command, [
                    '--database' => 'tenant',
                    '--path'     => 'database/migrations/tenant',
                    '--force'    => true,
                ]);

                $output = trim(\Illuminate\Support\Facades\Artisan::output());
                if ($output) {
                    $this->line("   {$output}");
                }

                $this->manager->resetConnection();
                $ok++;
            } catch (\Throwable $e) {
                $this->manager->resetConnection();
                $this->error("   FAILED: {$e->getMessage()}");
                $fail++;
            }
        }

        $this->newLine();
        $this->info("Done. ✅ {$ok} succeeded" . ($fail ? ", ❌ {$fail} failed" : '') . '.');

        return $fail > 0 ? self::FAILURE : self::SUCCESS;
    }
}
