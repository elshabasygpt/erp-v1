<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Approvals;

use App\Infrastructure\Eloquent\Models\BaseTenantModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalAuditLogModel extends BaseTenantModel
{
    use SoftDeletes;

    protected $table = 'approval_audit_logs';

    protected $fillable = [
        'id',
        'approval_request_id',
        'user_id',
        'action',
        'notes',
    ];

    public function approvalRequest(): BelongsTo
    {
        return $this->belongsTo(ApprovalRequestModel::class, 'approval_request_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }
}
