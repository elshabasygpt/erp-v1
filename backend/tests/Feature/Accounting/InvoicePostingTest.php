<?php

declare(strict_types=1);

namespace Tests\Feature\Accounting;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Proves that confirming a real sales invoice through the actual HTTP/use-case
 * path produces a balanced, posted journal entry.
 *
 * (This used to hand-build balanced journal lines and assert they were balanced —
 * a tautology that exercised none of the production posting code. It now drives
 * the real `POST /api/sales/invoices` confirm path instead.)
 */
class InvoicePostingTest extends TestCase
{
    public function test_invoice_posting_is_balanced(): void
    {
        $this->actingAsAuthenticatedUser();

        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(), 'name' => 'Main WH', 'code' => 'WH-POST', 'is_active' => true,
        ]);
        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Brake Disc', 'name_ar' => 'قرص فرامل',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 60, 'sell_price' => 100, 'is_active' => true,
        ]);
        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id, 'product_id' => $product->id, 'quantity' => 10, 'average_cost' => 60,
        ]);

        $response = $this->postJson('/api/sales/invoices', [
            'type' => 'cash',
            'status' => 'confirmed',
            'warehouse_id' => $warehouse->id,
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 2,
                'unit_price' => 100,
                'tax_rate' => 15,
            ]],
        ]);
        $response->assertStatus(201);
        $invoiceId = $response->json('data.id');

        // A posted journal entry exists for this invoice.
        $entry = DB::connection('tenant')->table('journal_entries')
            ->where('reference_id', $invoiceId)
            ->where('is_posted', true)
            ->first();
        $this->assertNotNull($entry, 'Confirming an invoice must post a journal entry.');

        // The entry has real lines and SUM(debit) == SUM(credit) > 0.
        $totals = DB::connection('tenant')->selectOne(
            'SELECT COUNT(*) AS n, COALESCE(SUM(debit),0) AS d, COALESCE(SUM(credit),0) AS c
             FROM journal_entry_lines WHERE journal_entry_id = ?',
            [$entry->id]
        );

        $this->assertGreaterThanOrEqual(2, (int) $totals->n, 'A balanced entry needs at least two lines.');
        $this->assertGreaterThan(0, (float) $totals->d, 'The entry must actually move money.');
        $this->assertEqualsWithDelta((float) $totals->d, (float) $totals->c, 0.001, 'SUM(debit) must equal SUM(credit).');
    }
}
