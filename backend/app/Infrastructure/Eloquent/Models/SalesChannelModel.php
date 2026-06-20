<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesChannelModel extends BaseModel
{
    use HasFactory, SoftDeletes;

    protected $table = 'sales_channels';

    protected static function booted()
    {
        parent::booted();

        static::updated(function ($model) {
            if ($model->isDirty('image_url') && $model->getOriginal('image_url')) {
                $oldPath = str_replace(\Illuminate\Support\Facades\Storage::disk('public')->url(''), '', $model->getOriginal('image_url'));
                \Illuminate\Support\Facades\Storage::disk('public')->delete(ltrim($oldPath, '/'));
            }
        });

        static::forceDeleted(function ($model) {
            if ($model->image_url) {
                $path = str_replace(\Illuminate\Support\Facades\Storage::disk('public')->url(''), '', $model->image_url);
                \Illuminate\Support\Facades\Storage::disk('public')->delete(ltrim($path, '/'));
            }
        });
    }

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
