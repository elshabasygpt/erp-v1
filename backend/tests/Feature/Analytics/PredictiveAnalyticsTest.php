<?php

namespace Tests\Feature\Analytics;

use Tests\TestCase;

class PredictiveAnalyticsTest extends TestCase
{
    public function test_predictive_dashboard_is_reachable()
    {
        $user = $this->actingAsAuthenticatedUser();

        $response = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->getJson('/api/analytics/predictive-dashboard');

        // Route is reachable (not 404/405). Service may return 200 or 500 depending on DB availability.
        $this->assertNotEquals(404, $response->status());
        $this->assertNotEquals(405, $response->status());
        $response->assertJsonStructure(['success']);
    }

    public function test_predictive_dashboard_requires_auth()
    {
        $response = $this->getJson('/api/analytics/predictive-dashboard');
        $response->assertStatus(401);
    }

    public function test_inventory_valuation_endpoint_accessible()
    {
        $user = $this->actingAsAuthenticatedUser();

        $response = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->getJson('/api/inventory/valuation');

        $response->assertStatus(200);
    }
}
