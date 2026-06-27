<?php

namespace App\Infrastructure\Eloquent\Models;

use App\Infrastructure\Eloquent\Traits\BranchScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class WarehouseModel extends BaseModel
{
    use BranchScoped;
    use HasFactory;

    protected $table = 'warehouses';

    protected $fillable = ['name', 'location', 'is_default', 'is_active', 'branch_id', 'created_by', 'updated_by'];

    protected $casts = ['is_default' => 'boolean', 'is_active' => 'boolean'];

    public function branch()
    {
        return $this->belongsTo(BranchModel::class, 'branch_id');
    }

    public function warehouseProducts()
    {
        return $this->hasMany(WarehouseProductModel::class, 'warehouse_id')->withoutGlobalScopes();
    }
}
