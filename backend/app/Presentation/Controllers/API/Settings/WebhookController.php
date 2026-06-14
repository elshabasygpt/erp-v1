<?php

namespace App\Presentation\Controllers\API\Settings;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\WebhookEndpointModel;
use App\Infrastructure\Eloquent\Models\WebhookLogModel;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WebhookController extends BaseController
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

        $endpoint = WebhookEndpointModel::create($validated);

        return $this->created($endpoint, 'Webhook created successfully');
    }

    public function show($id)
    {
        $endpoint = WebhookEndpointModel::findOrFail($id);
        return $this->success($endpoint);
    }

    public function update(Request $request, $id)
    {
        $endpoint = WebhookEndpointModel::findOrFail($id);

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
        $endpoint = WebhookEndpointModel::findOrFail($id);
        $endpoint->delete();

        return $this->success(null, 'Webhook deleted successfully');
    }

    public function getLogs($id)
    {
        $logs = WebhookLogModel::where('endpoint_id', $id)
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();
            
        return $this->success($logs);
    }
}
