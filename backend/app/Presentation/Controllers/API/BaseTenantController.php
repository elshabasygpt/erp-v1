<?php

namespace App\Presentation\Controllers\API;

use Illuminate\Http\Request;

abstract class BaseTenantController extends BaseController
{
    /**
     * جيب الـ tenant_id من الـ authenticated user
     */
    protected function getTenantId(Request $request): string
    {
        return (string) ($request->user()->tenant_id ?? '');
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

        if ((string) ($model->$column ?? '') !== $tenantId) {
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
