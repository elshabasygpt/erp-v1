<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Inventory;

use App\Infrastructure\Eloquent\Models\BaseModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockLedgerModel extends BaseModel
{
    protected $table = 'stock_ledgers';

    protected $fillable = [
        'product_id',
        'warehouse_id',
        'transaction_date',
        'transaction_type',
        'reference_id',
        'quantity_change',
        'unit_cost',
        'total_cost',
        'balance_quantity',
        'balance_value',
        'average_cost',
        'created_by'
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'quantity_change' => 'decimal:4',
        'unit_cost' => 'decimal:4',
        'total_cost' => 'decimal:4',
        'balance_quantity' => 'decimal:4',
        'balance_value' => 'decimal:4',
        'average_cost' => 'decimal:4',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }
}
