<?php
namespace App\Infrastructure\Eloquent\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseRequestItemModel extends Model
{
    use HasUuids, SoftDeletes;
    protected $table = 'purchase_request_items';
    protected $guarded = [];
    public function request() { return $this->belongsTo(PurchaseRequestModel::class, 'purchase_request_id'); }
}
