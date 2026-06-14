<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Accounting;

use App\Infrastructure\Eloquent\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankTransactionModel extends BaseModel
{
    protected $table = 'bank_transactions';

    protected $fillable = [
        'bank_account_id',
        'transaction_date',
        'type',
        'amount',
        'description',
        'reference_number',
        'is_reconciled',
        'reconciliation_id',
        'journal_entry_id',
        'created_by'
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'amount' => 'decimal:2',
        'is_reconciled' => 'boolean',
    ];

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccountModel::class, 'bank_account_id');
    }

    public function reconciliation(): BelongsTo
    {
        return $this->belongsTo(ReconciliationModel::class, 'reconciliation_id');
    }
}
