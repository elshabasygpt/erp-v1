<?php

namespace App\Infrastructure\Eloquent\Models\CRM;

use App\Infrastructure\Eloquent\Models\BaseModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\UserModel;

class CustomerInteractionModel extends BaseModel
{
    protected $table = 'customer_interactions';

    protected $fillable = [
        'customer_id',
        'user_id',
        'type',
        'description',
        'interaction_date',
    ];

    protected $casts = [
        'interaction_date' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function user()
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }
}
