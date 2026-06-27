<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetItemModel extends BaseTenantModel
{
    use HasUuids;

    protected $table = 'budget_items';

    public $timestamps = true;

    protected $fillable = [
        'budget_id', 'account_id', 'cost_center_id',
        'jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
        'total', 'notes',
    ];

    protected $casts = [
        'jan' => 'float', 'feb' => 'float', 'mar' => 'float',
        'apr' => 'float', 'may' => 'float', 'jun' => 'float',
        'jul' => 'float', 'aug' => 'float', 'sep' => 'float',
        'oct' => 'float', 'nov' => 'float', 'dec' => 'float',
        'total' => 'float',
    ];

    public function budget(): BelongsTo
    {
        return $this->belongsTo(BudgetModel::class, 'budget_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(AccountModel::class, 'account_id');
    }
}
