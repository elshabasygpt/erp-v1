<?php
namespace App\Infrastructure\Eloquent\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrderItemModel extends Model
{
    use HasUuids, SoftDeletes;
    protected $table = 'purchase_order_items';
    protected $guarded = [];
}
