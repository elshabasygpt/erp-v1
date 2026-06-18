<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class WarrantyModel extends BaseModel
{
    use HasFactory;

    protected $table = 'warranties';

    protected $fillable = [
        'warranty_number', 'invoice_id', 'invoice_item_id', 'product_id', 'customer_id',
        'quantity', 'sale_date', 'warranty_months', 'expiry_date', 'status', 'notes',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'sale_date' => 'date',
        'expiry_date' => 'date',
        'warranty_months' => 'integer',
    ];

    public function invoice()
    {
        return $this->belongsTo(App\Infrastructure\Eloquent\Models\InvoiceModel::class, 'invoice_id');
    }

    public function invoiceItem()
    {
        return $this->belongsTo(App\Infrastructure\Eloquent\Models\InvoiceItemModel::class, 'invoice_item_id');
    }

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }

    public function customer()
    {
        return $this->belongsTo(App\Infrastructure\Eloquent\Models\CustomerModel::class, 'customer_id');
    }

    public function claims()
    {
        return $this->hasMany(WarrantyClaimModel::class, 'warranty_id');
    }

    public function getIsExpiredAttribute()
    {
        return $this->expiry_date ? Carbon::parse($this->expiry_date)->isPast() : false;
    }

    public function getDaysRemainingAttribute()
    {
        return $this->expiry_date ? max(0, Carbon::today()->diffInDays(Carbon::parse($this->expiry_date), false)) : 0;
    }
}
