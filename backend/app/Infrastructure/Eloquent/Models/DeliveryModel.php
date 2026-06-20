<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DeliveryModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'deliveries';

    protected $fillable = [
        'delivery_number',
        'order_type',
        'order_id',
        'customer_id',
        'driver_id',
        'delivery_platform_id',
        'status',
        'delivery_fee',
        'tracking_code',
        'eta',
        'notes',
        'latitude',
        'longitude',
        'delivery_address_text',
        'delivery_route_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'delivery_fee' => 'decimal:2',
        'eta' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function driver()
    {
        return $this->belongsTo(EmployeeModel::class, 'driver_id');
    }

    public function deliveryPlatform()
    {
        return $this->belongsTo(SalesChannelModel::class, 'delivery_platform_id');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(DeliveryStatusLogModel::class, 'delivery_id')->orderBy('created_at', 'desc');
    }

    public function items(): HasMany
    {
        return $this->hasMany(DeliveryItemModel::class, 'delivery_id');
    }

    public function creator()
    {
        return $this->belongsTo(UserModel::class, 'created_by');
    }
}
