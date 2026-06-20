<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SafeTransactionModel extends Model
{
    use HasUuids;

    protected $table = 'safe_transactions';

    protected $fillable = [
        'tenant_id',
        'safe_id',
        'type', // deposit, withdrawal, transfer_in, transfer_out
        'amount',
        'description',
        'reference_id',
        'reference_type',
        'transaction_date',
        'created_by',
        'cost_center_id',
        'currency_id',
        'exchange_rate',
    ];

    public function safe()
    {
        return $this->belongsTo(SafeModel::class, 'safe_id');
    }
}
