<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Accounting;

use App\Infrastructure\Eloquent\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReconciliationLineModel extends BaseModel
{
    protected $table = 'reconciliation_lines';

    protected $fillable = [
        'reconciliation_id',
        'bank_transaction_id',
        'journal_entry_line_id',
        'status'
    ];

    public function reconciliation(): BelongsTo
    {
        return $this->belongsTo(ReconciliationModel::class, 'reconciliation_id');
    }

    public function bankTransaction(): BelongsTo
    {
        return $this->belongsTo(BankTransactionModel::class, 'bank_transaction_id');
    }
}
