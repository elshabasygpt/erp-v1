<?php

namespace App\Application\Services\Webhooks;

use App\Infrastructure\Eloquent\Models\WebhookEndpointModel;
use App\Jobs\SendWebhookJob;
use Illuminate\Support\Facades\Log;

class WebhookService
{
    public function __construct(
        private readonly string $tenantId
    ) {}

    /**
     * Dispatch webhook event to all active endpoints
     */
    public function dispatch(string $event, array $payload): void
    {
        try {
            $webhooks = WebhookEndpointModel::query()->where('tenant_id', $this->tenantId)
                ->where('is_active', true)
                ->where(function ($q) use ($event) {
                    $q->whereJsonContains('events', $event)
                        ->orWhereJsonContains('events', '*');
                })
                ->get();

            if ($webhooks->isEmpty()) {
                return;
            }

            foreach ($webhooks as $webhook) {
                SendWebhookJob::dispatch(
                    tenantId: $this->tenantId,
                    webhookId: (string) $webhook->id,
                    event: $event,
                    payload: $payload,
                );

                Log::info('Webhook job dispatched', [
                    'tenant_id' => $this->tenantId,
                    'webhook_id' => $webhook->id,
                    'event' => $event,
                ]);
            }

        } catch (\Throwable $e) {
            // لو فشل الـ dispatch — سجّل بس ولا توقف الـ Request
            Log::error('Failed to dispatch webhook jobs', [
                'tenant_id' => $this->tenantId,
                'event' => $event,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Dispatch webhook from static context (بدون inject)
     */
    public static function dispatchForTenant(
        string $tenantId,
        string $event,
        array $payload
    ): void {
        (new self($tenantId))->dispatch($event, $payload);
    }
}
