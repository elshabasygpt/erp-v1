<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class LeaveModel extends Model
{
    use HasUuids;

    protected $table = 'employee_leaves';

    protected $fillable = [
        'employee_id',
        'start_date',
        'end_date',
        'type', // annual, sick, unpaid, other
        'status', // pending, approved, rejected
        'reason'
    ];

    public function employee()
    {
        return $this->belongsTo(EmployeeModel::class, 'employee_id');
    }
}
