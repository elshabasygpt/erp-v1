<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class SupplierPriceHistoryModel extends BaseModel
{
    protected $table = 'supplier_price_history';

    protected $fillable = [
        'price_list_id', 'old_price', 'new_price',
        'change_percent', 'change_reason', 'reference_id', 'created_by',
    ];

    protected $casts = [
        'old_price'      => 'decimal:4',
        'new_price'      => 'decimal:4',
        'change_percent' => 'decimal:2',
    ];

    public function priceList()
    {
        return $this->belongsTo(SupplierPriceListModel::class, 'price_list_id');
    }
}
