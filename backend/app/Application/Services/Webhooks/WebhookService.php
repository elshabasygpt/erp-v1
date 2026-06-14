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
    public function dispatch(string $event, array $payload)
    {
        // Find active endpoints that subscribe to this event
        $endpoints = WebhookEndpointModel::where('is_active', true)->get()
            ->filter(function ($endpoint) use ($event) {
                return in_array($event, $endpoint->events);
            });

        foreach ($endpoints as $endpoint) {
            $this->send($endpoint, $event, $payload);
        }
    }

    protected function send(WebhookEndpointModel $endpoint, string $event, array $payload)
    {
        $signature = hash_hmac('sha256', json_encode($payload), $endpoint->secret);

        try {
            $response = Http::withHeaders([
                'X-POS11-Event' => $event,
                'X-POS11-Signature' => $signature,
            ])->timeout(10)->post($endpoint->url, $payload);

            WebhookLogModel::create([
                'endpoint_id' => $endpoint->id,
                'event_name' => $event,
                'payload' => $payload,
                'response_status' => $response->status(),
                'response_body' => substr($response->body(), 0, 1000), // truncate long responses
                'is_successful' => $response->successful(),
            ]);
        } catch (\Exception $e) {
            Log::error("Webhook delivery failed to {$endpoint->url}: " . $e->getMessage());
            
            WebhookLogModel::create([
                'endpoint_id' => $endpoint->id,
                'event_name' => $event,
                'payload' => $payload,
                'response_status' => null,
                'response_body' => $e->getMessage(),
                'is_successful' => false,
            ]);
        }
    }
}
