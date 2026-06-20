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

        try {
            $timestamp = now()->format('Y-m-d_His');
            $dbDumpLocal = "{$workDir}/db.sql";
            $filesArchiveLocal = "{$workDir}/files.tar.gz";

            $this->dumpRunner->dump($tenant->database_name, $dbDumpLocal);
            $this->archiveUploadDirectory($tenant->id, $filesArchiveLocal);

            $dbKey = "tenants/{$tenant->id}/{$timestamp}/db.sql.gz";
            $filesKey = "tenants/{$tenant->id}/{$timestamp}/files.tar.gz";

            $sizeBytes = $this->putGzipped($dbDumpLocal, $dbKey)
                + $this->putFile($filesArchiveLocal, $filesKey);

            $backup->update([
                'status' => 'completed',
                'db_dump_path' => $dbKey,
                'files_archive_path' => $filesKey,
                'size_bytes' => $sizeBytes,
                'completed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $backup->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
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
            $this->getGunzipped($sourceBackup->db_dump_path, $dbDumpLocal);

            $this->restoreRunner->wipeDatabase($tenant->database_name);
            $this->restoreRunner->restore($tenant->database_name, $dbDumpLocal);

            $filesArchiveLocal = "{$workDir}/files.tar.gz";
            if (config('filesystems.disks.backups.driver') === 'local') {
                File::copy(storage_path('app/backups/'.$sourceBackup->files_archive_path), $filesArchiveLocal);
            } else {
                file_put_contents($filesArchiveLocal, Storage::disk('backups')->get($sourceBackup->files_archive_path));
            }
            $this->extractUploadDirectory($tenant->id, $filesArchiveLocal);

            $restoreRecord->update(['status' => 'completed', 'completed_at' => now()]);
        } catch (\Throwable $e) {
            $restoreRecord->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
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
        $candidates = TenantBackupModel::query()
            ->where('tenant_id', $tenant->id)
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->get()
            ->slice($keepMinimum);

        $cutoff = now()->subDays($retentionDays);
        $prunedCount = 0;

        foreach ($candidates as $backup) {
            if ($backup->created_at->greaterThan($cutoff)) {
                continue;
            }

            foreach (['db_dump_path', 'files_archive_path'] as $field) {
                if ($backup->$field) {
                    if (config('filesystems.disks.backups.driver') === 'local') {
                        $path = storage_path('app/backups/'.$backup->$field);
                        if (File::exists($path)) {
                            File::delete($path);
                        }
                    } else {
                        if (Storage::disk('backups')->exists($backup->$field)) {
                            Storage::disk('backups')->delete($backup->$field);
                        }
                    }
                }
            }

            $backup->update(['status' => 'pruned']);
            $prunedCount++;
        }

        return $prunedCount;
    }

    private function archiveUploadDirectory(string $tenantId, string $outputPath): void
    {
        $uploadDir = public_path('uploads/tenant_'.$tenantId);

        if (! File::isDirectory($uploadDir)) {
            // Nothing uploaded yet — still produce an empty archive so the
            // backup record has a consistent files_archive_path.
            File::ensureDirectoryExists($uploadDir);
        }

        $process = \Illuminate\Support\Facades\Process::path(public_path('uploads'))
            ->timeout(1800)
            ->run(['tar', '-czf', $outputPath, 'tenant_'.$tenantId]);

        if ($process->failed()) {
            throw new \RuntimeException('Failed to archive tenant upload directory: '.$process->errorOutput());
        }
    }

    private function extractUploadDirectory(string $tenantId, string $archivePath): void
    {
        $uploadDir = public_path('uploads/tenant_'.$tenantId);
        File::ensureDirectoryExists(public_path('uploads'));

        // Clear current files before extracting the restored snapshot.
        File::deleteDirectory($uploadDir);

        $process = \Illuminate\Support\Facades\Process::path(public_path('uploads'))
            ->timeout(1800)
            ->run(['tar', '-xzf', $archivePath]);

        if ($process->failed()) {
            throw new \RuntimeException('Failed to extract tenant upload archive: '.$process->errorOutput());
        }
    }

    private function putGzipped(string $localPath, string $key): int
    {
        $gzPath = $localPath.'.gz';
        $this->gzip($localPath, $gzPath);

        return $this->putFile($gzPath, $key);
    }

    private function getGunzipped(string $key, string $localPath): void
    {
        $gzPath = $localPath.'.gz';
        
        if (config('filesystems.disks.backups.driver') === 'local') {
            $sourcePath = storage_path('app/backups/'.$key);
            File::copy($sourcePath, $gzPath);
        } else {
            $readStream = Storage::disk('backups')->readStream($key);
            if ($readStream === null) {
                throw new \RuntimeException("Could not read backup file from storage: {$key}");
            }
            
            $writeStream = fopen($gzPath, 'wb');
            stream_copy_to_stream($readStream, $writeStream);
            
            if (is_resource($writeStream)) fclose($writeStream);
            if (is_resource($readStream)) fclose($readStream);
        }

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
            $stream = fopen($localPath, 'r');
            Storage::disk('backups')->writeStream($key, $stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
        
        return $size;
    }
}
