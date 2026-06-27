<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class DataImportModel extends Model
{
    use HasUuids;

    protected $connection = 'tenant';
    protected $table = 'data_imports';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'import_type',
        'file_name',
        'file_path',
        'import_mode',
        'status',
        'total_rows',
        'processed_rows',
        'imported_rows',
        'updated_rows',
        'skipped_rows',
        'failed_row_count',
        'duration',
        'ip_address',
        'rollback_id',
        'failed_rows',
        'error_message',
        'created_by'
    ];

    protected $casts = [
        'failed_rows' => 'array',
    ];
}
