<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class FixedAssetModel extends Model
{
    use SoftDeletes, HasUuids;

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
