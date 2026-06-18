<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class SupplierPriceListModel extends BaseModel
{
    protected $table = 'supplier_price_lists';

    protected $fillable = [
        'supplier_id', 'product_id', 'unit_price', 'currency_code',
        'min_quantity', 'supplier_sku', 'notes', 'is_active',
        'valid_from', 'valid_until', 'last_purchase_date', 'lead_time_days',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'unit_price'    => 'decimal:4',
        'min_quantity'  => 'decimal:2',
        'is_active'     => 'boolean',
        'valid_from'    => 'date',
        'valid_until'   => 'date',
        'last_purchase_date' => 'date',
        'lead_time_days' => 'integer',
    ];

    public function supplier()
    {
        return $this->belongsTo(SupplierModel::class, 'supplier_id')
                    ->select(['id', 'name', 'phone']);
    }

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id')
                    ->select(['id', 'name', 'name_ar', 'sku', 'brand', 'quality_grade',
                              'oem_number', 'part_number', 'cost_price']);
    }

    public function priceHistory()
    {
        return $this->hasMany(SupplierPriceHistoryModel::class, 'price_list_id')
                    ->orderByDesc('created_at')
                    ->limit(10);
    }

    // هل السعر ساري الصلاحية؟
    public function getIsValidAttribute(): bool
    {
        if (!$this->is_active) return false;
        if ($this->valid_until && $this->valid_until->isPast()) return false;
        return true;
    }
}
