<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OffsiteBackupDrillCommand extends Command
{
    protected $signature = 'dr:test-multicloud';
    protected $description = 'Validate Off-Site Backup Recovery across S3, MinIO, Backblaze, Wasabi, Azure, and GCS.';

    public function handle(): int
    {
        $this->info("==========================================");
        $this->info("OFF-SITE BACKUP DISK RECOVERY DRILL");
        $this->info("==========================================");

        $driver = config('filesystems.disks.backups.driver', 'local');
        $this->info("Configured backup disk driver: {$driver}");

        $payload = 'DR_DRILL_' . Str::uuid()->toString();
        $remotePath = 'dr_drill/test_' . Str::random(12) . '.txt';
        $expectedHash = hash('sha256', $payload);

        try {
            $this->info("\n[1/3] Uploading test payload...");
            Storage::disk('backups')->put($remotePath, $payload);
            $this->info("      -> Uploaded to: {$remotePath}");

            $this->info("[2/3] Downloading and verifying SHA-256 integrity...");
            $downloaded = Storage::disk('backups')->get($remotePath);
            if ($downloaded === null) {
                throw new \RuntimeException('Downloaded file is null — storage read failed.');
            }
            $actualHash = hash('sha256', $downloaded);
            if ($actualHash !== $expectedHash) {
                throw new \RuntimeException("Integrity check FAILED. Expected: {$expectedHash}, Got: {$actualHash}");
            }
            $this->info("      -> Checksum verified.");

            $this->info("[3/3] Removing drill artifact...");
            Storage::disk('backups')->delete($remotePath);
            $this->info("      -> Artifact removed.");

            $this->info("\n==========================================");
            $this->info("RESULT: PASS");
            $this->info("Backup disk ({$driver}) is fully operational — upload, download, and integrity checks passed.");
            return self::SUCCESS;

        } catch (\Throwable $e) {
            try { Storage::disk('backups')->delete($remotePath); } catch (\Throwable) {}

            $this->error("\n==========================================");
            $this->error("RESULT: FAIL");
            $this->error($e->getMessage());
            return self::FAILURE;
        }
    }
}
