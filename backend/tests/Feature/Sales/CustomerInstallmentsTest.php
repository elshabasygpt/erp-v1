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
