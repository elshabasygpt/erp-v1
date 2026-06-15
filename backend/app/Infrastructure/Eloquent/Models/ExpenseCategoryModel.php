<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ExpenseCategoryModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'expense_categories';

    protected $fillable = [
        'tenant_id',
        'name',
        'name_ar',
        'is_advance_or_salary',
        'account_id'
    ];

    public function expenses()
    {
        return $this->hasMany(ExpenseModel::class, 'category_id');
    }
}
