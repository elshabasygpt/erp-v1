<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class CurrencyModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'currencies';

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'symbol',
        'is_base',
        'is_active',
        'created_by'
    ];

    protected $casts = [
        'is_base' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function exchangeRates()
    {
        return $this->hasMany(ExchangeRateModel::class, 'currency_id');
    }
}
