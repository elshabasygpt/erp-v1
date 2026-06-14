<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ProfitDistributionModel extends BaseModel
{
    use HasUuids;

    protected $connection = 'tenant';
    protected $table = 'profit_distributions';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'period_start',
        'period_end',
        'total_revenue',
        'total_expenses',
        'net_profit',
        'distributed_amount',
        'status',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'total_revenue' => 'float',
        'total_expenses' => 'float',
        'net_profit' => 'float',
        'distributed_amount' => 'float',
        'approved_at' => 'datetime',
    ];

    public function shares()
    {
        return $this->hasMany(PartnerProfitShareModel::class, 'distribution_id');
    }
}
