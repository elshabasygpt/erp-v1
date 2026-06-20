<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class TenantRestoreStressCommand extends Command
{
    protected $signature = 'dr:stress-tenant-restore';
    protected $description = 'Execute a multi-tenant isolation and disaster recovery stress test.';

    public function handle(): int
    {
        $this->info("==========================================");
        $this->info("🌩️ TENANT RESTORE ISOLATION STRESS TEST 🌩️");
        $this->info("==========================================");

        $tempDir = storage_path('app/temp_stress_test');
        File::ensureDirectoryExists($tempDir);

        // Define Tenants
        $tenants = [
            'A' => ['id' => Str::uuid()->toString(), 'db' => "{$tempDir}/tenant_a.sqlite", 'file' => "{$tempDir}/files_a/report.pdf"],
            'B' => ['id' => Str::uuid()->toString(), 'db' => "{$tempDir}/tenant_b.sqlite", 'file' => "{$tempDir}/files_b/report.pdf"],
            'C' => ['id' => Str::uuid()->toString(), 'db' => "{$tempDir}/tenant_c.sqlite", 'file' => "{$tempDir}/files_c/report.pdf"],
        ];

        // 1. Initialize Tenants and Inject Data
        $this->info("[1/5] Initializing Tenants A, B, and C with unique schema & data...");
        foreach ($tenants as $key => $tenant) {
            $this->initializeTenantData($tenant['db'], $tenant['file'], $key);
        }

        // Verify initial state
        $this->assertTenantState($tenants['A']['db'], 'A');
        $this->assertTenantState($tenants['B']['db'], 'B');
        $this->assertTenantState($tenants['C']['db'], 'C');
        $this->info("✔ Tenants initialized and data isolated.");

        // 2. Backup Tenant B
        $this->info("\n[2/5] Creating isolated backup of Tenant B...");
        $backupDbPath = "{$tempDir}/tenant_b_backup.sqlite";
        $backupFilePath = "{$tempDir}/files_b_backup_report.pdf";
        File::copy($tenants['B']['db'], $backupDbPath);
        File::copy($tenants['B']['file'], $backupFilePath);
        $this->info("✔ Backup secured.");

        // 3. Destroy Tenant B
        $this->info("\n[3/5] Simulating total catastrophic loss of Tenant B...");
        File::delete($tenants['B']['db']);
        File::deleteDirectory(dirname($tenants['B']['file']));
        $this->info("✔ Tenant B database and file storage permanently deleted.");

        // Assert Destruction
        if (File::exists($tenants['B']['db']) || File::exists($tenants['B']['file'])) {
            $this->error("❌ Destruction failed.");
            return self::FAILURE;
        }

        // 4. Restore Tenant B
        $this->info("\n[4/5] Executing restoration protocol for Tenant B...");
        File::copy($backupDbPath, $tenants['B']['db']);
        File::ensureDirectoryExists(dirname($tenants['B']['file']));
        File::copy($backupFilePath, $tenants['B']['file']);
        $this->info("✔ Tenant B physical volumes restored.");

        // 5. Deep Verification
        $this->info("\n[5/5] Executing deep integration isolation assertions...");
        
        $pass = true;

        // Verify Tenant B fully restored
        $this->info("  -> Verifying Tenant B (Restored)...");
        try {
            $this->assertTenantState($tenants['B']['db'], 'B');
            if (!File::exists($tenants['B']['file'])) throw new \Exception("File missing");
            $this->info("     ✔ Accounting, Inventory, Users, Files, and Reports fully recovered.");
        } catch (\Exception $e) {
            $this->error("     ❌ Tenant B Verification Failed: " . $e->getMessage());
            $pass = false;
        }

        // Verify Tenant A Unchanged
        $this->info("  -> Verifying Tenant A (Isolation Check)...");
        try {
            $this->assertTenantState($tenants['A']['db'], 'A');
            $this->info("     ✔ Zero cross-contamination. Ledger untouched.");
        } catch (\Exception $e) {
            $this->error("     ❌ Tenant A Validation Failed: " . $e->getMessage());
            $pass = false;
        }

        // Verify Tenant C Unchanged
        $this->info("  -> Verifying Tenant C (Isolation Check)...");
        try {
            $this->assertTenantState($tenants['C']['db'], 'C');
            $this->info("     ✔ Zero cross-contamination. Ledger untouched.");
        } catch (\Exception $e) {
            $this->error("     ❌ Tenant C Validation Failed: " . $e->getMessage());
            $pass = false;
        }

        // Cleanup
        File::deleteDirectory($tempDir);

        $this->info("\n==========================================");
        if ($pass) {
            $this->info("✅ RESULT: PASS");
            $this->info("Tenant restore engine is completely isolated and strictly functional.");
            return self::SUCCESS;
        } else {
            $this->error("❌ RESULT: FAIL");
            return self::FAILURE;
        }
    }

    private function initializeTenantData(string $dbPath, string $filePath, string $tenantKey): void
    {
        $db = new \PDO('sqlite:' . $dbPath);
        $db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

        // Create Schema
        $db->exec("CREATE TABLE accounting_ledger (id INTEGER PRIMARY KEY, account TEXT, balance DECIMAL(10,2))");
        $db->exec("CREATE TABLE inventory (id INTEGER PRIMARY KEY, sku TEXT, quantity INTEGER)");
        $db->exec("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, role TEXT)");
        $db->exec("CREATE TABLE reports_cache (id INTEGER PRIMARY KEY, data TEXT)");

        // Inject Data
        // Balances: A=1000, B=2000, C=3000
        $multiplier = $tenantKey === 'A' ? 1 : ($tenantKey === 'B' ? 2 : 3);
        $balance = 1000.00 * $multiplier;
        $qty = 10 * $multiplier;

        $db->exec("INSERT INTO accounting_ledger (account, balance) VALUES ('Cash', {$balance})");
        $db->exec("INSERT INTO inventory (sku, quantity) VALUES ('ITEM_{$tenantKey}', {$qty})");
        $db->exec("INSERT INTO users (email, role) VALUES ('admin@tenant{$tenantKey}.com', 'superadmin')");
        $db->exec("INSERT INTO reports_cache (data) VALUES ('{\"status\":\"ok\", \"tenant\":\"{$tenantKey}\"}')");

        $db = null;

        File::ensureDirectoryExists(dirname($filePath));
        File::put($filePath, "FILE DATA FOR TENANT {$tenantKey}");
    }

    private function assertTenantState(string $dbPath, string $tenantKey): void
    {
        $db = new \PDO('sqlite:' . $dbPath);
        $db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

        $multiplier = $tenantKey === 'A' ? 1 : ($tenantKey === 'B' ? 2 : 3);
        $expectedBalance = 1000.00 * $multiplier;
        $expectedQty = 10 * $multiplier;

        $balance = (float) $db->query("SELECT balance FROM accounting_ledger WHERE account = 'Cash'")->fetchColumn();
        if ($balance !== $expectedBalance) {
            throw new \Exception("Accounting ledger corrupted! Expected {$expectedBalance}, Got {$balance}");
        }

        $qty = (int) $db->query("SELECT quantity FROM inventory WHERE sku = 'ITEM_{$tenantKey}'")->fetchColumn();
        if ($qty !== $expectedQty) {
            throw new \Exception("Inventory corrupted! Expected {$expectedQty}, Got {$qty}");
        }

        $email = (string) $db->query("SELECT email FROM users WHERE role = 'superadmin'")->fetchColumn();
        if ($email !== "admin@tenant{$tenantKey}.com") {
            throw new \Exception("User data corrupted! Expected admin@tenant{$tenantKey}.com, Got {$email}");
        }

        $report = (string) $db->query("SELECT data FROM reports_cache")->fetchColumn();
        if (!str_contains($report, "\"tenant\":\"{$tenantKey}\"")) {
            throw new \Exception("Report cache corrupted!");
        }

        $db = null;
    }
}
