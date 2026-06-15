<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Inventory;

use App\Infrastructure\Eloquent\Models\BaseModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryCostLayerConsumptionModel extends BaseModel
{
    protected $table = 'inventory_cost_layer_consumptions';

    protected $fillable = [
        'tenant_id',
        'layer_id',
        'transaction_type',
        'transaction_id',
        'quantity_consumed',
        'unit_cost',
        'created_by'
    ];

    protected $casts = [
        'quantity_consumed' => 'decimal:4',
        'unit_cost' => 'decimal:4',
    ];

    public function layer(): BelongsTo
    {
        return $this->belongsTo(InventoryCostLayerModel::class, 'layer_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'created_by');
    }
}
