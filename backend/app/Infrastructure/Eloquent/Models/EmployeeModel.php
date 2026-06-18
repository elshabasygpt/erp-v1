<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeModel extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'employees';

    protected $fillable = [
        'user_id',
        'name',
        'position',
        'phone',
        'base_salary',
        'shift_start',
        'shift_end',
        'is_active',
    ];

    public function user()
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }

    public function attendances()
    {
        return $this->hasMany(EmployeeAttendanceModel::class, 'employee_id');
    }

    public function loans()
    {
        return $this->hasMany(EmployeeLoanModel::class, 'employee_id');
    }

    public function activeLoans()
    {
        return $this->hasMany(EmployeeLoanModel::class, 'employee_id')
                    ->where('status', 'active');
    }

    public function leaves()
    {
        return $this->hasMany(LeaveModel::class, 'employee_id');
    }

    public function payrolls()
    {
        return $this->hasMany(PayrollModel::class, 'employee_id');
    }
}
