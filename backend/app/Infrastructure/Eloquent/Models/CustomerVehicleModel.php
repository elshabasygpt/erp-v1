<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class CustomerVehicleModel extends BaseModel
{
    protected $table = 'customer_vehicles';

    protected $fillable = [
        'customer_id', 'vehicle_year_id', 'plate_number', 'plate_number_en',
        'color', 'mileage', 'purchase_year', 'vin', 'notes', 'is_active',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'mileage' => 'integer',
        'purchase_year' => 'integer',
    ];

    protected $appends = ['display_name'];

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function vehicleYear()
    {
        return $this->belongsTo(VehicleYearModel::class, 'vehicle_year_id')->with(['vehicleModel.make']);
    }

    public function serviceHistory()
    {
        return $this->hasMany(CustomerVehicleServiceHistoryModel::class, 'customer_vehicle_id')
            ->orderBy('service_date', 'desc');
    }

    public function lastService()
    {
        return $this->hasOne(CustomerVehicleServiceHistoryModel::class, 'customer_vehicle_id')
            ->orderBy('service_date', 'desc');
    }

    public function getDisplayNameAttribute(): string
    {
        $year = $this->vehicleYear;
        if (! $year) {
            return $this->plate_number ?? 'Unknown Vehicle';
        }

        $make = $year->vehicleModel->make->name_ar ?? $year->vehicleModel->make->name ?? '';
        $model = $year->vehicleModel->name_ar ?? $year->vehicleModel->name ?? '';
        $yearRange = $year->year_from.($year->year_to ? '-'.$year->year_to : '+');
        $plate = $this->plate_number ? " | {$this->plate_number}" : '';

        return trim("{$make} {$model} {$yearRange}{$plate}");
    }
}
