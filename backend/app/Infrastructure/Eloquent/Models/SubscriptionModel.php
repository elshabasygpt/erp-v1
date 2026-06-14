<?php

namespace App\Infrastructure\Eloquent\Models;

class SubscriptionModel extends CentralModel
{
    protected $table = 'subscriptions';
    protected $fillable = ['tenant_id', 'plan_id', 'status', 'starts_at', 'ends_at', 'trial_ends_at', 'cancelled_at'];
    protected $casts = ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'trial_ends_at' => 'datetime', 'cancelled_at' => 'datetime'];
    public function tenant() { return $this->belongsTo(TenantModel::class, 'tenant_id'); }
    public function plan() { return $this->belongsTo(PlanModel::class, 'plan_id'); }
}
