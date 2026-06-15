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
            'url'       => 'required|url|max:500',
            'events'    => 'required|array|min:1',
            'events.*'  => 'required|string|in:invoice.confirmed,purchase.confirmed,stock.transfer.received,payroll.generated,*',
            'is_active' => 'sometimes|boolean',
            'secret'    => 'nullable|string|max:255',
            'name'      => 'nullable|string',
        ]);

        $validated['secret'] = 'whsec_' . Str::random(32);

        $validated['tenant_id'] = $this->getTenantId($request);
        $endpoint = WebhookEndpointModel::create($validated);

        return response()->json(['data' => $endpoint, 'message' => 'Webhook created successfully'], 201);
    }

    public function show(Request $request, $id)
    {
        $endpoint = WebhookEndpointModel::where('tenant_id', $this->getTenantId($request))->findOrFail($id);
        return $this->success($endpoint);
    }

    public function update(Request $request, $id)
    {
        $endpoint = WebhookEndpointModel::where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        $validated = $request->validate([
            'url'       => 'required|url|max:500',
            'events'    => 'required|array|min:1',
            'events.*'  => 'required|string|in:invoice.confirmed,purchase.confirmed,stock.transfer.received,payroll.generated,*',
            'is_active' => 'sometimes|boolean',
            'secret'    => 'nullable|string|max:255',
            'name'      => 'nullable|string',
        ]);

        $endpoint->update($validated);

        return $this->success($endpoint, 'Webhook updated successfully');
    }

    public function destroy(Request $request, $id)
    {
        $endpoint = WebhookEndpointModel::where('tenant_id', $this->getTenantId($request))->findOrFail($id);
        $endpoint->delete();

        return $this->success(null, 'Webhook deleted successfully');
    }

    public function getLogs(Request $request, $id)
    {
        $logs = WebhookLogModel::where('tenant_id', $this->getTenantId($request))->where('endpoint_id', $id)
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();
            
        return $this->success($logs);
    }
}


