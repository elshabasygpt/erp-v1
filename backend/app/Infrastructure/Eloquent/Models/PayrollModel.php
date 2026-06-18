<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

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
        'expense_id',
        'employee_signature_url', 'signed_at', 'payslip_notes',
        'deductions_breakdown', 'bonuses_breakdown', 'advances_breakdown',
    ];

    protected $casts = [
        'signed_at'             => 'datetime',
        'deductions_breakdown'  => 'array',
        'bonuses_breakdown'     => 'array',
        'advances_breakdown'    => 'array',
    ];

    public function employee()
    {
        return $this->belongsTo(EmployeeModel::class, 'employee_id');
    }

    public function expense()
    {
        return $this->belongsTo(ExpenseModel::class, 'expense_id');
    }

    public function items()
    {
        return $this->hasMany(PayrollItemModel::class, 'payroll_id')
                    ->where('status', 'approved')
                    ->orderBy('type')
                    ->orderBy('created_at');
    }
}
