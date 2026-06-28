<?php

namespace App\Jobs;

use App\Infrastructure\Eloquent\Models\WebhookEndpointModel;
use App\Infrastructure\Eloquent\Models\WebhookLogModel;
use App\Jobs\Concerns\RunsInTenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SendWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, RunsInTenantContext, SerializesModels;

    public int $tries = 5;

    public int $timeout = 30;

    public function backoff(): array
    {
        // Exponential backoff: 1min, 5min, 15min, 30min, 60min
        return [60, 300, 900, 1800, 3600];
    }

    public function __construct(
        public readonly string $tenantId,
        public readonly string $webhookId,
        public readonly string $event,
        public readonly array $payload,
    ) {}

    public function handle(): void
    {
        $tenant = $this->bootTenantContext($this->tenantId);
        if (! $tenant) {
            return;
        }

        try {
            $this->process();
        } finally {
            $this->shutdownTenantContext();
        }
    }

    private function process(): void
    {
        $webhook = WebhookEndpointModel::query()->find($this->webhookId);

        if (! $webhook || ! $webhook->is_active) {
            Log::info('SendWebhookJob skipped — webhook inactive or not found', [
                'webhook_id' => $this->webhookId,
            ]);

            return;
        }

        $body = json_encode([
            'event' => $this->event,
            'tenant_id' => $this->tenantId,
            'timestamp' => now()->toISOString(),
            'data' => $this->payload,
        ]);

        $signature = hash_hmac('sha256', $body, $webhook->secret ?? '');

        $startTime = microtime(true);

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'X-Webhook-Event' => $this->event,
                'X-Webhook-Signature' => 'sha256='.$signature,
            ])
                ->timeout(25)
                ->post($webhook->url, json_decode($body, true));

            $duration = round((microtime(true) - $startTime) * 1000);

            $success = $response->successful();

            WebhookLogModel::query()->create([
                'id' => Str::uuid(),
                'webhook_id' => $this->webhookId,
                'event' => $this->event,
                'payload' => $body,
                'status_code' => $response->status(),
                'response' => substr($response->body(), 0, 1000),
                'duration_ms' => $duration,
                'success' => $success,
                'attempt' => $this->attempts(),
                'created_at' => now(),
            ]);

            if (! $success) {
                throw new \RuntimeException(
                    "Webhook returned HTTP {$response->status()}: ".substr($response->body(), 0, 200)
                );
            }

            Log::info('SendWebhookJob succeeded', [
                'webhook_id' => $this->webhookId,
                'event' => $this->event,
                'status_code' => $response->status(),
                'duration_ms' => $duration,
            ]);

        } catch (ConnectionException $e) {
            $duration = round((microtime(true) - $startTime) * 1000);

            WebhookLogModel::query()->create([
                'id' => Str::uuid(),
                'webhook_id' => $this->webhookId,
                'event' => $this->event,
                'payload' => $body,
                'status_code' => 0,
                'response' => 'Connection failed: '.$e->getMessage(),
                'duration_ms' => $duration,
                'success' => false,
                'attempt' => $this->attempts(),
                'created_at' => now(),
            ]);

            throw $e; // يخلي الـ Queue يعمل retry
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('SendWebhookJob permanently failed after all retries', [
            'webhook_id' => $this->webhookId,
            'event' => $this->event,
            'error' => $exception->getMessage(),
        ]);

        $tenant = $this->bootTenantContext($this->tenantId);
        if (! $tenant) {
            return;
        }

        try {
            // Mark webhook as failed in logs
            WebhookLogModel::query()->create([
                'id' => Str::uuid(),
                'webhook_id' => $this->webhookId,
                'event' => $this->event,
                'payload' => json_encode($this->payload),
                'status_code' => 0,
                'response' => 'Permanently failed: '.$exception->getMessage(),
                'duration_ms' => 0,
                'success' => false,
                'attempt' => $this->attempts(),
                'created_at' => now(),
            ]);
        } finally {
            $this->shutdownTenantContext();
        }
    }
}
