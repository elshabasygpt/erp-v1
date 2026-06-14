<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockTransferModel extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'stock_transfers';

    protected $fillable = [
        'id',
        'reference_number',
        'from_warehouse_id',
        'to_warehouse_id',
        'status',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
        'received_by',
        'received_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'received_at' => 'datetime',
    ];

    public function fromWarehouse(): BelongsTo
    {
        return $this->belongsTo(WarehouseModel::class, 'from_warehouse_id');
    }

    public function toWarehouse(): BelongsTo
    {
        return $this->belongsTo(WarehouseModel::class, 'to_warehouse_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockTransferItemModel::class, 'stock_transfer_id');
    }
}
