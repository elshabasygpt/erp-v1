<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class PayrollItemModel extends BaseModel
{
    protected $table = 'payroll_items';

    protected $fillable = [
        'employee_id', 'payroll_id', 'month', 'year',
        'type', 'reason', 'amount', 'status', 'notes',
        'reference_type', 'reference_id',
        'created_by', 'approved_by', 'approved_at',
    ];

    protected $casts = [
        'amount'      => 'decimal:2',
        'month'       => 'integer',
        'year'        => 'integer',
        'approved_at' => 'datetime',
    ];

    // نوع الحركة: إضافة أم خصم؟
    public function isAddition(): bool
    {
        return in_array($this->type, ['bonus', 'overtime', 'other_add']);
    }

    public function isDeduction(): bool
    {
        return in_array($this->type, ['deduction', 'advance', 'other_deduct']);
    }

    // تسمية البند بالعربي
    public function getTypeLabelAttribute(): string
    {
        return match($this->type) {
            'deduction'    => 'خصم / جزاء',
            'bonus'        => 'مكافأة / بدل',
            'advance'      => 'سلفة',
            'overtime'     => 'أوفرتايم',
            'other_add'    => 'إضافة أخرى',
            'other_deduct' => 'خصم آخر',
            default        => $this->type,
        };
    }

    public function employee() { return $this->belongsTo(EmployeeModel::class, 'employee_id'); }
    public function payroll()  { return $this->belongsTo(PayrollModel::class, 'payroll_id'); }
    public function creator()  { return $this->belongsTo(UserModel::class, 'created_by'); }
}
