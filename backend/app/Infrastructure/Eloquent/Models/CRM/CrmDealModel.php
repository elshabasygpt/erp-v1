<?php

namespace App\Infrastructure\Eloquent\Models\CRM;

use App\Infrastructure\Eloquent\Models\TenantAwareModel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Models\User;

class CrmDealModel extends TenantAwareModel
{
    use HasUuids;

    protected $table = 'crm_deals';

    protected $fillable = [
        'tenant_id',
        'stage_id',
        'title',
        'expected_value',
        'customer_id',
        'assigned_to',
        'expected_close_date',
        'probability_percent',
        'status',
        'notes',
    ];

    public function stage()
    {
        return $this->belongsTo(CrmStageModel::class, 'stage_id', 'id');
    }

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id', 'id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to', 'id');
    }
}
