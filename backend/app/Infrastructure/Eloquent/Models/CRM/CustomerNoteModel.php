<?php

namespace App\Infrastructure\Eloquent\Models\CRM;

use App\Infrastructure\Eloquent\Models\BaseModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\UserModel;

class CustomerNoteModel extends BaseModel
{
    protected $table = 'customer_notes';

    protected $fillable = [
        'customer_id',
        'user_id',
        'content',
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
