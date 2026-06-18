<?php
namespace App\Infrastructure\Eloquent\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrderModel extends Model
{
    use HasUuids, SoftDeletes;
    protected $table = 'purchase_orders';
    protected $guarded = [];
    public function items() { return $this->hasMany(PurchaseOrderItemModel::class, 'purchase_order_id'); }
    public function supplier() { return $this->belongsTo(SupplierModel::class, 'supplier_id'); }
}
