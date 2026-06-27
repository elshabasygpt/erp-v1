<?php

namespace Tests\Feature\Sales;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class InvoicePrintedNameTest extends TestCase
{
    private function makeWarehouseAndProduct(): array
    {
        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(),
            'name' => 'Main Warehouse',
            'code' => 'WH01',
            'is_active' => true,
        ]);

        $product = ProductModel::create([
            'id' => Str::uuid(),
            'name' => 'Front Brake Pad A4', 'name_ar' => 'تيل فرامل أمامي A4',
            'sku' => 'SKU-'.Str::random(6),
            'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 50,
            'sell_price' => 100,
            'is_active' => true,
        ]);

        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'quantity' => 10,
            'average_cost' => 50,
        ]);

        return [$warehouse, $product];
    }

    private function invoicePayload($warehouse, $product, ?string $printedName): array
    {
        return [
            'type' => 'cash',
            'status' => 'confirmed',
            'warehouse_id' => $warehouse->id,
            'items' => [[
                'product_id' => $product->id,
                'printed_name' => $printedName,
                'quantity' => 2,
                'unit_price' => 100,
                'tax_rate' => 15,
            ]],
            'notes' => 'Printed name test invoice',
        ];
    }

    public function test_printed_name_round_trips_through_creation_and_read()
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();

        $response = $this->postJson('/api/sales/invoices', $this->invoicePayload($warehouse, $product, 'Brake Pad A4'));
        $response->assertStatus(201);

        $invoiceId = $response->json('data.id');

        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoiceId,
            'product_id' => $product->id,
            'printed_name' => 'Brake Pad A4',
        ]);

        $show = $this->getJson("/api/sales/invoices/{$invoiceId}");
        $show->assertStatus(200);
        $this->assertEquals('Brake Pad A4', $show->json('data.items.0.printed_name'));
    }

    public function test_printed_name_has_no_effect_on_inventory_or_accounting()
    {
        $this->actingAsAuthenticatedUser();

        // Invoice A: no printed_name (official name used for printing)
        [$warehouseA, $productA] = $this->makeWarehouseAndProduct();
        $responseA = $this->postJson('/api/sales/invoices', $this->invoicePayload($warehouseA, $productA, null));
        $responseA->assertStatus(201);

        // Invoice B: same shape, but with a printed_name override
        [$warehouseB, $productB] = $this->makeWarehouseAndProduct();
        $responseB = $this->postJson('/api/sales/invoices', $this->invoicePayload($warehouseB, $productB, 'Brake Pad A4'));
        $responseB->assertStatus(201);

        // Stock deduction is identical regardless of printed_name.
        $this->assertDatabaseHas('warehouse_products', [
            'warehouse_id' => $warehouseA->id, 'product_id' => $productA->id, 'quantity' => 8,
        ]);
        $this->assertDatabaseHas('warehouse_products', [
            'warehouse_id' => $warehouseB->id, 'product_id' => $productB->id, 'quantity' => 8,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $productA->id, 'warehouse_id' => $warehouseA->id, 'type' => 'out', 'quantity' => 2,
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $productB->id, 'warehouse_id' => $warehouseB->id, 'type' => 'out', 'quantity' => 2,
        ]);

        // Journal entries are posted and balanced (debit = credit) for both,
        // independent of whether a printed_name was supplied.
        $entryA = \DB::connection('tenant')->table('journal_entries')->where('reference_id', $responseA->json('data.id'))->first();
        $entryB = \DB::connection('tenant')->table('journal_entries')->where('reference_id', $responseB->json('data.id'))->first();

        $this->assertNotNull($entryA);
        $this->assertNotNull($entryB);

        foreach ([$entryA, $entryB] as $entry) {
            $totals = \DB::connection('tenant')->table('journal_entry_lines')
                ->where('journal_entry_id', $entry->id)
                ->selectRaw('SUM(debit) as total_debit, SUM(credit) as total_credit')
                ->first();

            $this->assertEquals((float) $totals->total_debit, (float) $totals->total_credit);
        }
    }
}
