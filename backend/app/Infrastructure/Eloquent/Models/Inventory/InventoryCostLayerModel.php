<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Inventory;

use App\Infrastructure\Eloquent\Models\BaseModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryCostLayerModel extends BaseModel
{
    protected $table = 'inventory_cost_layers';

    protected $fillable = [
        'tenant_id',
        'product_id',
        'warehouse_id',
        'unit_cost',
        'original_quantity',
        'remaining_quantity',
        'reference_type',
        'reference_id',
        'created_by',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:4',
        'original_quantity' => 'decimal:4',
        'remaining_quantity' => 'decimal:4',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'created_by');
    }

    public function consumptions(): HasMany
    {
        return $this->hasMany(InventoryCostLayerConsumptionModel::class, 'layer_id');
    }
}
