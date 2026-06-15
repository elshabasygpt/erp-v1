<?php

namespace App\Presentation\Controllers\API;

use Illuminate\Http\Request;

abstract class BaseTenantController extends BaseController
{
    /**
     * جيب الـ tenant_id من الـ authenticated user
     */
    protected function getTenantId(Request $request): int
    {
        return (int) ($request->user()->tenant_id ?? 0);
    }

    /**
     * تأكد إن الـ resource بتاع نفس الـ tenant
     */
    protected function assertBelongsToTenant(
        mixed $model,
        Request $request,
        string $column = 'tenant_id'
    ): void {
        if (!$model) {
            abort(404, 'Resource not found.');
        }

        $tenantId = $this->getTenantId($request);

        if ((int) ($model->$column ?? 0) !== $tenantId) {
            abort(403, 'Access denied. Resource belongs to another tenant.');
        }
    }

    /**
     * أضف tenant_id تلقائياً لأي query
     */
    protected function scopeToTenant($query, Request $request): mixed
    {
        return $query->where('tenant_id', $this->getTenantId($request));
    }
}
