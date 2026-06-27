<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerCoreReturnModel extends BaseModel
{
    protected $table = 'customer_core_returns';

    protected $fillable = [
        'tenant_id', 'return_number', 'customer_id', 'warehouse_id',
        'invoice_id', 'status', 'total_deposit_value', 'refund_method',
        'credit_note_id', 'notes', 'created_by', 'received_at', 'credited_at',
        'rma_request_id',
    ];

    protected $casts = [
        'total_deposit_value' => 'decimal:2',
        'received_at'         => 'datetime',
        'credited_at'         => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(CustomerCoreReturnItemModel::class, 'core_return_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(InvoiceModel::class, 'invoice_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'created_by');
    }
}
