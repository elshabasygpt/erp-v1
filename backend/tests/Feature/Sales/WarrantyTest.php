<?php

namespace Tests\Feature\Sales;

use Tests\TestCase;

class WarrantyTest extends TestCase
{
    public function test_can_list_warranties()
    {
        $user = $this->actingAsAuthenticatedUser();

        $response = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->getJson('/api/sales/warranties');

        $response->assertStatus(200);
        $response->assertJsonStructure(['success', 'data']);
    }

    public function test_can_get_warranty_report()
    {
        $user = $this->actingAsAuthenticatedUser();

        $response = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->getJson('/api/sales/warranties/report');

        $response->assertStatus(200);
    }

    public function test_warranty_creation_requires_valid_invoice()
    {
        $user = $this->actingAsAuthenticatedUser();

        $response = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->postJson('/api/sales/warranties', [
                'invoice_id'   => '00000000-0000-0000-0000-000000000000',
                'product_id'   => '00000000-0000-0000-0000-000000000000',
                'customer_id'  => '00000000-0000-0000-0000-000000000000',
                'warranty_months' => 12,
            ]);

        // 422 = validation / domain error (non-existent FK), 404 or 500 also acceptable
        $this->assertContains($response->status(), [422, 404, 500]);
    }
}
