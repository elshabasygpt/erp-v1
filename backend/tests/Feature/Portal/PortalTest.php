<?php

namespace Tests\Feature\Portal;

use App\Infrastructure\Eloquent\Models\PartnerModel;
use Tests\TestCase;

class PortalTest extends TestCase
{
    private function getPartnerToken(): string
    {
        $partner = PartnerModel::factory()->create([

            'portal_enabled' => true,
            'password_hash' => bcrypt('password123'),
        ]);

        $response = $this->withHeader('X-Tenant-ID', 'test.example.com')->postJson('/api/portal/login', [
            'tenant_id' => '00000000-0000-0000-0000-000000000001', 'email' => $partner->email,
            'password' => 'password123',
        ]);

        return $response->json('data.token') ?? 'test-token';
    }

    public function test_partner_can_login_to_portal(): void
    {
        $partner = PartnerModel::factory()->create([

            'portal_enabled' => true,
            'password_hash' => bcrypt('password123'),
        ]);

        $response = $this->withHeader('X-Tenant-ID', 'test.example.com')->postJson('/api/portal/login', [
            'tenant_id' => '00000000-0000-0000-0000-000000000001', 'email' => $partner->email,
            'password' => 'password123',
        ]);
        $response->assertStatus(200);
    }

    public function test_partner_cannot_login_with_wrong_password(): void
    {
        $partner = PartnerModel::factory()->create([

            'portal_enabled' => true,
            'password_hash' => bcrypt('correct-password'),
        ]);

        $response = $this->withHeader('X-Tenant-ID', 'test.example.com')->postJson('/api/portal/login', [
            'tenant_id' => '00000000-0000-0000-0000-000000000001', 'email' => $partner->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_can_request_magic_link(): void
    {
        $partner = PartnerModel::factory()->create([

            'portal_enabled' => true,
        ]);

        $response = $this->withHeader('X-Tenant-ID', 'test.example.com')->postJson('/api/portal/magic-link', [
            'tenant_id' => '00000000-0000-0000-0000-000000000001', 'email' => $partner->email,
        ]);

        $response->assertStatus(200);
    }

    public function test_portal_dashboard_requires_auth(): void
    {
        $response = $this->withHeader('X-Tenant-ID', 'test.example.com')->getJson('/api/portal/dashboard');
        $response->assertStatus(401);
    }

    public function test_portal_profits_requires_auth(): void
    {
        $response = $this->withHeader('X-Tenant-ID', 'test.example.com')->getJson('/api/portal/profits');
        $response->assertStatus(401);
    }
}
