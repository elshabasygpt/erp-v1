<?php

namespace App\Infrastructure\Eloquent\Models;

class SupplierModel extends BaseModel
{
    protected $table = 'suppliers';
    protected $fillable = ['name', 'email', 'phone', 'address', 'tax_number', 'balance', 'is_active', 'created_by', 'updated_by'];
    protected $casts = ['balance' => 'decimal:2', 'is_active' => 'boolean'];
    public function purchaseInvoices() { return $this->hasMany(PurchaseInvoiceModel::class, 'supplier_id'); }
    public function purchaseReturns() { return $this->hasMany(PurchaseReturnModel::class, 'supplier_id'); }
    public function vouchers() { return $this->hasMany(VoucherModel::class, 'supplier_id'); }
}
