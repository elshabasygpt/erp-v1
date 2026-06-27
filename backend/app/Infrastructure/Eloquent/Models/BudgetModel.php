<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class BudgetModel extends BaseTenantModel
{
    use HasUuids, SoftDeletes;

    protected $table = 'budgets';

    protected $fillable = [
        'tenant_id', 'name', 'fiscal_year', 'period_start', 'period_end',
        'status', 'notes', 'created_by', 'approved_by', 'approved_at',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end'   => 'date',
        'approved_at'  => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(BudgetItemModel::class, 'budget_id');
    }
}
