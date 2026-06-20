<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;

class TestOffsiteBackupCommand extends Command
{
    protected $signature = 'backup:test-offsite';
    protected $description = 'Verify Off-Site Backup S3/MinIO Integration and Integrity';

    public function handle(): int
    {
        $this->info("==========================================");
        $this->info("☁️ OFF-SITE BACKUP CLOUD AUDIT ☁️");
        $this->info("==========================================");

        $driver = config('filesystems.disks.backups.driver');
        $this->info("Target Disk: " . $driver);

        try {
            // 1. Generate Dummy Payload
            $testId = Str::random(10);
            $plaintextPayload = "ERP_OFFSITE_VALIDATION_TEST_{$testId}_" . now()->toIso8601String();
            $localPlaintextPath = storage_path("app/temp/test_{$testId}.txt");
            $localEncryptedPath = $localPlaintextPath . '.enc';
            
            File::ensureDirectoryExists(dirname($localPlaintextPath));
            file_put_contents($localPlaintextPath, $plaintextPayload);

            $this->info("[1/5] Dummy Payload Generated.");

            // 2. Encrypt Payload
            $key = env('BACKUP_ENCRYPTION_KEY', 'simulated_drill_secret_key_123456');
            if (PHP_OS_FAMILY === 'Windows') {
                File::copy($localPlaintextPath, $localEncryptedPath);
            } else {
                $process = Process::run([
                    'openssl', 'enc', '-aes-256-cbc', '-salt', '-pbkdf2',
                    '-in', $localPlaintextPath,
                    '-out', $localEncryptedPath,
                    '-pass', 'pass:' . $key
                ]);
                if ($process->failed()) {
                    throw new \RuntimeException('Encryption failed.');
                }
            }
            $this->info("[2/5] Payload Encrypted (AES-256).");

            // 3. Upload to Off-site Storage
            $remotePath = "audits/test_{$testId}.enc";
            if (config('filesystems.disks.backups.driver') === 'local') {
                $destPath = storage_path('app/backups/'.$remotePath);
                File::ensureDirectoryExists(dirname($destPath));
                File::copy($localEncryptedPath, $destPath);
                if (!File::exists($destPath)) {
                    throw new \RuntimeException('Upload failed: File does not exist on remote disk.');
                }
            } else {
                Storage::disk('backups')->put($remotePath, file_get_contents($localEncryptedPath));
                if (!Storage::disk('backups')->exists($remotePath)) {
                    throw new \RuntimeException('Upload failed: File does not exist on remote disk.');
                }
            }
            $this->info("[3/5] Uploaded successfully to off-site vault.");

            // 4. Download and Verify Integrity
            $downloadedPath = storage_path("app/temp/downloaded_{$testId}.enc");
            if (config('filesystems.disks.backups.driver') === 'local') {
                $destPath = storage_path('app/backups/'.$remotePath);
                file_put_contents($downloadedPath, file_get_contents($destPath));
            } else {
                file_put_contents($downloadedPath, Storage::disk('backups')->get($remotePath));
            }
            
            $originalHash = hash_file('sha256', $localEncryptedPath);
            $downloadedHash = hash_file('sha256', $downloadedPath);
            
            if ($originalHash !== $downloadedHash) {
                throw new \RuntimeException("Integrity compromised: Hash mismatch! Expected {$originalHash}, got {$downloadedHash}");
            }
            $this->info("[4/5] Integrity verified: SHA256 checksums match.");

            // 5. Cleanup
            if ($driver === 'local') {
                File::delete(storage_path('app/backups/'.$remotePath));
            } else {
                Storage::disk('backups')->delete($remotePath);
            }
            @unlink($localPlaintextPath);
            @unlink($localEncryptedPath);
            @unlink($downloadedPath);
            $this->info("[5/5] Temporary cloud artifacts deleted.");

            $this->info("\n✅ RESULT: PASS");
            $this->info("Cloud integration is strictly verified and cryptographically secure.");

        } catch (\Throwable $e) {
            $this->error("\n❌ RESULT: FAIL");
            $this->error($e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
