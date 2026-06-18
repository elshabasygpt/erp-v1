<?php

namespace Tests\Feature\Treasury;

use Tests\TestCase;

class TreasuryTest extends TestCase
{
    public function test_can_list_safes(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/treasury/safes');
        $response->dump();
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_safe(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/treasury/safes', [
            'name' => 'الخزينة الرئيسية',
            'type' => 'cash',
            'type' => 'cash',
        ]);

        if ($response->status() !== 201) {
            dump($response->json());
        }
        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'الخزينة الرئيسية');
    }

    public function test_can_transfer_between_safes(): void
    {
        $this->actingAsAuthenticatedUser();

        $safe1 = $this->createSafe(['balance' => 1000]);
        $safe2 = $this->createSafe(['balance' => 500]);

        $response = $this->postJson('/api/treasury/transfer', [
            'from_safe_id' => $safe1->id,
            'to_safe_id' => $safe2->id,
            'amount' => 300,
            'description' => 'تحويل داخلي',
        ]);

        if ($response->status() !== 200) {
            dump($response->json());
        }
        $response->assertStatus(200);
        $this->assertEquals(700, $safe1->fresh()->balance);
        $this->assertEquals(800, $safe2->fresh()->balance);
    }

    public function test_transfer_fails_with_insufficient_balance(): void
    {
        $this->actingAsAuthenticatedUser();

        $safe1 = $this->createSafe(['balance' => 100]);
        $safe2 = $this->createSafe(['balance' => 0]);

        $response = $this->postJson('/api/treasury/transfer', [
            'from_safe_id' => $safe1->id,
            'to_safe_id' => $safe2->id,
            'amount' => 500,
        ]);

        if ($response->status() !== 422) {
            dump($response->json());
        }
        $response->assertStatus(422);
    }
}
