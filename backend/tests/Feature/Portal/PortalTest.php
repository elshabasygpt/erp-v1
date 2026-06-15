<?php

namespace Tests\Feature\Portal;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Infrastructure\Eloquent\Models\PartnerModel;

class PortalTest extends TestCase
{


    private function getPartnerToken(): string
    {
        $partner = PartnerModel::factory()->create([
            
            'portal_access'    => true,
            'portal_password'  => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/portal/login', [
            'email'    => $partner->email,
            'password' => 'password123',
        ]);

        return $response->json('data.token') ?? 'test-token';
    }

    public function test_partner_can_login_to_portal(): void
    {
        $partner = PartnerModel::factory()->create([
            
            'portal_access'   => true,
            'portal_password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/portal/login', [
            'email'    => $partner->email,
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
    }

    public function test_partner_cannot_login_with_wrong_password(): void
    {
        $partner = PartnerModel::factory()->create([
            
            'portal_access'   => true,
            'portal_password' => bcrypt('correct-password'),
        ]);

        $response = $this->postJson('/api/portal/login', [
            'email'    => $partner->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_can_request_magic_link(): void
    {
        $partner = PartnerModel::factory()->create([
            
            'portal_access' => true,
        ]);

        $response = $this->postJson('/api/portal/magic-link', [
            'email' => $partner->email,
        ]);

        $response->assertStatus(200);
    }

    public function test_portal_dashboard_requires_auth(): void
    {
        $response = $this->getJson('/api/portal/dashboard');
        $response->assertStatus(401);
    }

    public function test_portal_profits_requires_auth(): void
    {
        $response = $this->getJson('/api/portal/profits');
        $response->assertStatus(401);
    }
}
