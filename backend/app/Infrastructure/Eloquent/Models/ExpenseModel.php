<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ExpenseModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'expenses';

    protected $fillable = [
        'tenant_id',
        'voucher_number',
        'category_id',
        'safe_id',
        'amount',
        'description',
        'expense_date',
        'status',
        'created_by',
        'approved_by'
    ];

    public function category()
    {
        return $this->belongsTo(ExpenseCategoryModel::class, 'category_id');
    }

    public function safe()
    {
        return $this->belongsTo(SafeModel::class, 'safe_id');
    }
}
