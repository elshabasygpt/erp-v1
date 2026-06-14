<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SafeModel extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'safes';

    protected $fillable = [
        'name',
        'name_ar',
        'type', // cash, bank
        'balance',
        'is_active',
        'created_by'
    ];

    public function transactions()
    {
        return $this->hasMany(SafeTransactionModel::class, 'safe_id');
    }

    public function users()
    {
        return $this->belongsToMany(UserModel::class, 'safe_users', 'safe_id', 'user_id')
                    ->withPivot('is_primary');
    }
}
