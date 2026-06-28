<?php

declare(strict_types=1);

namespace Tests\Feature\Sales;

use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Customer-side installment plan (mirrors the purchases side). It is pure
 * schedule data — no journal entry — so it must equal the invoice's outstanding
 * amount and must not be regenerated once a payment has landed on it.
 */
class CustomerInstallmentsTest extends TestCase
{
    private function creditInvoice(float $total): string
    {
        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(), 'name' => 'WH', 'code' => 'WH-INST-'.Str::random(4), 'is_active' => true,
        ]);
        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Part', 'name_ar' => 'قطعة',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 10, 'sell_price' => $total, 'is_active' => true,
        ]);
        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id, 'product_id' => $product->id, 'quantity' => 100, 'average_cost' => 10,
        ]);
        $customer = CustomerModel::create([
            'id' => Str::uuid(), 'name' => 'Installment Customer', 'balance' => 0, 'credit_limit' => 0, 'is_active' => true,
        ]);

        $created = $this->postJson('/api/sales/invoices', [
            'type' => 'credit',
            'status' => 'draft',
            'warehouse_id' => $warehouse->id,
            'customer_id' => $customer->id,
            'paid_amount' => 0,
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => $total, 'vat_rate' => 0]],
        ]);
        $created->assertStatus(201);

        return $created->json('data.id');
    }

    public function test_save_and_retrieve_a_matching_installment_plan(): void
    {
        $this->actingAsAuthenticatedUser();
        $invoiceId = $this->creditInvoice(1000);

        $save = $this->postJson("/api/sales/invoices/{$invoiceId}/installments", [
            'installments' => [
                ['due_date' => '2026-09-01', 'amount' => 400],
                ['due_date' => '2026-08-01', 'amount' => 600],
            ],
        ]);
        $save->assertStatus(201);

        $get = $this->getJson("/api/sales/invoices/{$invoiceId}/installments");
        $get->assertStatus(200);
        $plan = $get->json('data');
        $this->assertCount(2, $plan);
        // ordered by due_date — August before September
        $this->assertSame('600.00', (string) $plan[0]['amount']);
    }

    public function test_plan_total_must_equal_the_outstanding_amount(): void
    {
        $this->actingAsAuthenticatedUser();
        $invoiceId = $this->creditInvoice(1000);

        $this->postJson("/api/sales/invoices/{$invoiceId}/installments", [
            'installments' => [['due_date' => '2026-08-01', 'amount' => 500]],
        ])->assertStatus(422);

        $this->assertSame(0, DB::connection('tenant')->table('invoice_installments')
            ->where('invoice_id', $invoiceId)->whereNull('deleted_at')->count());
    }

    public function test_collecting_a_payment_pays_down_installments_oldest_first(): void
    {
        $this->actingAsAuthenticatedUser();
        $invoiceId = $this->creditInvoice(1000);
        $customerId = DB::connection('tenant')->table('invoices')->where('id', $invoiceId)->value('customer_id');

        // Plan: 600 due Aug, 400 due Sep (saved out of order on purpose).
        $this->postJson("/api/sales/invoices/{$invoiceId}/installments", [
            'installments' => [
                ['due_date' => '2026-09-01', 'amount' => 400],
                ['due_date' => '2026-08-01', 'amount' => 600],
            ],
        ])->assertStatus(201);

        // Pay 600 → the earliest (Aug) installment is fully paid, the later one untouched.
        $this->postJson('/api/crm/receivables/collect', [
            'customer_id' => $customerId,
            'payment_date' => '2026-08-05',
            'amount' => 600,
            'payment_method' => 'cash',
            'allocations' => [['invoice_id' => $invoiceId, 'amount' => 600]],
        ])->assertStatus(201);

        $rows = DB::connection('tenant')->table('invoice_installments')
            ->where('invoice_id', $invoiceId)->orderBy('due_date')->get();

        $this->assertSame('paid', $rows[0]->status);
        $this->assertEquals(600.0, (float) $rows[0]->paid_amount);
        $this->assertSame('unpaid', $rows[1]->status);
        $this->assertEquals(0.0, (float) $rows[1]->paid_amount);

        // Pay the remaining 400 → the later (Sep) installment is now paid too.
        $this->postJson('/api/crm/receivables/collect', [
            'customer_id' => $customerId,
            'payment_date' => '2026-09-05',
            'amount' => 400,
            'payment_method' => 'cash',
            'allocations' => [['invoice_id' => $invoiceId, 'amount' => 400]],
        ])->assertStatus(201);

        $later = DB::connection('tenant')->table('invoice_installments')
            ->where('invoice_id', $invoiceId)->orderBy('due_date')->get()[1];
        $this->assertSame('paid', $later->status);
        $this->assertEquals(400.0, (float) $later->paid_amount);
    }

    public function test_cannot_regenerate_a_plan_once_an_installment_is_paid(): void
    {
        $this->actingAsAuthenticatedUser();
        $invoiceId = $this->creditInvoice(1000);

        $this->postJson("/api/sales/invoices/{$invoiceId}/installments", [
            'installments' => [['due_date' => '2026-08-01', 'amount' => 1000]],
        ])->assertStatus(201);

        // Simulate a payment landing on the installment.
        DB::connection('tenant')->table('invoice_installments')
            ->where('invoice_id', $invoiceId)->update(['paid_amount' => 250, 'status' => 'partially_paid']);

        $this->postJson("/api/sales/invoices/{$invoiceId}/installments", [
            'installments' => [
                ['due_date' => '2026-08-01', 'amount' => 500],
                ['due_date' => '2026-09-01', 'amount' => 500],
            ],
        ])->assertStatus(422);
    }
}
