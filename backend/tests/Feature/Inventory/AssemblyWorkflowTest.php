<?php

namespace Tests\Feature\Inventory;

use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class AssemblyWorkflowTest extends TestCase
{
    public function test_assembling_a_product_moves_stock_and_posts_journal_entry()
    {
        $this->actingAsAuthenticatedUser();

        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(),
            'name' => 'Main Warehouse',
            'code' => 'WH01',
            'is_active' => true,
        ]);

        $rawMaterial = ProductModel::create([
            'id' => Str::uuid(),
            'name' => 'Raw Bolt', 'name_ar' => 'Raw Bolt', 'name_en' => 'Raw Bolt',
            'sku' => 'RAW-1',
            'barcode' => '111',
            'type' => 'standard',
            'cost_price' => 10,
            'price' => 20,
            'is_active' => true,
        ]);

        $finishedProduct = ProductModel::create([
            'id' => Str::uuid(),
            'name' => 'Finished Kit', 'name_ar' => 'Finished Kit', 'name_en' => 'Finished Kit',
            'sku' => 'FIN-1',
            'barcode' => '222',
            'type' => 'standard',
            'cost_price' => 0,
            'price' => 100,
            'is_active' => true,
        ]);

        WarehouseProductModel::create([
            'id' => Str::uuid(),
            'warehouse_id' => $warehouse->id,
            'product_id' => $rawMaterial->id,
            'quantity' => 100,
            'average_cost' => 10,
        ]);

        $bomResponse = $this->postJson("/api/inventory/assembly/{$finishedProduct->id}", [
            'components' => [
                ['child_product_id' => $rawMaterial->id, 'quantity_required' => 3],
            ],
        ]);
        $bomResponse->assertStatus(200);

        $assembleResponse = $this->postJson('/api/inventory/assemble', [
            'product_id' => $finishedProduct->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 5,
            'type' => 'assemble',
        ]);

        if ($assembleResponse->status() !== 201) {
            dump($assembleResponse->json());
        }
        $assembleResponse->assertStatus(201);

        // Raw material consumed: 100 - (3 * 5) = 85
        $this->assertDatabaseHas('warehouse_products', [
            'warehouse_id' => $warehouse->id,
            'product_id' => $rawMaterial->id,
            'quantity' => 85,
        ]);

        // Finished good produced: 5 units
        $this->assertDatabaseHas('warehouse_products', [
            'warehouse_id' => $warehouse->id,
            'product_id' => $finishedProduct->id,
            'quantity' => 5,
        ]);

        // Journal entry transferring cost from raw materials to finished goods inventory
        $entry = JournalEntryModel::query()->where('reference_type', 'assembly')->latest('created_at')->first();
        $this->assertNotNull($entry);
        $this->assertTrue((bool) $entry->is_posted);

        $totalDebit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('debit');
        $totalCredit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('credit');
        $this->assertEquals(round((float) $totalDebit, 2), round((float) $totalCredit, 2));
        // Cost transferred = 3 components * 5 qty * 10 cost = 150
        $this->assertEquals(150.0, round((float) $totalDebit, 2));
    }
}
