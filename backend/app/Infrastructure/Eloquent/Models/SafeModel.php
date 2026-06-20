<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SafeModel extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'safes';

    protected $fillable = [
        'tenant_id',
        'name',
        'name_ar',
        'type', // cash, bank, wallet
        'account_id',
        'bank_account_id',
        'balance',
        'is_active',
        'created_by',
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

    public function account(): BelongsTo
    {
        return $this->belongsTo(AccountModel::class, 'account_id');
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(\App\Infrastructure\Eloquent\Models\Accounting\BankAccountModel::class, 'bank_account_id');
    }
}
