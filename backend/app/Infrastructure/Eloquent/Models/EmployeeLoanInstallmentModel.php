<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class EmployeeLoanInstallmentModel extends BaseModel
{
    protected $table = 'employee_loan_installments';

    protected $fillable = [
        'loan_id', 'payroll_id', 'installment_number',
        'month', 'year', 'amount', 'status',
        'due_date', 'deducted_at', 'notes',
    ];

    protected $casts = [
        'amount'      => 'decimal:2',
        'month'       => 'integer',
        'year'        => 'integer',
        'due_date'    => 'date',
        'deducted_at' => 'datetime',
    ];

    public function loan()    { return $this->belongsTo(EmployeeLoanModel::class, 'loan_id'); }
    public function payroll() { return $this->belongsTo(PayrollModel::class, 'payroll_id'); }
}
