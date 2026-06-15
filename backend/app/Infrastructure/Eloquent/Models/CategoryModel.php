<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class CategoryModel extends BaseModel
{
    use HasFactory;

    protected $table = 'categories';

    protected $fillable = [
        'name',
        'name_ar',
        'parent_id',
        'image_url',
        'discount',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'discount' => 'decimal:2',
    ];

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(self::class, 'parent_id');
    }
}
