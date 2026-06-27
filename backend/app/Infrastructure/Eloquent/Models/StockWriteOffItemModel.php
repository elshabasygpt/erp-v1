<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class StockWriteOffItemModel extends Model
{
    use HasUuids;

    protected $connection = 'tenant';
    protected $table = 'stock_write_off_items';

    protected $fillable = [
        'write_off_id', 'product_id', 'warehouse_id',
        'quantity', 'cost_per_unit', 'total_cost', 'notes',
    ];

    protected $casts = [
        'quantity'      => 'float',
        'cost_per_unit' => 'float',
        'total_cost'    => 'float',
    ];

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }
}
