<?php

namespace App\Infrastructure\Eloquent\Models\CRM;

use App\Infrastructure\Eloquent\Models\BaseModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\UserModel;

class SalesFollowUpModel extends BaseModel
{
    protected $table = 'sales_follow_ups';

    protected $fillable = [
        'customer_id',
        'assigned_to',
        'title',
        'description',
        'due_date',
        'reminder_at',
        'status',
    ];

    protected $casts = [
        'due_date' => 'datetime',
        'reminder_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function assignee()
    {
        return $this->belongsTo(UserModel::class, 'assigned_to');
    }
}
