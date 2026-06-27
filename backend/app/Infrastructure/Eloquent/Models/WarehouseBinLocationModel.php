<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WarehouseBinLocationModel extends BaseModel
{
    protected $table = 'warehouse_bin_locations';

    protected $fillable = [
        'tenant_id',
        'warehouse_id',
        'zone',
        'rack',
        'shelf',
        'bin',
        'name',
        'description',
        'is_active',
        'capacity',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'capacity'  => 'decimal:4',
    ];

    protected $appends = ['full_path'];

    public function getFullPathAttribute(): string
    {
        return implode('-', array_filter([
            $this->zone,
            $this->rack,
            $this->shelf,
            $this->bin,
        ]));
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }

    public function warehouseProducts(): HasMany
    {
        return $this->hasMany(WarehouseProductModel::class, 'bin_location_id');
    }

    public function stockLots(): HasMany
    {
        return $this->hasMany(Inventory\StockLotModel::class, 'bin_location_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeInWarehouse($query, string $warehouseId)
    {
        return $query->where('warehouse_id', $warehouseId);
    }

    public function scopeByZone($query, string $zone)
    {
        return $query->where('zone', $zone);
    }
}
