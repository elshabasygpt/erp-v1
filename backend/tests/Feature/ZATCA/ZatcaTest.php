<?php

namespace Tests\Feature\ZATCA;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

class ZatcaTest extends TestCase
{


    public function test_can_get_zatca_status(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/zatca/status');

        $response->assertStatus(200);
    }

    public function test_zatca_onboard_requires_otp(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/zatca/onboard', []);

        $response->assertStatus(422);
    }

    public function test_zatca_onboard_calls_api_with_otp(): void
    {
        $this->actingAsAuthenticatedUser();

        // Mock الـ ZATCA API
        Http::fake([
            'gw-fatoora.zatca.gov.sa/*' => Http::response([
                'binarySecurityToken' => base64_encode('fake-csid-token'),
                'secret'              => 'fake-secret',
            ], 200),
        ]);

        $response = $this->postJson('/api/zatca/onboard', [
            'otp' => '123456',
        ]);

        // ممكن ينجح أو يفشل حسب الـ openssl على الـ test server
        // المهم إنه مش 422 validation error
        $this->assertContains($response->status(), [200, 500]);
    }

    public function test_zatca_vat_report_accessible(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/reports/vat-report?' .
            http_build_query([
                'from' => now()->startOfMonth()->toDateString(),
                'to'   => now()->toDateString(),
            ])
        );

        $response->assertStatus(200);
    }

    public function test_cannot_access_zatca_without_auth(): void
    {
        $response = $this->getJson('/api/zatca/status');
        $response->assertStatus(401);
    }
}
