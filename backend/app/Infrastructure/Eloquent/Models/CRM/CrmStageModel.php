<?php

namespace App\Infrastructure\Eloquent\Models\CRM;

use App\Infrastructure\Eloquent\Models\TenantAwareModel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CrmStageModel extends TenantAwareModel
{
    use HasUuids;

    protected $table = 'crm_stages';

    protected $fillable = [
        'tenant_id',
        'name',
        'name_ar',
        'color',
        'order_index',
    ];

    public function deals()
    {
        return $this->hasMany(CrmDealModel::class, 'stage_id', 'id');
    }
}
