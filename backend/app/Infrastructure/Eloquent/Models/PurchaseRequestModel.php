<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseRequestModel extends Model
{
    use HasUuids, SoftDeletes;
    protected $table = 'purchase_requests';
    protected $guarded = [];
    
    public function items() { return $this->hasMany(PurchaseRequestItemModel::class, 'purchase_request_id'); }
    
    public function suggestedSupplier() { return $this->belongsTo(SupplierModel::class, 'suggested_supplier_id'); }
}
