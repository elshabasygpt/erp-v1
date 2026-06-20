<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Tenancy\Services\TenantBackupService;
use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Eloquent\Models\TenantBackupModel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DrillSimulationCommand extends Command
{
    protected $signature = 'dr:simulate';

    protected $description = 'Perform a complete Disaster Recovery Simulation (Fire Drill)';

    public function handle(TenantBackupService $backupService): int
    {
        $this->info("==================================================");
        $this->info("🔥 INITIATING PHASE 10: DISASTER RECOVERY DRILL 🔥");
        $this->info("==================================================");

        putenv('BACKUP_ENCRYPTION_KEY=simulated_drill_secret_key_123456');

        try {
            // STEP 1: GENESIS
            $this->info("\n[1/5] GENESIS: Provisioning 'tenant_dr_drill'...");
            $tenantId = 'dr_drill_' . Str::random(6);
            $dbName = 'tenant_' . $tenantId;

            $tenant = TenantModel::create([
                'id' => $tenantId,
                'name' => 'Disaster Recovery Simulation',
                'database_name' => $dbName,
                'domain' => $tenantId . '.erp.local',
                'status' => 'active'
            ]);

            // Ensure DB exists (Using SQLite for simulation safety if Postgres isn't available)
            if (config('database.default') === 'sqlite') {
                $dbPath = database_path($dbName . '.sqlite');
                file_put_contents($dbPath, '');
                config(['database.connections.tenant.database' => $dbPath]);
            } else {
                DB::statement("CREATE DATABASE {$dbName}");
                config(['database.connections.tenant.database' => $dbName]);
            }
            
            DB::purge('tenant');
            DB::reconnect('tenant');

            // Seed dummy data
            Schema::connection('tenant')->create('accounting_journals', function ($table) {
                $table->id();
                $table->string('reference');
                $table->decimal('amount', 15, 2);
            });
            DB::connection('tenant')->table('accounting_journals')->insert(['reference' => 'DR-001', 'amount' => 1000000.50]);
            
            Schema::connection('tenant')->create('inventory_items', function ($table) {
                $table->id();
                $table->string('sku');
                $table->integer('qty');
            });
            DB::connection('tenant')->table('inventory_items')->insert(['sku' => 'A100', 'qty' => 5000]);

            $this->info("✔ Data Seeded: 1,000,000.50 in Ledger, 5000 units of A100.");

            // STEP 2: THE VAULT
            $this->info("\n[2/5] THE VAULT: Executing AES-256 Encrypted Backup...");
            $backup = $backupService->run($tenant, 'dr_drill');
            $this->info("✔ Backup Completed: {$backup->db_dump_path}");
            $this->info("✔ Cryptographic Signature (SHA256): {$backup->db_hash}");

            // STEP 3: ANNIHILATION
            $this->info("\n[3/5] ANNIHILATION: Simulating Catastrophic Server Failure...");
            DB::disconnect('tenant'); // Disconnect to release file lock on Windows
            if (config('database.default') === 'sqlite') {
                unlink($dbPath);
            } else {
                DB::statement("DROP DATABASE {$dbName}");
            }
            $this->info("✔ Database '{$dbName}' completely destroyed.");

            // STEP 4: RESURRECTION
            $this->info("\n[4/5] RESURRECTION: Restoring from AES-256 Vault...");
            if (config('database.default') === 'sqlite') {
                file_put_contents($dbPath, '');
            } else {
                DB::statement("CREATE DATABASE {$dbName}");
            }
            
            $restoreRecord = TenantBackupModel::create([
                'tenant_id' => $tenant->id,
                'type' => 'dr_drill_restore',
                'status' => 'running',
                'restored_from_backup_id' => $backup->id,
                'started_at' => now(),
            ]);

            $backupService->restore($tenant, $backup, $restoreRecord);
            $this->info("✔ Decryption and Restore Successful.");

            // STEP 5: THE AUDIT
            $this->info("\n[5/5] THE AUDIT: Validating Data Integrity...");
            DB::purge('tenant');
            DB::reconnect('tenant');

            $journal = DB::connection('tenant')->table('accounting_journals')->first();
            $inventory = DB::connection('tenant')->table('inventory_items')->first();

            if (!$journal || $journal->amount != 1000000.50) {
                throw new \Exception("Accounting data corruption detected!");
            }
            $this->info("✔ Accounting Intact: Ledger balances perfectly match pre-destruction state.");

            if (!$inventory || $inventory->qty != 5000) {
                throw new \Exception("Inventory data corruption detected!");
            }
            $this->info("✔ Inventory Intact: Stock levels perfectly match pre-destruction state.");

            $this->info("\n==================================================");
            $this->info("✅ DRILL PASSED: ERP DISASTER RECOVERY IS INDESTRUCTIBLE ✅");
            $this->info("==================================================");

        } catch (\Throwable $e) {
            $this->error("\n❌ DRILL FAILED: " . $e->getMessage());
            $this->error($e->getTraceAsString());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
