<?php
namespace App\Infrastructure\Eloquent\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplierQuotationModel extends Model
{
    use HasUuids, SoftDeletes;
    protected $table = 'supplier_quotations';
    protected $guarded = [];
    public function items() { return $this->hasMany(SupplierQuotationItemModel::class, 'supplier_quotation_id'); }
    public function rfq() { return $this->belongsTo(RFQModel::class, 'rfq_id'); }
    public function supplier() { return $this->belongsTo(SupplierModel::class, 'supplier_id'); }
}
