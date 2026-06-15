<?php

namespace App\Presentation\Controllers\API\Settings;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Infrastructure\Eloquent\Models\WebhookEndpointModel;
use App\Infrastructure\Eloquent\Models\WebhookLogModel;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WebhookController extends BaseTenantController
{
    public function index()
    {
        $endpoints = WebhookEndpointModel::withCount('logs')->get();
        return $this->success($endpoints);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'url' => 'required|url',
            'name' => 'nullable|string',
            'events' => 'required|array',
            'is_active' => 'boolean',
        ]);

        $validated['secret'] = 'whsec_' . Str::random(32);

        $validated['tenant_id'] = $this->getTenantId($request);
        $endpoint = WebhookEndpointModel::create($validated);

        return $this->created($endpoint, 'Webhook created successfully');
    }

    public function show($id)
    {
        $endpoint = WebhookEndpointModel::where('tenant_id', $this->getTenantId($request))->findOrFail($id);
        return $this->success($endpoint);
    }

    public function update(Request $request, $id)
    {
        $endpoint = WebhookEndpointModel::where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        $validated = $request->validate([
            'url' => 'required|url',
            'name' => 'nullable|string',
            'events' => 'required|array',
            'is_active' => 'boolean',
        ]);

        $endpoint->update($validated);

        return $this->success($endpoint, 'Webhook updated successfully');
    }

    public function destroy($id)
    {
        $endpoint = WebhookEndpointModel::where('tenant_id', $this->getTenantId($request))->findOrFail($id);
        $endpoint->delete();

        return $this->success(null, 'Webhook deleted successfully');
    }

    public function getLogs($id)
    {
        $logs = WebhookLogModel::where('tenant_id', $this->getTenantId($request))->where('endpoint_id', $id)
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();
            
        return $this->success($logs);
    }
}


