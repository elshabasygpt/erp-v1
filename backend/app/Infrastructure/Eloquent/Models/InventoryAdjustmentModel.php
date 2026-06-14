<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryAdjustmentModel extends BaseModel
{
    use HasUuids, SoftDeletes;

    protected $table = 'inventory_adjustments';
    protected $connection = 'tenant';

    protected $fillable = [
        'reference_number',
        'warehouse_id',
        'date',
        'type',
        'notes',
        'status',
        'created_by',
    ];

    public function items()
    {
        return $this->hasMany(InventoryAdjustmentItemModel::class, 'inventory_adjustment_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }
}
