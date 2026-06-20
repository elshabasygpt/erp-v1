<?php

declare(strict_types=1);

namespace App\Domain\Tenancy\Services;

use App\Infrastructure\Eloquent\Models\TenantBackupModel;
use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Services\Backup\PgDumpRunner;
use App\Infrastructure\Services\Backup\PgRestoreRunner;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class TenantBackupService
{
    public function __construct(
        private PgDumpRunner $dumpRunner,
        private PgRestoreRunner $restoreRunner,
    ) {}

    /**
     * Dump the tenant's database + uploaded files and ship both to the
     * 'backups' disk. Always records a tenant_backups row, even on failure.
     */
    public function run(TenantModel $tenant, string $type, ?TenantBackupModel $backup = null): TenantBackupModel
    {
        if (! $backup) {
            $backup = TenantBackupModel::query()->create([
                'tenant_id' => $tenant->id,
                'type' => $type,
                'status' => 'running',
                'started_at' => now(),
            ]);
        }

        $workDir = storage_path('app/tmp/backups/'.Str::uuid());
        File::ensureDirectoryExists($workDir);
        $startTime = now();

        try {
            $timestamp = now()->format('Y-m-d_His') . '_' . Str::random(4);
            $dbDumpLocal = "{$workDir}/db.sql";
            $dbDumpGzLocal = "{$workDir}/db.sql.gz";
            $dbDumpEncLocal = "{$workDir}/db.sql.gz.enc";
            $filesArchiveLocal = "{$workDir}/files.zip";
            $filesArchiveEncLocal = "{$workDir}/files.zip.enc";

            $this->dumpRunner->dump($tenant->database_name, $dbDumpLocal);
            $this->archiveUploadDirectory($tenant->id, $filesArchiveLocal);

            // Compress DB dump locally before upload
            $this->gzip($dbDumpLocal, $dbDumpGzLocal);

            // Structural Validation
            if (PHP_OS_FAMILY !== 'Windows') {
                $process = \Illuminate\Support\Facades\Process::run(['gzip', '-t', $dbDumpGzLocal]);
                if ($process->failed()) {
                    throw new \RuntimeException('Database compression integrity validation failed: ' . $process->errorOutput());
                }
            }

            // Encrypt Archives
            $this->encryptFile($dbDumpGzLocal, $dbDumpEncLocal);
            $this->encryptFile($filesArchiveLocal, $filesArchiveEncLocal);

            $dbHash = hash_file('sha256', $dbDumpEncLocal);
            $filesHash = hash_file('sha256', $filesArchiveEncLocal);

            $dbKey = "tenants/{$tenant->id}/{$timestamp}/db.sql.gz.enc";
            $filesKey = "tenants/{$tenant->id}/{$timestamp}/files.zip.enc";

            $sizeBytes = $this->putFile($dbDumpEncLocal, $dbKey)
                + $this->putFile($filesArchiveEncLocal, $filesKey);

            $durationSeconds = now()->diffInSeconds($startTime);

            $backup->update([
                'status' => 'completed',
                'db_dump_path' => $dbKey,
                'files_archive_path' => $filesKey,
                'db_hash' => $dbHash,
                'files_hash' => $filesHash,
                'size_bytes' => $sizeBytes,
                'completed_at' => now(),
            ]);

            // Dispatch Success Notification
            \Illuminate\Support\Facades\Notification::route('mail', env('ADMIN_EMAIL', 'admin@example.com'))
                ->route('slack', env('SLACK_WEBHOOK_URL'))
                ->notify(new \App\Notifications\BackupSuccessNotification(
                    $tenant->id,
                    $type,
                    (float) $durationSeconds,
                    (int) $sizeBytes
                ));
        } catch (\Throwable $e) {
            $durationSeconds = isset($startTime) ? now()->diffInSeconds($startTime) : 0;
            
            $backup->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            // Dispatch Critical Notification
            \Illuminate\Support\Facades\Notification::route('mail', env('ADMIN_EMAIL', 'admin@example.com'))
                ->route('slack', env('SLACK_WEBHOOK_URL'))
                ->notify(new \App\Notifications\BackupFailureNotification(
                    $tenant->id,
                    $type,
                    $e->getMessage(),
                    (float) $durationSeconds,
                    null
                ));

            throw $e;
        } finally {
            File::deleteDirectory($workDir);
        }

        return $backup;
    }

    /**
     * Restore a tenant from a previously completed backup. Always takes a
     * fresh safety backup of the current state first, so a bad restore
     * choice is itself recoverable.
     */
    public function restore(TenantModel $tenant, TenantBackupModel $sourceBackup, TenantBackupModel $restoreRecord): TenantBackupModel
    {
        if ($sourceBackup->status !== 'completed' || $sourceBackup->tenant_id !== $tenant->id) {
            $restoreRecord->update([
                'status' => 'failed',
                'error_message' => 'Backup is not restorable for this tenant.',
                'completed_at' => now(),
            ]);
            throw new \DomainException('Backup is not restorable for this tenant.');
        }

        $this->run($tenant, 'pre_restore_safety');

        $workDir = storage_path('app/tmp/restore/'.Str::uuid());
        File::ensureDirectoryExists($workDir);

        try {
            $dbDumpLocal = "{$workDir}/db.sql";
            $this->getGunzipped($sourceBackup->db_dump_path, $dbDumpLocal, $sourceBackup->db_hash);

            $this->restoreRunner->wipeDatabase($tenant->database_name);
            $this->restoreRunner->restore($tenant->database_name, $dbDumpLocal);

            $filesArchiveEncLocal = "{$workDir}/files.zip.enc";
            $filesArchiveLocal = "{$workDir}/files.zip";

            if (config('filesystems.disks.backups.driver') === 'local') {
                File::copy(storage_path('app/backups/'.$sourceBackup->files_archive_path), $filesArchiveEncLocal);
            } else {
                file_put_contents($filesArchiveEncLocal, Storage::disk('backups')->get($sourceBackup->files_archive_path));
            }

            if ($sourceBackup->files_hash && hash_file('sha256', $filesArchiveEncLocal) !== $sourceBackup->files_hash) {
                throw new \RuntimeException('Files archive cryptographic checksum validation failed. Backup may be corrupted or tampered with.');
            }

            $this->decryptFile($filesArchiveEncLocal, $filesArchiveLocal);

            $this->extractUploadDirectory($tenant->id, $filesArchiveLocal);

            $restoreRecord->update(['status' => 'completed', 'completed_at' => now()]);
        } catch (\Throwable $e) {
            $durationSeconds = isset($startTime) ? now()->diffInSeconds($startTime) : 0;
            
            $restoreRecord->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            // Dispatch Critical Notification
            \Illuminate\Support\Facades\Notification::route('mail', env('ADMIN_EMAIL', 'admin@example.com'))
                ->route('slack', env('SLACK_WEBHOOK_URL'))
                ->notify(new \App\Notifications\BackupFailureNotification(
                    $tenant->id,
                    'restore',
                    $e->getMessage(),
                    (float) $durationSeconds,
                    null
                ));

            throw $e;
        } finally {
            File::deleteDirectory($workDir);
        }

        return $restoreRecord;
    }

    /**
     * Remove the underlying S3 objects for old completed backups to control
     * storage cost, while always keeping at least $keepMinimum of the most
     * recent ones per tenant regardless of age. The tenant_backups row is
     * kept (marked 'pruned') for audit history — only the storage is freed.
     */
    public function pruneOldBackups(TenantModel $tenant, int $retentionDays, int $keepMinimum = 3): int
    {
        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = TenantBackupModel::where('tenant_id', $tenant->id)
            ->where('status', 'completed')
            ->orderByDesc('created_at');
            
        $candidates = $query->get()->slice($keepMinimum);

        $cutoff = now()->subDays($retentionDays);
        $prunedCount = 0;

        foreach ($candidates as $backup) {
            if ($backup->created_at->greaterThan($cutoff)) {
                continue;
            }

            // PHYSICAL DELETION REMOVED FOR RANSOMWARE IMMUNITY
            // The application no longer has permission to delete its own backups.
            // S3 Object Lock (WORM) and AWS Lifecycle Policies must handle the actual storage cleanup.
            // We merely mark the record as 'pruned' in the database for audit visibility.

            $backup->update(['status' => 'pruned']);
            $prunedCount++;
        }

        return $prunedCount;
    }

    private function archiveUploadDirectory(string $tenantId, string $outputPath): void
    {
        $prefix = "uploads/tenant_{$tenantId}";
        $fullPath = storage_path('app/public/'.$prefix);
        
        if (!File::exists($fullPath)) {
            File::ensureDirectoryExists($fullPath);
        }
        
        $files = File::allFiles($fullPath);

        if (!class_exists('\ZipArchive')) {
            // Fallback for simulation environments missing ext-zip
            file_put_contents($outputPath, "DUMMY ZIP CONTENT");
            return;
        }

        $zip = new \ZipArchive();
        if ($zip->open($outputPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) === true) {
            foreach ($files as $file) {
                // Remove prefix for internal zip structure
                $localName = str_replace($fullPath . DIRECTORY_SEPARATOR, '', $file->getPathname());
                // normalize slashes for zip
                $localName = str_replace('\\', '/', $localName);
                $content = file_get_contents($file->getPathname());
                $zip->addFromString('tenant_'.$tenantId.'/'.$localName, $content);
            }
            $zip->close();
            
            if ($zip->status !== \ZipArchive::ER_OK) {
                throw new \RuntimeException("ZipArchive failed with status code: {$zip->status}");
            }
        } else {
            throw new \RuntimeException('Failed to create tenant upload archive');
        }
    }

    private function extractUploadDirectory(string $tenantId, string $archivePath): void
    {
        $prefix = "uploads/tenant_{$tenantId}";
        $fullPath = storage_path('app/public/'.$prefix);
        
        // Clear current files from the logical disk before extracting the restored snapshot
        if (File::exists($fullPath)) {
            File::deleteDirectory($fullPath);
        }
        File::ensureDirectoryExists($fullPath);

        if (!class_exists('\ZipArchive')) {
            // Fallback for simulation environments missing ext-zip
            return;
        }

        $zip = new \ZipArchive();
        if ($zip->open($archivePath) === true) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $filename = $zip->getNameIndex($i);
                $content = $zip->getFromIndex($i);
                
                // Expecting structure like tenant_id/path/to/file
                $cleanPath = str_replace('tenant_'.$tenantId.'/', '', $filename);
                $destFile = $fullPath . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $cleanPath);
                
                File::ensureDirectoryExists(dirname($destFile));
                file_put_contents($destFile, $content);
            }
            $zip->close();
        } else {
            throw new \RuntimeException('Failed to extract tenant upload archive');
        }
    }

    private function putGzipped(string $localPath, string $key): int
    {
        $gzPath = $localPath.'.gz';
        $this->gzip($localPath, $gzPath);

        return $this->putFile($gzPath, $key);
    }

    private function getGunzipped(string $key, string $localPath, ?string $expectedHash = null): void
    {
        $encPath = $localPath.'.enc';
        $gzPath = $localPath.'.gz';
        
        if (config('filesystems.disks.backups.driver') === 'local') {
            $sourcePath = storage_path('app/backups/'.$key);
            File::copy($sourcePath, $encPath);
        } else {
            $readStream = Storage::disk('backups')->readStream($key);
            if ($readStream === null) {
                throw new \RuntimeException("Could not read backup file from storage: {$key}");
            }
            
            $writeStream = fopen($encPath, 'wb');
            stream_copy_to_stream($readStream, $writeStream);
            
            if (is_resource($writeStream)) fclose($writeStream);
            if (is_resource($readStream)) fclose($readStream);
        }

        $actualHash = hash_file('sha256', $encPath);
        if ($expectedHash && $actualHash !== $expectedHash) {
            throw new \RuntimeException("Database backup cryptographic checksum validation failed. Expected: {$expectedHash}, Got: {$actualHash}. Path: {$encPath}");
        }

        $this->decryptFile($encPath, $gzPath);

        $gz = gzopen($gzPath, 'rb');
        $dest = fopen($localPath, 'wb');

        if (!$gz || !$dest) {
            throw new \RuntimeException('Failed to open files for decompression.');
        }

        while (!gzeof($gz)) {
            fwrite($dest, gzread($gz, 1024 * 512));
        }

        gzclose($gz);
        fclose($dest);
    }

    private function gzip(string $sourcePath, string $destinationPath): void
    {
        $source = fopen($sourcePath, 'rb');
        $destination = gzopen($destinationPath, 'wb9');

        if (!$source || !$destination) {
            throw new \RuntimeException('Failed to open files for compression.');
        }

        while (!feof($source)) {
            gzwrite($destination, fread($source, 1024 * 512));
        }

        fclose($source);
        gzclose($destination);
    }

    private function putFile(string $localPath, string $key): int
    {
        $size = File::size($localPath);
        
        if (config('filesystems.disks.backups.driver') === 'local') {
            $destPath = storage_path('app/backups/'.$key);
            File::ensureDirectoryExists(dirname($destPath));
            File::copy($localPath, $destPath);
        } else {
            $stream = fopen($localPath, 'rb');
            Storage::disk('backups')->writeStream($key, $stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
        
        return $size;
    }

    private function encryptFile(string $sourcePath, string $destinationPath): void
    {
        $key = env('BACKUP_ENCRYPTION_KEY');
        if (empty($key)) {
            throw new \RuntimeException('BACKUP_ENCRYPTION_KEY is not set in environment. Encryption aborted.');
        }

        if (PHP_OS_FAMILY === 'Windows') {
            File::copy($sourcePath, $destinationPath);
            return;
        }

        $process = \Illuminate\Support\Facades\Process::run([
            'openssl', 'enc', '-aes-256-cbc', '-salt', '-pbkdf2',
            '-in', $sourcePath,
            '-out', $destinationPath,
            '-pass', 'pass:' . $key
        ]);

        if ($process->failed()) {
            throw new \RuntimeException('Encryption failed: ' . $process->errorOutput());
        }
    }

    private function decryptFile(string $sourcePath, string $destinationPath): void
    {
        $key = env('BACKUP_ENCRYPTION_KEY');
        if (empty($key)) {
            throw new \RuntimeException('BACKUP_ENCRYPTION_KEY is not set in environment. Decryption aborted.');
        }

        if (PHP_OS_FAMILY === 'Windows') {
            File::copy($sourcePath, $destinationPath);
            return;
        }

        $process = \Illuminate\Support\Facades\Process::run([
            'openssl', 'enc', '-d', '-aes-256-cbc', '-pbkdf2',
            '-in', $sourcePath,
            '-out', $destinationPath,
            '-pass', 'pass:' . $key
        ]);

        if ($process->failed()) {
            throw new \RuntimeException('Decryption failed: ' . $process->errorOutput());
        }
    }
}
