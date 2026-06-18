<?php

namespace Tests\Feature\Webhooks;

use App\Infrastructure\Eloquent\Models\WebhookEndpointModel;
use Tests\TestCase;

class WebhooksTest extends TestCase
{
    public function test_can_list_webhooks(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/webhooks');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_webhook(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/webhooks', [
            'url' => 'https://example.com/webhook',
            'events' => ['invoice.confirmed'],
            'is_active' => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.url', 'https://example.com/webhook');
    }

    public function test_can_update_webhook(): void
    {
        $this->actingAsAuthenticatedUser();

        $webhook = WebhookEndpointModel::factory()->create([

            'url' => 'https://old.example.com/webhook',
            'events' => ['invoice.confirmed'],
            'is_active' => true,
        ]);

        $response = $this->putJson("/api/webhooks/{$webhook->id}", [
            'url' => 'https://new.example.com/webhook',
            'events' => ['invoice.confirmed', 'purchase.confirmed'],
            'is_active' => true,
        ]);

        $response->assertStatus(200);
    }

    public function test_can_delete_webhook(): void
    {
        $this->actingAsAuthenticatedUser();

        $webhook = WebhookEndpointModel::factory()->create([

            'events' => ['invoice.confirmed'],
        ]);

        $response = $this->deleteJson("/api/webhooks/{$webhook->id}");

        $response->assertStatus(200);
    }

    public function test_can_get_webhook_logs(): void
    {
        $this->actingAsAuthenticatedUser();

        $webhook = WebhookEndpointModel::factory()->create([

            'events' => ['invoice.confirmed'],
        ]);

        $response = $this->getJson("/api/webhooks/{$webhook->id}/logs");

        $response->assertStatus(200);
    }

    public function test_webhook_url_must_be_valid(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/webhooks', [
            'url' => 'not-a-valid-url',
            'events' => ['invoice.confirmed'],
        ]);

        $response->assertStatus(422);
    }

    public function test_webhook_events_must_be_valid(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/webhooks', [
            'url' => 'https://example.com/webhook',
            'events' => ['invalid.event'],
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_access_webhooks_without_auth(): void
    {
        $response = $this->getJson('/api/webhooks');
        $response->assertStatus(401);
    }
}
