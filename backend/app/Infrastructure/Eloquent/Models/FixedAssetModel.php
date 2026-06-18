<?php

namespace App\Infrastructure\Eloquent\Models;

class FixedAssetModel extends BaseModel
{
    protected $table = 'fixed_assets';

    protected $guarded = ['id'];

    protected $casts = [
        'purchase_date' => 'date',
    ];

    public function account()
    {
        return $this->belongsTo(AccountModel::class, 'account_id');
    }
}
