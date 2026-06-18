<?php
namespace App\Infrastructure\Eloquent\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class RFQItemModel extends Model
{
    use HasUuids;
    protected $table = 'rfq_items';
    protected $guarded = [];
}
