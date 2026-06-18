<?php
namespace App\Infrastructure\Eloquent\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RFQModel extends Model
{
    use HasUuids, SoftDeletes;
    protected $table = 'rfqs';
    protected $guarded = [];
    public function items() { return $this->hasMany(RFQItemModel::class, 'rfq_id'); }
    public function purchaseRequest() { return $this->belongsTo(PurchaseRequestModel::class, 'purchase_request_id'); }
    public function quotations() { return $this->hasMany(SupplierQuotationModel::class, 'rfq_id'); }
}
