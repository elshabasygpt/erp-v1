<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PartnerProfitShareModel extends BaseModel
{
    use HasUuids;

    protected $connection = 'tenant';
    protected $table = 'partner_profit_shares';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'distribution_id',
        'partner_id',
        'share_percentage',
        'amount',
        'is_paid',
        'paid_at',
    ];

    protected $casts = [
        'share_percentage' => 'float',
        'amount' => 'float',
        'is_paid' => 'boolean',
        'paid_at' => 'datetime',
    ];

    public function distribution()
    {
        return $this->belongsTo(ProfitDistributionModel::class, 'distribution_id');
    }

    public function partner()
    {
        return $this->belongsTo(PartnerModel::class, 'partner_id');
    }
}
