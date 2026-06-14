<?php

namespace App\Infrastructure\Eloquent\Models;

class PlanModel extends CentralModel
{
    protected $table = 'plans';
    protected $fillable = ['name', 'slug', 'price', 'billing_cycle', 'max_users', 'max_products', 'features', 'is_active', 'trial_days', 'description'];
    protected $casts = ['price' => 'decimal:2', 'features' => 'array', 'is_active' => 'boolean', 'max_users' => 'integer', 'max_products' => 'integer', 'trial_days' => 'integer'];
}
