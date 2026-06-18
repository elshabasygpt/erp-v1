<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Accounting;

use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankAccountModel extends BaseModel
{
    protected $table = 'bank_accounts';

    protected $fillable = [
        'name',
        'account_number',
        'bank_name',
        'currency_id',
        'opening_balance',
        'current_balance',
        'chart_of_account_id',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'opening_balance' => 'decimal:2',
        'current_balance' => 'decimal:2',
    ];

    public function ledgerAccount(): BelongsTo
    {
        return $this->belongsTo(AccountModel::class, 'chart_of_account_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(BankTransactionModel::class, 'bank_account_id');
    }

    public function reconciliations(): HasMany
    {
        return $this->hasMany(ReconciliationModel::class, 'bank_account_id');
    }
}
