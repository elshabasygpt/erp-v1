<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class PartnerModel extends BaseModel
{
    use HasUuids, SoftDeletes;

    protected $connection = 'tenant';
    protected $table = 'partners';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'phone',
        'email',
        'password_hash',
        'access_token',
        'magic_link_token',
        'magic_link_expires_at',
        'capital_amount',
        'profit_share_percentage',
        'duration_type',
        'duration_value',
        'total_pending',
        'total_withdrawn',
        'is_active',
        'portal_enabled',
        'last_login_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'capital_amount' => 'float',
        'profit_share_percentage' => 'float',
        'total_pending' => 'float',
        'total_withdrawn' => 'float',
        'is_active' => 'boolean',
        'portal_enabled' => 'boolean',
        'magic_link_expires_at' => 'datetime',
        'last_login_at' => 'datetime',
    ];

    protected $hidden = [
        'password_hash',
        'access_token',
        'magic_link_token',
    ];

    public function profitShares()
    {
        return $this->hasMany(PartnerProfitShareModel::class, 'partner_id');
    }

    public function withdrawals()
    {
        return $this->hasMany(PartnerWithdrawalModel::class, 'partner_id');
    }
}
