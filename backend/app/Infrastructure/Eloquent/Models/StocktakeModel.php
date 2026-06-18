<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StocktakeModel extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'inventory_stocktakes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'reference_number',
        'type',
        'is_blind',
        'is_frozen',
        'warehouse_id',
        'category_id',
        'status',
        'assigned_to',
        'scheduled_date',
        'notes',
        'created_by',
        'approved_by',
    ];

    protected $casts = [
        'is_blind' => 'boolean',
        'is_frozen' => 'boolean',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(StocktakeItemModel::class, 'stocktake_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'assigned_to');
    }
}
