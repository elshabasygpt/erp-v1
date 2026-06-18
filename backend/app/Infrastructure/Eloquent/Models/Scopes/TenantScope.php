<?php

namespace App\Infrastructure\Eloquent\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model)
    {
        $tenantId = null;

        if (app()->has('current_tenant')) {
            $tenantId = app('current_tenant')->id;
        } elseif (auth()->check()) {
            $tenantId = auth()->user()->tenant_id;
        } elseif (request()->header('X-Tenant-ID')) {
            $tenantId = request()->header('X-Tenant-ID');
        }

        // If a tenant context is found, scope the query.
        // If not (e.g. running in console/queue without explicit header/auth),
        // we don't apply the scope. Jobs are expected to use raw DB queries
        // with explicit tenant_id bindings, or set the header context if using Eloquent.
        if ($tenantId !== null && $tenantId !== '') {
            $builder->where($model->getTable().'.tenant_id', $tenantId);
        }
    }
}
