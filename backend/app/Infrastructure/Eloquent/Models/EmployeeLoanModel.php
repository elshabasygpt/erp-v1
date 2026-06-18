<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Carbon\Carbon;

class EmployeeLoanModel extends BaseModel
{
    protected $table = 'employee_loans';

    protected $fillable = [
        'employee_id', 'loan_number', 'total_amount', 'remaining_amount',
        'installments_count', 'installment_amount',
        'start_date', 'end_date', 'status',
        'reason', 'notes', 'approved_by', 'approved_at', 'created_by',
    ];

    protected $casts = [
        'total_amount'       => 'decimal:2',
        'remaining_amount'   => 'decimal:2',
        'installment_amount' => 'decimal:2',
        'installments_count' => 'integer',
        'start_date'         => 'date',
        'end_date'           => 'date',
        'approved_at'        => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(EmployeeModel::class, 'employee_id');
    }

    public function installments()
    {
        return $this->hasMany(EmployeeLoanInstallmentModel::class, 'loan_id')
                    ->orderBy('installment_number');
    }

    public function pendingInstallments()
    {
        return $this->hasMany(EmployeeLoanInstallmentModel::class, 'loan_id')
                    ->where('status', 'pending')
                    ->orderBy('installment_number');
    }

    // نسبة السداد %
    public function getRepaymentPercentageAttribute(): float
    {
        if ((float) $this->total_amount === 0.0) return 0.0;
        $paid = (float) $this->total_amount - (float) $this->remaining_amount;
        return round($paid / (float) $this->total_amount * 100, 1);
    }
}
