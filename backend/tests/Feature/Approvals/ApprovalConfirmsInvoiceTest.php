<?php

declare(strict_types=1);

namespace Tests\Feature\Approvals;

use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Proves the approval-completion fix: approving an invoice's approval request
 * actually CONFIRMS the invoice (single locked stock deduction + one balanced
 * journal entry) instead of leaving it stranded in `pending_approval`. Also
 * proves the whole thing is atomic — a confirm that fails (stock ran out while
 * the invoice waited for approval) rolls the approval back.
 */
class ApprovalConfirmsInvoiceTest extends TestCase
{
    private function makeWarehouseAndProduct(int $stock): array
    {
        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(), 'name' => 'Main WH', 'code' => 'WH-APV-'.Str::random(4), 'is_active' => true,
        ]);

        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Brake Pad', 'name_ar' => 'تيل فرامل',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 50, 'sell_price' => 100, 'is_active' => true,
        ]);

        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id, 'product_id' => $product->id,
            'quantity' => $stock, 'average_cost' => 50,
        ]);

        return [$warehouse, $product];
    }

    /** Create a draft invoice via the API, then move it into pending_approval + queue an approval request. */
    private function pendingApprovalInvoice($warehouse, $product, int $qty, string $userId): array
    {
        $created = $this->postJson('/api/sales/invoices', [
            'type' => 'cash',
            'status' => 'draft',
            'warehouse_id' => $warehouse->id,
            'items' => [[
                'product_id' => $product->id,
                'quantity' => $qty,
                'unit_price' => 100,
                'vat_rate' => 15,
            ]],
        ]);
        $created->assertStatus(201);
        $invoiceId = $created->json('data.id');

        DB::connection('tenant')->table('invoices')->where('id', $invoiceId)
            ->update(['status' => 'pending_approval']);

        $request = ApprovalRequestModel::create([
            'id' => Str::uuid()->toString(),
            'rule_id' => null,
            'entity_type' => 'invoice',
            'entity_id' => $invoiceId,
            'trigger_type' => 'high_discount',
            'status' => 'pending',
            'requested_by' => $userId,
            'notes' => 'awaiting manager approval',
            'payload' => [],
        ]);

        return [$invoiceId, $request->id];
    }

    private function stockOf($product): float
    {
        return (float) DB::connection('tenant')->table('warehouse_products')
            ->where('product_id', $product->id)->value('quantity');
    }

    public function test_approving_confirms_the_invoice_deducting_stock_once_with_a_balanced_journal(): void
    {
        $user = $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct(stock: 50);
        [$invoiceId, $requestId] = $this->pendingApprovalInvoice($warehouse, $product, qty: 2, userId: $user->id);

        // Before approval: nothing has happened yet — no deduction, no journal.
        $this->assertSame(50.0, $this->stockOf($product), 'stock must be untouched while pending approval');
        $this->assertSame(0, DB::connection('tenant')->table('journal_entries')
            ->where('reference_type', 'invoice')->where('reference_id', $invoiceId)->count());

        $response = $this->postJson("/api/approvals/{$requestId}/approve", ['notes' => 'ok']);
        $response->assertStatus(200);

        // Invoice is now actually confirmed.
        $this->assertSame('confirmed', DB::connection('tenant')->table('invoices')->where('id', $invoiceId)->value('status'));
        $this->assertSame('approved', DB::connection('tenant')->table('approval_requests')->where('id', $requestId)->value('status'));

        // Stock deducted EXACTLY once (50 - 2).
        $this->assertSame(48.0, $this->stockOf($product), 'stock must be deducted exactly once on approval-confirm');

        // Exactly one journal entry for this invoice, and it balances.
        $entries = DB::connection('tenant')->table('journal_entries')
            ->where('reference_type', 'invoice')->where('reference_id', $invoiceId)->get();
        $this->assertCount(1, $entries, 'approval-confirm must post exactly one journal entry');

        $sums = DB::connection('tenant')->selectOne(
            'SELECT SUM(debit) AS d, SUM(credit) AS c FROM journal_entry_lines WHERE journal_entry_id = ?',
            [$entries->first()->id]
        );
        $this->assertGreaterThan(0, (float) $sums->d, 'journal must have real amounts');
        $this->assertEqualsWithDelta((float) $sums->d, (float) $sums->c, 0.001, 'SUM(debit) must equal SUM(credit)');
    }

    public function test_approval_rolls_back_entirely_when_stock_is_insufficient_at_confirm_time(): void
    {
        $user = $this->actingAsAuthenticatedUser();
        // Only 1 in stock, but the invoice needs 5 → confirm must fail.
        [$warehouse, $product] = $this->makeWarehouseAndProduct(stock: 1);
        [$invoiceId, $requestId] = $this->pendingApprovalInvoice($warehouse, $product, qty: 5, userId: $user->id);

        $response = $this->postJson("/api/approvals/{$requestId}/approve", ['notes' => 'ok']);
        $response->assertStatus(422);

        // Whole transaction rolled back: request still pending, invoice still
        // pending_approval, stock untouched, no journal entry.
        $this->assertSame('pending', DB::connection('tenant')->table('approval_requests')->where('id', $requestId)->value('status'));
        $this->assertSame('pending_approval', DB::connection('tenant')->table('invoices')->where('id', $invoiceId)->value('status'));
        $this->assertSame(1.0, $this->stockOf($product), 'stock must be untouched after a failed approval');
        $this->assertSame(0, DB::connection('tenant')->table('journal_entries')
            ->where('reference_type', 'invoice')->where('reference_id', $invoiceId)->count());
    }
}
