<?php

namespace App\Application\Services\Webhooks;

use App\Infrastructure\Eloquent\Models\WebhookEndpointModel;
use App\Infrastructure\Eloquent\Models\WebhookLogModel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookService
{
    /**
     * Dispatch an event to all subscribed endpoints.
     * In a production environment, this should be queued.
     */
    public function dispatch(string $event, array $payload): void
    {
        $tenantId = app('currentTenant')->id ?? config('app.tenant_id') ?? '1';

        $webhooks = WebhookEndpointModel::where('is_active', true)
            ->where(function ($q) use ($event) {
                $q->whereJsonContains('events', $event)
                  ->orWhereJsonContains('events', '*');
            })
            ->get();

        foreach ($webhooks as $webhook) {
            \App\Jobs\SendWebhookJob::dispatch(
                tenantId: (string) $tenantId,
                webhookId: (string) $webhook->id,
                event: $event,
                payload: $payload,
            );
        }
    }
}
