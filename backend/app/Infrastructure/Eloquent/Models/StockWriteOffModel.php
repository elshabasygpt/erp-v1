<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class StockWriteOffModel extends BaseTenantModel
{
    protected $table = 'stock_write_offs';

    protected $fillable = [
        'tenant_id', 'reference_number', 'warehouse_id', 'reason',
        'reason_type', 'total_cost', 'approved_by', 'created_by',
    ];

    protected $casts = ['total_cost' => 'float'];

    public function items()
    {
        return $this->hasMany(StockWriteOffItemModel::class, 'write_off_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }
}
