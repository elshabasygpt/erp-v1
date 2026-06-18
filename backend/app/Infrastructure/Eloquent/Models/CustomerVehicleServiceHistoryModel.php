<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class CustomerVehicleServiceHistoryModel extends BaseModel
{
    protected $table = 'customer_vehicle_service_history';

    protected $fillable = [
        'customer_vehicle_id', 'invoice_id', 'service_date', 'service_type',
        'mileage_at_service', 'description', 'next_service_mileage',
        'next_service_date', 'created_by',
    ];

    protected $casts = [
        'service_date' => 'date',
        'next_service_date' => 'date',
        'mileage_at_service' => 'integer',
        'next_service_mileage' => 'integer',
    ];

    public function customerVehicle()
    {
        return $this->belongsTo(CustomerVehicleModel::class, 'customer_vehicle_id');
    }

    public function invoice()
    {
        return $this->belongsTo(InvoiceModel::class, 'invoice_id')
            ->select(['id', 'invoice_number', 'total', 'invoice_date']);
    }
}
