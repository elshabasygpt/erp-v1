<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class EmployeeModel extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'employees';

    protected $fillable = [
        'user_id',
        'name',
        'position',
        'phone',
        'base_salary',
        'shift_start',
        'shift_end',
        'is_active'
    ];

    public function user()
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }

    public function attendances()
    {
        return $this->hasMany(AttendanceModel::class, 'employee_id');
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
