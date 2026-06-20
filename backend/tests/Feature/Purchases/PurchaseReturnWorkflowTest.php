<?php

namespace Tests\Feature\Purchases;

use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class PurchaseReturnWorkflowTest extends TestCase
{
    public function test_confirmed_purchase_return_reverses_stock_balance_and_posts_journal_entry()
    {
        $this->actingAsAuthenticatedUser();

        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(),
            'name' => 'Main Warehouse',
            'code' => 'WH01',
            'is_active' => true,
        ]);

        $supplier = SupplierModel::create([
            'id' => Str::uuid(),
            'name' => 'Test Supplier',
            'balance' => 0,
        ]);

        $product = ProductModel::create([
            'id' => Str::uuid(),
            'name' => 'Test Product', 'name_ar' => 'Test Product', 'name_en' => 'Test Product',
            'sku' => 'SKU-1',
            'barcode' => '123',
            'type' => 'standard',
            'cost_price' => 50,
            'price' => 100,
            'is_active' => true,
        ]);

        $purchasePayload = [
            'supplier_id' => $supplier->id,
            'warehouse_id' => $warehouse->id,
            'issue_date' => now()->toDateString(),
            'status' => 'confirmed',
            'payment_type' => 'credit',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 45,
                    'tax_rate' => 15,
                ],
            ],
            'notes' => 'Test Purchase',
        ];

        $purchaseResponse = $this->postJson('/api/purchases/invoices', $purchasePayload);
        $purchaseResponse->assertStatus(201);

        $this->assertDatabaseHas('warehouse_products', [
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'quantity' => 10,
        ]);

        $supplier->refresh();
        $owedAfterPurchase = (float) $supplier->balance;
        $this->assertGreaterThan(0, $owedAfterPurchase);

        $returnPayload = [
            'supplier_id' => $supplier->id,
            'warehouse_id' => $warehouse->id,
            'issue_date' => now()->toDateString(),
            'status' => 'completed',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 4,
                    'unit_price' => 45,
                    'tax_rate' => 15,
                ],
            ],
            'notes' => 'Test Purchase Return',
        ];

        $returnResponse = $this->postJson('/api/purchases/returns', $returnPayload);

        if ($returnResponse->status() !== 201) {
            dump($returnResponse->json());
        }
        $returnResponse->assertStatus(201);
        $returnResponse->assertJsonPath('data.status', 'completed');

        // Stock reduced by the returned quantity
        $this->assertDatabaseHas('warehouse_products', [
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'quantity' => 6,
        ]);

        // Supplier balance reduced by the return total (4 * 45 * 1.15 = 207)
        $supplier->refresh();
        $this->assertEquals(round($owedAfterPurchase - 207, 2), round((float) $supplier->balance, 2));

        // Reversing journal entry was posted and is balanced
        $returnId = $returnResponse->json('data.id');
        $entry = JournalEntryModel::query()->where('reference_type', 'purchase_return')->where('reference_id', $returnId)->first();
        $this->assertNotNull($entry);
        $this->assertTrue((bool) $entry->is_posted);

        $totalDebit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('debit');
        $totalCredit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('credit');
        $this->assertEquals(round((float) $totalDebit, 2), round((float) $totalCredit, 2));
        $this->assertEquals(207.0, round((float) $totalDebit, 2));
    }
}
