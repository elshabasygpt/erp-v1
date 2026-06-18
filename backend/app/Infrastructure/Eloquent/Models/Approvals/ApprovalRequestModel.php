<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Approvals;

use App\Infrastructure\Eloquent\Models\BaseModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApprovalRequestModel extends BaseModel
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'approval_requests';

    protected $fillable = [
        'id',
        'rule_id',
        'entity_type',
        'entity_id',
        'trigger_type',
        'status',
        'requested_by',
        'resolved_by',
        'escalated_at',
        'notes',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
        'escalated_at' => 'datetime',
    ];

    public function rule(): BelongsTo
    {
        return $this->belongsTo(ApprovalRuleModel::class, 'rule_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'requested_by');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'resolved_by');
    }

    public function auditLogs()
    {
        return $this->hasMany(ApprovalAuditLogModel::class, 'approval_request_id');
    }
}
