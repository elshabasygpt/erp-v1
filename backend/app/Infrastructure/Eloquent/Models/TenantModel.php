<?php

namespace App\Infrastructure\Eloquent\Models;

class TenantModel extends CentralModel
{
    protected $table = 'tenants';
    protected $fillable = ['name', 'domain', 'database_name', 'status', 'trial_ends_at', 'created_by'];
    protected $casts = ['trial_ends_at' => 'datetime'];
    public function subscriptions() { return $this->hasMany(SubscriptionModel::class, 'tenant_id'); }
    public function activeSubscription() { return $this->hasOne(SubscriptionModel::class, 'tenant_id')->where('status', 'active')->latest(); }
}
