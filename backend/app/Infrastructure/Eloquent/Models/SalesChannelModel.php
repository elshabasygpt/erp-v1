<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesChannelModel extends BaseModel
{
    use HasFactory, SoftDeletes;

    protected $table = 'sales_channels';

    protected $fillable = [
        'name',
        'code',
        'type',
        'pricing_method',
        'markup_percentage',
        'fixed_markup',
        'apply_before_tax',
        'is_active',
        'sort_order',
        'logo_url',
    ];

    protected $casts = [
        'markup_percentage' => 'float',
        'fixed_markup' => 'float',
        'apply_before_tax' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
