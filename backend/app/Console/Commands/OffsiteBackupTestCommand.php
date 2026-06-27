<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Domain\Tenancy\Services\OffSiteBackupValidationService;

class OffsiteBackupTestCommand extends Command
{
    protected $signature = 'backup:test-offsite-validation';
    protected $description = 'Execute a simulated off-site backup validation workflow (non-destructive).';

    public function handle(OffSiteBackupValidationService $service): int
    {
        $this->info("==========================================");
        $this->info("☁️ OFF-SITE BACKUP FULL CYCLE VALIDATION ☁️");
        $this->info("==========================================");

        $metrics = $service->executeValidationWorkflow();

        $this->info("[Step 1] Create backup: " . ($metrics['step_1_created'] ? '✔ PASS' : '❌ FAIL'));
        $this->info("[Step 2] Encrypt: " . ($metrics['step_2_encrypted'] ? '✔ PASS' : '❌ FAIL'));
        $this->info("[Step 3] Upload to Cloud: " . ($metrics['step_3_uploaded'] ? '✔ PASS' : '❌ FAIL'));
        $this->info("[Step 4] Download from Cloud: " . ($metrics['step_4_downloaded'] ? '✔ PASS' : '❌ FAIL'));
        $this->info("[Step 5] Verify SHA256 Checksum: " . ($metrics['step_5_sha_verified'] ? '✔ PASS' : '❌ FAIL'));
        $this->info("[Step 6] Decrypt: " . ($metrics['step_6_decrypted'] ? '✔ PASS' : '❌ FAIL'));
        $this->info("[Step 7] Restore Data to Engine: " . ($metrics['step_7_restored'] ? '✔ PASS' : '❌ FAIL'));
        $this->info("[Step 8] Validate Schema Integration: " . ($metrics['step_8_validated'] ? '✔ PASS' : '❌ FAIL'));

        $this->info("\n==========================================");
        
        // Assert global success
        $globalSuccess = !in_array(false, $metrics, true);

        if ($globalSuccess) {
            $this->info("✅ RESULT: PASS");
            $this->info("End-to-end off-site backup integrity is fully verified.");
            return self::SUCCESS;
        } else {
            $this->error("❌ RESULT: FAIL");
            $this->error("Backup integrity check failed at one or more steps.");
            return self::FAILURE;
        }
    }
}
