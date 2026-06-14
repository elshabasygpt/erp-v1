<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BranchModel extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'branches';

    protected $fillable = [
        'id',
        'name',
        'name_ar',
        'location',
        'is_active',
        'is_default',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
    ];

    public function warehouses(): HasMany
    {
        return $this->hasMany(WarehouseModel::class, 'branch_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(UserModel::class, 'branch_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(InvoiceModel::class, 'branch_id');
    }
}
