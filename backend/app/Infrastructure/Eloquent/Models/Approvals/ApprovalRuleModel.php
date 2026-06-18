<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Approvals;

use App\Infrastructure\Eloquent\Models\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApprovalRuleModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'approval_rules';

    protected $fillable = [
        'id',
        'entity_type',
        'trigger_type',
        'threshold',
        'required_role',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'threshold' => 'decimal:2',
    ];
}
