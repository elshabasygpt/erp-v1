<?php

declare(strict_types=1);

namespace Tests\Feature\Sales;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Store/update parity: fields that the create path accepts and persists
 * (notes, payment_method, per-line printed_name) must survive an edit of a
 * draft too — otherwise editing silently reverts/loses them. Also asserts the
 * edited draft still confirms into a balanced journal (accounting-neutral).
 */
class InvoiceUpdateParityTest extends TestCase
{
    private function makeWarehouseAndProduct(): array
    {
        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(), 'name' => 'Main WH', 'code' => 'WH-UP-'.Str::random(4), 'is_active' => true,
        ]);
        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Air Filter', 'name_ar' => 'فلتر هواء',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 30, 'sell_price' => 80, 'is_active' => true,
        ]);
        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id, 'product_id' => $product->id,
            'quantity' => 100, 'average_cost' => 30,
        ]);

        return [$warehouse, $product];
    }

    public function test_editing_a_draft_persists_notes_payment_method_and_printed_name(): void
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();

        // Create a draft with the original values.
        $created = $this->postJson('/api/sales/invoices', [
            'type' => 'cash',
            'status' => 'draft',
            'warehouse_id' => $warehouse->id,
            'notes' => 'Original note',
            'payment_method' => 'cash',
            'items' => [[
                'product_id' => $product->id, 'quantity' => 2, 'unit_price' => 80,
                'vat_rate' => 15, 'printed_name' => 'Alias-A',
            ]],
        ]);
        $created->assertStatus(201);
        $invoiceId = $created->json('data.id');

        // Edit the draft, changing all three fields.
        $updated = $this->putJson("/api/sales/invoices/{$invoiceId}", [
            'type' => 'cash',
            'status' => 'draft',
            'warehouse_id' => $warehouse->id,
            'notes' => 'Edited note',
            'payment_method' => 'card',
            'items' => [[
                'product_id' => $product->id, 'quantity' => 2, 'unit_price' => 80,
                'vat_rate' => 15, 'printed_name' => 'Alias-B',
            ]],
        ]);
        $updated->assertStatus(200);

        // All three edited values must be persisted (not silently dropped).
        $invoice = DB::connection('tenant')->table('invoices')->where('id', $invoiceId)->first();
        $this->assertSame('Edited note', $invoice->notes);
        $this->assertSame('card', $invoice->payment_method);

        // invoice_items are soft-deleted on edit (BaseModel) then re-created, so a
        // raw query must exclude the old soft-deleted row to read the live value.
        $printedName = DB::connection('tenant')->table('invoice_items')
            ->where('invoice_id', $invoiceId)->whereNull('deleted_at')->value('printed_name');
        $this->assertSame('Alias-B', $printedName);
    }

    public function test_confirming_an_edited_draft_still_posts_a_balanced_journal(): void
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();

        $created = $this->postJson('/api/sales/invoices', [
            'type' => 'cash', 'status' => 'draft', 'warehouse_id' => $warehouse->id,
            'payment_method' => 'cash',
            'items' => [['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 80, 'vat_rate' => 15]],
        ]);
        $invoiceId = $created->json('data.id');

        $this->putJson("/api/sales/invoices/{$invoiceId}", [
            'type' => 'cash', 'status' => 'draft', 'warehouse_id' => $warehouse->id,
            'payment_method' => 'card',
            'items' => [['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 80, 'vat_rate' => 15]],
        ])->assertStatus(200);

        $this->putJson("/api/sales/invoices/{$invoiceId}/status", ['status' => 'confirmed'])->assertStatus(200);

        $entry = DB::connection('tenant')->table('journal_entries')
            ->where('reference_type', 'invoice')->where('reference_id', $invoiceId)->first();
        $this->assertNotNull($entry, 'confirming an edited draft must post a journal entry');

        $sums = DB::connection('tenant')->selectOne(
            'SELECT SUM(debit) AS d, SUM(credit) AS c FROM journal_entry_lines WHERE journal_entry_id = ?',
            [$entry->id]
        );
        $this->assertGreaterThan(0, (float) $sums->d);
        $this->assertEqualsWithDelta((float) $sums->d, (float) $sums->c, 0.001, 'SUM(debit) must equal SUM(credit)');
    }
}
