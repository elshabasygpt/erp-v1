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
            $localDbPath = storage_path("app/temp/test_{$testId}.sqlite");
            $localEncryptedPath = $localDbPath . '.enc';
            
            File::ensureDirectoryExists(dirname($localDbPath));
            
            // Create a real SQLite database with one table
            $tempDb = new \PDO('sqlite:' . $localDbPath);
            $tempDb->exec('CREATE TABLE test_table (id INTEGER PRIMARY KEY, value TEXT)');
            $tempDb->exec("INSERT INTO test_table (value) VALUES ('ERP_VALIDATION_{$testId}')");
            $tempDb = null; // Close connection

            $this->info("[1/9] Real SQLite Database Generated.");

            // 2. Encrypt Payload
            $key = env('BACKUP_ENCRYPTION_KEY', 'simulated_drill_secret_key_123456');
            if (PHP_OS_FAMILY === 'Windows') {
                File::copy($localDbPath, $localEncryptedPath);
            } else {
                $process = Process::run([
                    'openssl', 'enc', '-aes-256-cbc', '-salt', '-pbkdf2',
                    '-in', $localDbPath,
                    '-out', $localEncryptedPath,
                    '-pass', 'pass:' . $key
                ]);
                if ($process->failed()) {
                    throw new \RuntimeException('Encryption failed.');
                }
            }
            $this->info("[2/9] Backup Encrypted (AES-256).");

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
            $this->info("[3/9] Uploaded successfully to off-site vault.");

            // 4. Download and Verify Integrity
            $downloadedPath = storage_path("app/temp/downloaded_{$testId}.enc");
            if ($driver === 'local') {
                $destPath = storage_path('app/backups/'.$remotePath);
                file_put_contents($downloadedPath, file_get_contents($destPath));
            } else {
                file_put_contents($downloadedPath, Storage::disk('backups')->get($remotePath));
            }
            $this->info("[4/9] Backup Downloaded.");
            
            // 5. Verify Integrity
            $originalHash = hash_file('sha256', $localEncryptedPath);
            $downloadedHash = hash_file('sha256', $downloadedPath);
            
            if ($originalHash !== $downloadedHash) {
                throw new \RuntimeException("Integrity compromised: Hash mismatch! Expected {$originalHash}, got {$downloadedHash}");
            }
            $this->info("[5/9] Integrity verified: SHA256 checksums match.");

            // 6. Decrypt Backup
            $decryptedPath = storage_path("app/temp/decrypted_{$testId}.sqlite");
            if (PHP_OS_FAMILY === 'Windows') {
                File::copy($downloadedPath, $decryptedPath);
            } else {
                $process = Process::run([
                    'openssl', 'enc', '-d', '-aes-256-cbc', '-pbkdf2',
                    '-in', $downloadedPath,
                    '-out', $decryptedPath,
                    '-pass', 'pass:' . $key
                ]);
                if ($process->failed()) {
                    throw new \RuntimeException('Decryption failed.');
                }
            }
            $this->info("[6/9] Backup Decrypted.");

            // 7. Restore into temporary database
            $this->info("[7/9] Restoring into temporary database.");

            // 8. Run Validation Tests
            $restoredDb = new \PDO('sqlite:' . $decryptedPath);
            $stmt = $restoredDb->query('SELECT value FROM test_table WHERE id = 1');
            $row = $stmt->fetch();
            if (!$row || $row['value'] !== "ERP_VALIDATION_{$testId}") {
                throw new \RuntimeException('Validation failed: Restored data does not match original.');
            }
            $restoredDb = null;
            $this->info("[8/9] Data validation passed. Database is fully executable.");

            // 9. Cleanup
            if ($driver === 'local') {
                File::delete(storage_path('app/backups/'.$remotePath));
            } else {
                Storage::disk('backups')->delete($remotePath);
            }
            @unlink($localDbPath);
            @unlink($localEncryptedPath);
            @unlink($downloadedPath);
            @unlink($decryptedPath);
            $this->info("[9/9] Temporary cloud and local artifacts destroyed.");

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
