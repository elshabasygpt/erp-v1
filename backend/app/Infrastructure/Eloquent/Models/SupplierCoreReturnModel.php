<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierCoreReturnModel extends BaseModel
{
    use HasFactory;

    protected $table = 'supplier_core_returns';

    protected $fillable = [
        'tenant_id',
        'warehouse_id',
        'supplier_id',
        'return_number',
        'status',
        'total_credit_value',
        'credit_note_id',
        'created_by',
        'shipped_at',
        'credited_at',
        'notes',
    ];

    protected $casts = [
        'total_credit_value' => 'decimal:2',
        'shipped_at' => 'datetime',
        'credited_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(SupplierCoreReturnItemModel::class, 'core_return_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(SupplierModel::class, 'supplier_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
