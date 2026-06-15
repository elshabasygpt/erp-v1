<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class ExchangeRateModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'exchange_rates';

    protected $fillable = [
        'tenant_id',
        'currency_id',
        'rate',
        'date',
        'created_by'
    ];

    protected $casts = [
        'rate' => 'decimal:6',
        'date' => 'date',
    ];

    public function currency()
    {
        return $this->belongsTo(CurrencyModel::class, 'currency_id');
    }
}
