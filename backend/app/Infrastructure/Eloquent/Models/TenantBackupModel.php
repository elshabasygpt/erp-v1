<?php

namespace App\Infrastructure\Eloquent\Models;

class TenantBackupModel extends CentralModel
{
    protected $table = 'tenant_backups';

    protected $fillable = [
        'tenant_id',
        'type',
        'status',
        'db_dump_path',
        'files_archive_path',
        'db_hash',
        'files_hash',
        'size_bytes',
        'restored_from_backup_id',
        'error_message',
        'created_by',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function tenant()
    {
        return $this->belongsTo(TenantModel::class, 'tenant_id');
    }
}
