<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Accounting;

use App\Infrastructure\Eloquent\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReconciliationModel extends BaseModel
{
    protected $table = 'reconciliations';

    protected $fillable = [
        'bank_account_id',
        'statement_date',
        'start_date',
        'end_date',
        'statement_balance',
        'system_balance',
        'difference',
        'status',
        'created_by',
        'completed_by',
        'completed_at',
    ];

    protected $casts = [
        'statement_date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'statement_balance' => 'decimal:2',
        'system_balance' => 'decimal:2',
        'difference' => 'decimal:2',
        'completed_at' => 'datetime',
    ];

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccountModel::class, 'bank_account_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ReconciliationLineModel::class, 'reconciliation_id');
    }
}
