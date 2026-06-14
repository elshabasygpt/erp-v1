<?php

namespace App\Infrastructure\Eloquent\Models;

class DeliveryStatusLogModel extends BaseModel
{
    protected $table = 'delivery_status_logs';

    protected $fillable = [
        'delivery_id',
        'status',
        'notes',
        'created_by'
    ];

    public function delivery()
    {
        return $this->belongsTo(DeliveryModel::class, 'delivery_id');
    }

    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }
}
