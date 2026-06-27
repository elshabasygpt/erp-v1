<?php

namespace Tests\Feature\Sales;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\RoleModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class CommissionPayoutTest extends TestCase
{
    private function makeWarehouseAndProduct(float $cost = 50, float $sell = 100): array
    {
        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(), 'name' => 'Main Warehouse', 'code' => 'WH01', 'is_active' => true,
        ]);
        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Brake Pad', 'name_ar' => 'تيل فرامل',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => $cost, 'sell_price' => $sell, 'is_active' => true,
        ]);
        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id, 'product_id' => $product->id, 'quantity' => 50, 'average_cost' => $cost,
        ]);

        return [$warehouse, $product];
    }

    private function makeSalesperson(float $commissionRate): UserModel
    {
        $admin = $this->actingAsAuthenticatedUser();
        $role = RoleModel::find($admin->role_id);

        return UserModel::factory()->create([
            'tenant_id' => '00000000-0000-0000-0000-000000000001',
            'email' => 'salesperson_'.uniqid().'@example.com',
            'role_id' => $role->id,
            'commission_rate' => $commissionRate,
        ]);
    }

    public function test_commission_is_accrued_on_confirmation_with_a_balanced_journal_entry()
    {
        $salesperson = $this->makeSalesperson(10); // 10%
        [$warehouse, $product] = $this->makeWarehouseAndProduct(cost: 50, sell: 100);

        $response = $this->postJson('/api/sales/invoices', [
            'type' => 'cash',
            'status' => 'confirmed',
            'warehouse_id' => $warehouse->id,
            'salesperson_id' => $salesperson->id,
            'items' => [[
                'product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'vat_rate' => 15,
            ]],
        ]);

        $response->assertStatus(201);
        $invoiceId = $response->json('data.id');

        // Profit = 100 (revenue) - 50 (COGS) = 50; commission = 10% * 50 = 5.
        $this->assertDatabaseHas('invoices', [
            'id' => $invoiceId,
            'commission_amount' => 5,
        ]);

        $entry = \DB::connection('tenant')->table('journal_entries')->where('reference_id', $invoiceId)->first();
        $this->assertNotNull($entry);

        $totals = \DB::connection('tenant')->table('journal_entry_lines')
            ->where('journal_entry_id', $entry->id)
            ->selectRaw('SUM(debit) as total_debit, SUM(credit) as total_credit')
            ->first();

        $this->assertEquals((float) $totals->total_debit, (float) $totals->total_credit);
    }

    public function test_zero_commission_rate_accrues_nothing()
    {
        $salesperson = $this->makeSalesperson(0);
        [$warehouse, $product] = $this->makeWarehouseAndProduct();

        $response = $this->postJson('/api/sales/invoices', [
            'type' => 'cash',
            'status' => 'confirmed',
            'warehouse_id' => $warehouse->id,
            'salesperson_id' => $salesperson->id,
            'items' => [[
                'product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'vat_rate' => 15,
            ]],
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('invoices', ['id' => $response->json('data.id'), 'commission_amount' => 0]);
    }

    public function test_payout_marks_invoices_paid_and_posts_a_balanced_journal_entry()
    {
        $salesperson = $this->makeSalesperson(10);
        [$warehouse, $product] = $this->makeWarehouseAndProduct(cost: 50, sell: 100);

        $invoiceId = $this->postJson('/api/sales/invoices', [
            'type' => 'cash', 'status' => 'confirmed', 'warehouse_id' => $warehouse->id,
            'salesperson_id' => $salesperson->id,
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'vat_rate' => 15]],
        ])->json('data.id');

        $payout = $this->postJson('/api/sales/commissions/payout', [
            'salesperson_id' => $salesperson->id,
            'invoice_ids' => [$invoiceId],
        ]);

        $payout->assertStatus(201);
        $this->assertEquals(5, $payout->json('data.total_amount'));

        $this->assertDatabaseHas('invoices', ['id' => $invoiceId, 'commission_amount' => 5]);
        $this->assertNotNull(\App\Infrastructure\Eloquent\Models\InvoiceModel::find($invoiceId)->commission_paid_at);

        $entry = \DB::connection('tenant')->table('journal_entries')->where('reference_id', $payout->json('data.id'))->first();
        $this->assertNotNull($entry);

        $totals = \DB::connection('tenant')->table('journal_entry_lines')
            ->where('journal_entry_id', $entry->id)
            ->selectRaw('SUM(debit) as total_debit, SUM(credit) as total_credit')
            ->first();
        $this->assertEquals((float) $totals->total_debit, (float) $totals->total_credit);
    }

    public function test_payout_rejects_invoices_with_no_unpaid_commission()
    {
        $salesperson = $this->makeSalesperson(10);
        [$warehouse, $product] = $this->makeWarehouseAndProduct();

        $invoiceId = $this->postJson('/api/sales/invoices', [
            'type' => 'cash', 'status' => 'confirmed', 'warehouse_id' => $warehouse->id,
            'salesperson_id' => $salesperson->id,
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'vat_rate' => 15]],
        ])->json('data.id');

        $this->postJson('/api/sales/commissions/payout', [
            'salesperson_id' => $salesperson->id, 'invoice_ids' => [$invoiceId],
        ])->assertStatus(201);

        // Paying the same invoice again must fail — it's already settled.
        $second = $this->postJson('/api/sales/commissions/payout', [
            'salesperson_id' => $salesperson->id, 'invoice_ids' => [$invoiceId],
        ]);

        $second->assertStatus(422);
    }
}
