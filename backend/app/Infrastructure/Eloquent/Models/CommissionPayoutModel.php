<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class CommissionPayoutModel extends BaseModel
{
    protected $table = 'commission_payouts';

    protected $fillable = [
        'salesperson_id', 'total_amount', 'payout_date', 'safe_id', 'notes', 'created_by',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'payout_date' => 'date',
    ];

    public function salesperson()
    {
        return $this->belongsTo(UserModel::class, 'salesperson_id');
    }

    public function invoices()
    {
        return $this->hasMany(InvoiceModel::class, 'commission_payout_id');
    }
}
