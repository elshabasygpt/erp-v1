<?php
namespace App\Infrastructure\Eloquent\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SupplierQuotationItemModel extends Model
{
    use HasUuids;
    protected $table = 'supplier_quotation_items';
    protected $guarded = [];
}
