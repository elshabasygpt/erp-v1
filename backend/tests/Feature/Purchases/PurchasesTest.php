<?php

namespace Tests\Feature\Purchases;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use Tests\TestCase;

class PurchasesTest extends TestCase
{
    public function test_can_list_purchases(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/purchases/invoices');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_purchase_invoice(): void
    {
        $this->actingAsAuthenticatedUser();

        $supplier = SupplierModel::factory()->create([]);
        $product = ProductModel::factory()->create([]);

        $warehouse = WarehouseModel::factory()->create();

        $response = $this->postJson('/api/purchases/invoices', [
            'supplier_id' => $supplier->id,
            'warehouse_id' => $warehouse->id,
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'status' => 'draft',
            'payment_type' => 'credit',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 50.00,
                    'tax_rate' => 15,
                ],
            ],
        ]);

        if ($response->status() !== 201) {
            dump($response->json());
        }
        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id']]);
    }

    public function test_can_show_purchase_invoice(): void
    {
        $this->actingAsAuthenticatedUser();

        $supplier = SupplierModel::factory()->create([]);
        $purchase = PurchaseInvoiceModel::factory()->create([

            'supplier_id' => $supplier->id,
        ]);

        $response = $this->getJson("/api/purchases/invoices/{$purchase->id}");

        $response->assertStatus(200);
    }

    public function test_can_update_purchase_status(): void
    {
        $this->actingAsAuthenticatedUser();

        $supplier = SupplierModel::factory()->create([]);
        $purchase = PurchaseInvoiceModel::factory()->create([
            'supplier_id' => $supplier->id,
            'status' => 'draft',
            'subtotal' => 100,
            'vat_amount' => 15,
            'total' => 115,
        ]);

        $response = $this->putJson("/api/purchases/invoices/{$purchase->id}/status", [
            'status' => 'confirmed',
        ]);

        if ($response->status() !== 200) {
            dump($response->json());
        }
        $response->assertStatus(200);
    }

    public function test_can_list_purchase_returns(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/purchases/returns');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_cannot_access_purchases_without_auth(): void
    {
        $response = $this->getJson('/api/purchases/invoices');
        $response->assertStatus(401);
    }
}
