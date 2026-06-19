<?php

namespace App\Domain\Sales\Entities;

use Illuminate\Database\Eloquent\Model;

class PosShift extends Model
{
    protected $fillable = [
        'tenant_id',
        'user_id',
        'opening_cash',
        'closing_cash',
        'cash_sales',
        'card_sales',
        'opened_at',
        'closed_at',
        'status',
        'notes',
    ];

    protected $casts = [
        'opening_cash' => 'decimal:2',
        'closing_cash' => 'decimal:2',
        'cash_sales' => 'decimal:2',
        'card_sales' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];
}
