<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use App\Infrastructure\Eloquent\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class BaseTenantModel extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    /**
     * Get the database connection for the model.
     * Tenant models use the 'tenant' connection.
     */
    public function getConnectionName()
    {
        return 'tenant';
    }

    protected static function booted()
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function ($model) {
            if (in_array('tenant_id', \Illuminate\Support\Facades\Schema::connection('tenant')->getColumnListing($model->getTable())) && !$model->tenant_id) {
                if (app()->has('current_tenant')) {
                    $model->tenant_id = app('current_tenant')->id;
                } elseif (auth()->check() && isset(auth()->user()->tenant_id)) {
                    $model->tenant_id = auth()->user()->tenant_id;
                } elseif (request()->header('X-Tenant-ID')) {
                    $model->tenant_id = request()->header('X-Tenant-ID');
                }
            }
        });
    }
}
