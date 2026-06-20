<?php

namespace App\Infrastructure\Eloquent\Models\Automation;

use App\Infrastructure\Eloquent\Models\TenantAwareModel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WorkflowModel extends TenantAwareModel
{
    use HasUuids;

    protected $table = 'workflows';

    protected $fillable = [
        'tenant_id',
        'name',
        'trigger_type',
        'is_active',
        'nodes_json',
        'edges_json',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'nodes_json' => 'array',
        'edges_json' => 'array',
    ];
}
