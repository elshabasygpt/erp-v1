<?php

namespace App\Presentation\Controllers\API\Settings;

use App\Infrastructure\Eloquent\Models\TenantBackupModel;
use App\Jobs\BackupTenantJob;
use App\Jobs\RestoreTenantBackupJob;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\Request;

class BackupController extends BaseTenantController
{
    public function index(Request $request)
    {
        $tenant = app('current_tenant');

        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = TenantBackupModel::query();
        $backups = $query->where(['tenant_id' => $tenant->id])
            ->latest()
            ->paginate(20);

        return $this->success($backups);
    }

    public function store(Request $request)
    {
        $tenant = app('current_tenant');

        $backup = TenantBackupModel::query()->create([
            'tenant_id' => $tenant->id,
            'type' => 'manual',
            'status' => 'running',
            'started_at' => now(),
        ]);

        BackupTenantJob::dispatch($tenant->id, 'manual', $backup->id);

        return $this->success($backup, 'Backup started', 202);
    }

    public function show(Request $request, $id)
    {
        $tenant = app('current_tenant');
        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = TenantBackupModel::query();
        $backup = $query->where(['tenant_id' => $tenant->id])->findOrFail($id);

        return $this->success($backup);
    }

    public function restore(Request $request, $id)
    {
        $tenant = app('current_tenant');
        $user = $request->user();

        if (! $user || ! $user->hasRole('admin')) {
            return $this->error('Only an administrator can restore a backup.', 403);
        }

        $validated = $request->validate([
            'confirm_text' => 'required|string',
        ]);

        if ($validated['confirm_text'] !== $tenant->name) {
            return $this->error('Confirmation text does not match the company name.', 422);
        }

        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = TenantBackupModel::query();
        $sourceBackup = $query->where(['tenant_id' => $tenant->id, 'status' => 'completed'])
            ->findOrFail($id);

        $restoreRecord = TenantBackupModel::query()->create([
            'tenant_id' => $tenant->id,
            'type' => 'restore',
            'status' => 'running',
            'restored_from_backup_id' => $sourceBackup->id,
            'created_by' => $user->id,
            'started_at' => now(),
        ]);

        RestoreTenantBackupJob::dispatch($tenant->id, $sourceBackup->id, $restoreRecord->id);

        return $this->success($restoreRecord, 'Restore started', 202);
    }

    public function download(Request $request, $id)
    {
        $tenant = app('current_tenant');
        $user = $request->user();

        if (! $user || ! $user->hasRole('admin')) {
            return $this->error('Only an administrator can download a backup.', 403);
        }

        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = TenantBackupModel::query();
        $backup = $query->where(['tenant_id' => $tenant->id, 'status' => 'completed'])
            ->findOrFail($id);

        $type = $request->query('type', 'db'); // 'db' or 'files'

        $path = $type === 'db' ? $backup->db_dump_path : $backup->files_archive_path;

        if (!$path) {
            return $this->error('Backup file path not found.', 404);
        }

        $fileName = basename($path);
        $headers = [
            'Content-Type' => 'application/gzip',
        ];

        if (config('filesystems.disks.backups.driver') === 'local') {
            $fullPath = storage_path('app/backups/'.$path);
            if (!\Illuminate\Support\Facades\File::exists($fullPath)) {
                return $this->error('Backup file not found on disk.', 404);
            }
            return response()->streamDownload(function () use ($fullPath) {
                $stream = fopen($fullPath, 'rb');
                if ($stream) {
                    while (!feof($stream)) {
                        echo fread($stream, 8192);
                        flush();
                    }
                    fclose($stream);
                }
            }, $fileName, $headers);
        }

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = \Illuminate\Support\Facades\Storage::disk('backups');
        
        if (!$disk->exists($path)) {
            return $this->error('Backup file not found in storage.', 404);
        }

        return $disk->download($path, $fileName, $headers);
    }
}
