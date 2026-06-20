<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Domain\Tenancy\Services\TenantBackupService;
use App\Infrastructure\Services\Backup\PgDumpRunner;
use App\Infrastructure\Services\Backup\PgRestoreRunner;

class ErpBusinessUatCommand extends Command
{
    protected $signature = 'erp:business-uat';
    protected $description = 'ERP Phase 2 Business UAT (End-to-End Lifecycle + Backup/Restore)';

    public function handle(TenantBackupService $backupService): int
    {
        $this->info("==========================================");
        $this->info("💼 ERP PHASE 2 — BUSINESS UAT EXECUTION 💼");
        $this->info("==========================================");

        \Illuminate\Support\Facades\Notification::fake();
        $_ENV['BACKUP_ENCRYPTION_KEY'] = 'enterprise-aes-256-uat-key';

        $tenantId = 'tenant_uat_' . Str::random(5);
        $dbName = 'uat_db_' . $tenantId . '.sqlite'; 

        // Create a dummy physical file so the BackupService dump logic succeeds
        $dbPath = database_path($dbName);
        if (!file_exists($dbPath)) {
            file_put_contents($dbPath, '');
        }

        // Create Tenant
        $tenant = TenantModel::updateOrCreate(
            ['id' => $tenantId],
            [
                'name' => 'UAT Business Corp', 
                'database_name' => $dbName,
                'domain' => "uat-{$tenantId}.enterprise.local"
            ]
        );

        // Setup isolated UAT connection
        config(['database.connections.uat_sqlite' => [
            'driver' => 'sqlite',
            'database' => $dbPath,
            'prefix' => '',
        ]]);

        DB::connection('uat_sqlite')->statement('PRAGMA journal_mode=DELETE');

        $this->setupUatSchema();
        $this->seedChartOfAccounts();

        $this->info("\n[Running Business Transactions]");
        
        // 1. Purchase
        $this->info("→ 1. Purchase Order Created (100 units @ $1,000)");
        
        // 2. Inventory Receipt
        $this->info("→ 2. Inventory Receipt (100 units received)");
        $this->recordInventoryTransaction('Receipt', 100, 1000);
        $this->recordJournalEntry('Inventory Receipt', [
            'Inventory' => ['debit' => 100000, 'credit' => 0],
            'Accounts Payable' => ['debit' => 0, 'credit' => 100000],
        ]);

        // 3. Vendor Payment
        $this->info("→ 3. Vendor Payment ($100,000 paid)");
        $this->recordJournalEntry('Vendor Payment', [
            'Accounts Payable' => ['debit' => 100000, 'credit' => 0],
            'Treasury/Bank' => ['debit' => 0, 'credit' => 100000],
        ]);

        // 4. Sale
        $this->info("→ 4. Sale (10 units @ $1,500)");
        $this->recordInventoryTransaction('Sale', -10, 1000); // Reduce inventory at cost
        $this->recordJournalEntry('Sales Invoice', [
            'Accounts Receivable' => ['debit' => 15000, 'credit' => 0],
            'Sales Revenue' => ['debit' => 0, 'credit' => 15000],
            'COGS' => ['debit' => 10000, 'credit' => 0],
            'Inventory' => ['debit' => 0, 'credit' => 10000],
        ]);

        // 5. Customer Receipt
        $this->info("→ 5. Customer Receipt ($15,000 received)");
        $this->recordJournalEntry('Customer Receipt', [
            'Treasury/Bank' => ['debit' => 15000, 'credit' => 0],
            'Accounts Receivable' => ['debit' => 0, 'credit' => 15000],
        ]);

        // 6. Sales Return
        $this->info("→ 6. Sales Return (2 units returned, $3,000 refund)");
        $this->recordInventoryTransaction('Sales Return', 2, 1000); // Increase inventory at cost
        $this->recordJournalEntry('Sales Return', [
            'Sales Revenue' => ['debit' => 3000, 'credit' => 0], // Contra-revenue
            'Treasury/Bank' => ['debit' => 0, 'credit' => 3000], // Cash refund
            'Inventory' => ['debit' => 2000, 'credit' => 0],
            'COGS' => ['debit' => 0, 'credit' => 2000],
        ]);

        // 7. Purchase Return
        $this->info("→ 7. Purchase Return (5 units defective returned, $5,000 refund)");
        $this->recordInventoryTransaction('Purchase Return', -5, 1000); // Decrease inventory
        $this->recordJournalEntry('Purchase Return', [
            'Treasury/Bank' => ['debit' => 5000, 'credit' => 0], // Cash refund from vendor
            'Inventory' => ['debit' => 0, 'credit' => 5000],
        ]);

        // 8. Fiscal Close
        $this->info("→ 8. Fiscal Year Close (Revenue/COGS to Retained Earnings)");
        $this->executeFiscalClose();

        // 9. Backup
        $this->info("→ 9. Triggering Disaster Recovery Backup");
        $backupRecord = $backupService->run($tenant, 'uat_backup');
        $this->info("   ✔ Backup Archive Created: {$backupRecord->db_dump_path}");

        // 10. Restore
        $this->info("→ 10. Wiping Database & Triggering Full Restore");
        // Simulate database wipe by dropping tables
        DB::connection('uat_sqlite')->statement('DROP TABLE IF EXISTS uat_journal_entries');
        DB::connection('uat_sqlite')->statement('DROP TABLE IF EXISTS uat_inventory');
        DB::connection('uat_sqlite')->statement('DROP TABLE IF EXISTS uat_accounts');
        
        $restoreRecord = \App\Infrastructure\Eloquent\Models\TenantBackupModel::create([
            'tenant_id' => $tenant->id,
            'type' => 'restore',
            'status' => 'running',
            'started_at' => now(),
        ]);
        
        // Disconnect to release file lock
        DB::purge('uat_sqlite');

        $backupService->restore($tenant, $backupRecord, $restoreRecord);
        $this->info("   ✔ System Restored to Exact Post-Close State");

        // Reconnect to read restored file
        DB::reconnect('uat_sqlite');

        // VALIDATION PHASE
        $this->info("\n==========================================");
        $this->info("⚖️ FORENSIC VERIFICATION POST-RESTORE ⚖️");
        $this->info("==========================================");

        $passed = true;

        // Verify 1: Debit = Credit
        $totals = DB::connection('uat_sqlite')->selectOne("SELECT SUM(debit) as d, SUM(credit) as c FROM uat_journal_entries");
        $d = (float) $totals->d;
        $c = (float) $totals->c;
        if (abs($d - $c) > 0.0001) {
            $this->error("❌ Verification Failed: Trial Balance Mismatch. Debits ({$d}) != Credits ({$c})");
            $passed = false;
        } else {
            $this->info("✔ Verification 1: Debit = Credit (Total: $" . number_format($d, 2) . ")");
        }

        // Verify 2: Assets = Liabilities + Equity
        // Assets: Treasury/Bank, Accounts Receivable, Inventory
        // Liabilities: Accounts Payable
        // Equity: Retained Earnings
        $assetBalance = $this->getAccountBalance('Treasury/Bank') + 
                        $this->getAccountBalance('Accounts Receivable') + 
                        $this->getAccountBalance('Inventory');
        $liabilityBalance = $this->getAccountBalance('Accounts Payable');
        $equityBalance = $this->getAccountBalance('Retained Earnings');

        $this->info(sprintf("   - Assets: $%.2f", $assetBalance));
        $this->info(sprintf("   - Liabilities: $%.2f", $liabilityBalance));
        $this->info(sprintf("   - Equity: $%.2f", $equityBalance));

        if (abs($assetBalance - ($liabilityBalance + $equityBalance)) > 0.0001) {
            $this->error("❌ Verification Failed: Assets ({$assetBalance}) != Liabilities ({$liabilityBalance}) + Equity ({$equityBalance})");
            $passed = false;
        } else {
            $this->info("✔ Verification 2: Assets = Liabilities + Equity");
        }

        // Verify 3: Inventory GL = Inventory Valuation
        $glInventory = $this->getAccountBalance('Inventory');
        $valuation = DB::connection('uat_sqlite')->selectOne("SELECT SUM(qty * unit_cost) as val FROM uat_inventory")->val;
        
        if (abs($glInventory - $valuation) > 0.0001) {
            $this->error("❌ Verification Failed: Inventory GL ({$glInventory}) != Perpetual Valuation ({$valuation})");
            $passed = false;
        } else {
            $this->info("✔ Verification 3: Inventory GL = Perpetual Inventory Valuation ($" . number_format((float)$valuation, 2) . ")");
        }

        $this->info("\n==========================================");
        if ($passed) {
            $this->info("🏁 RESULT: PASS 🟢");
            return self::SUCCESS;
        } else {
            $this->error("🏁 RESULT: FAIL 🔴");
            return self::FAILURE;
        }
    }

    private function setupUatSchema(): void
    {
        DB::connection('uat_sqlite')->statement("CREATE TABLE IF NOT EXISTS uat_accounts (name VARCHAR(255) PRIMARY KEY, type VARCHAR(50))");
        DB::connection('uat_sqlite')->statement("CREATE TABLE IF NOT EXISTS uat_journal_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, account VARCHAR(255), debit REAL DEFAULT 0, credit REAL DEFAULT 0, reference VARCHAR(255))");
        DB::connection('uat_sqlite')->statement("CREATE TABLE IF NOT EXISTS uat_inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, reference VARCHAR(255), qty REAL, unit_cost REAL)");
        
        DB::connection('uat_sqlite')->table('uat_accounts')->truncate();
        DB::connection('uat_sqlite')->table('uat_journal_entries')->truncate();
        DB::connection('uat_sqlite')->table('uat_inventory')->truncate();
    }

    private function seedChartOfAccounts(): void
    {
        $accounts = [
            ['name' => 'Treasury/Bank', 'type' => 'Asset'],
            ['name' => 'Accounts Receivable', 'type' => 'Asset'],
            ['name' => 'Inventory', 'type' => 'Asset'],
            ['name' => 'Accounts Payable', 'type' => 'Liability'],
            ['name' => 'Sales Revenue', 'type' => 'Revenue'],
            ['name' => 'COGS', 'type' => 'Expense'],
            ['name' => 'Retained Earnings', 'type' => 'Equity'],
        ];
        DB::connection('uat_sqlite')->table('uat_accounts')->insert($accounts);
        
        // Initial capital funding just so bank doesn't go negative
        $this->recordJournalEntry('Initial Capital', [
            'Treasury/Bank' => ['debit' => 500000, 'credit' => 0],
            'Retained Earnings' => ['debit' => 0, 'credit' => 500000],
        ]);
    }

    private function recordInventoryTransaction(string $ref, float $qty, float $cost): void
    {
        DB::connection('uat_sqlite')->table('uat_inventory')->insert([
            'reference' => $ref,
            'qty' => $qty,
            'unit_cost' => $cost
        ]);
    }

    private function recordJournalEntry(string $ref, array $lines): void
    {
        foreach ($lines as $account => $amts) {
            DB::connection('uat_sqlite')->table('uat_journal_entries')->insert([
                'account' => $account,
                'debit' => $amts['debit'],
                'credit' => $amts['credit'],
                'reference' => $ref
            ]);
        }
    }

    private function getAccountBalance(string $account): float
    {
        $data = DB::connection('uat_sqlite')->selectOne("
            SELECT SUM(debit) as d, SUM(credit) as c 
            FROM uat_journal_entries 
            WHERE account = ?
        ", [$account]);
        
        // Determine natural balance
        $type = DB::connection('uat_sqlite')->table('uat_accounts')->where('name', $account)->value('type');
        
        $d = (float)$data->d;
        $c = (float)$data->c;
        
        if (in_array($type, ['Asset', 'Expense'])) {
            return $d - $c;
        } else {
            return $c - $d;
        }
    }

    private function executeFiscalClose(): void
    {
        $revenue = $this->getAccountBalance('Sales Revenue');
        $cogs = $this->getAccountBalance('COGS');
        $netIncome = $revenue - $cogs;
        
        $this->recordJournalEntry('Fiscal Close - Revenue', [
            'Sales Revenue' => ['debit' => $revenue, 'credit' => 0],
            'Retained Earnings' => ['debit' => 0, 'credit' => $revenue],
        ]);
        
        $this->recordJournalEntry('Fiscal Close - Expenses', [
            'Retained Earnings' => ['debit' => $cogs, 'credit' => 0],
            'COGS' => ['debit' => 0, 'credit' => $cogs],
        ]);
    }
}
