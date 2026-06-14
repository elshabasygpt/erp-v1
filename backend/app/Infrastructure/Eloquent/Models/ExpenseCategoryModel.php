<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ExpenseCategoryModel extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'expense_categories';

    protected $fillable = [
        'name',
        'name_ar',
        'is_advance_or_salary',
    ];

    public function expenses()
    {
        return $this->hasMany(ExpenseModel::class, 'category_id');
    }
}
