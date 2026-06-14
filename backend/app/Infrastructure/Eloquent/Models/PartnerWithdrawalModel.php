<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PartnerWithdrawalModel extends Model
{
    use HasUuids;

    protected $connection = 'tenant';
    protected $table = 'partner_withdrawals';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'partner_id',
        'amount',
        'notes',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(PartnerModel::class, 'partner_id');
    }
}
