<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PayrollModel extends Model
{
    use HasUuids;

    protected $table = 'employee_payrolls';

    protected $fillable = [
        'employee_id',
        'month',
        'year',
        'base_salary',
        'bonuses',
        'deductions',
        'net_salary',
        'status', // draft, paid
        'expense_id'
    ];

    public function employee()
    {
        return $this->belongsTo(EmployeeModel::class, 'employee_id');
    }

    public function expense()
    {
        return $this->belongsTo(ExpenseModel::class, 'expense_id');
    }
}
