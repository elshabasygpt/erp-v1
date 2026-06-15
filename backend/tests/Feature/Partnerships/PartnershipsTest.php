<?php

namespace Tests\Feature\Partnerships;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Infrastructure\Eloquent\Models\PartnerModel;

class PartnershipsTest extends TestCase
{


    public function test_can_list_partners(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/partnerships/partners');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data']);
    }

    public function test_can_create_partner(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/partnerships/partners', [
            'name'           => 'شريك تجريبي',
            'email'          => 'partner@example.com',
            'profit_share'   => 25.00,
            'joined_at'      => now()->toDateString(),
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.name', 'شريك تجريبي');
    }

    public function test_can_show_partner(): void
    {
        $this->actingAsAuthenticatedUser();

        $partner = PartnerModel::factory()->create([]);

        $response = $this->getJson("/api/partnerships/partners/{$partner->id}");

        $response->assertStatus(200);
    }

    public function test_can_update_partner(): void
    {
        $this->actingAsAuthenticatedUser();

        $partner = PartnerModel::factory()->create([]);

        $response = $this->putJson("/api/partnerships/partners/{$partner->id}", [
            'name'         => 'شريك محدّث',
            'profit_share' => 30.00,
        ]);

        $response->assertStatus(200);
    }

    public function test_can_list_profit_distributions(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/partnerships/distributions');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data']);
    }

    public function test_can_preview_profit_distribution(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/partnerships/distributions/preview?' .
            http_build_query([
                'period_start' => now()->startOfMonth()->toDateString(),
                'period_end'   => now()->toDateString(),
            ])
        );

        $response->assertStatus(200);
    }

    public function test_cannot_access_partnerships_without_auth(): void
    {
        $response = $this->getJson('/api/partnerships/partners');
        $response->assertStatus(401);
    }
}
