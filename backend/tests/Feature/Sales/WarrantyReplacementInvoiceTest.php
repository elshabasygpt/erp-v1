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
 * يثبت أن حل مطالبة استبدال يُنشئ فاتورة استبدال بسعر صفر، يخصم المخزون مرة واحدة،
 * ويربط replacement_invoice_id بشكل idempotent.
 */
class WarrantyReplacementInvoiceTest extends TestCase
{
    public function test_resolving_a_replacement_claim_auto_creates_a_zero_price_invoice_and_deducts_stock_once(): void
    {
        // ── Arrange ──
        $this->actingAsAuthenticatedUser();

        $warehouse = WarehouseModel::create([
            'id'       => Str::uuid(),
            'name'     => 'Warranty Test WH',
            'code'     => 'WH-WRN-01',
            'is_active' => true,
        ]);

        // warranty_months = 0 → ConfirmInvoiceUseCase won't auto-create a second warranty
        $product = ProductModel::create([
            'id'             => Str::uuid(),
            'name'           => 'Replacement Widget',
            'name_ar'        => 'قطعة استبدال',
            'sku'            => 'SKU-WRN-' . Str::random(6),
            'barcode'        => (string) random_int(100000000, 999999999),
            'cost_price'     => 50,
            'sell_price'     => 100,
            'warranty_months' => 0,
            'is_active'      => true,
        ]);

        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id,
            'product_id'   => $product->id,
            'quantity'     => 5,
            'average_cost' => 50,
        ]);

        // customer (no tenant_id on this table)
        $customerId = Str::uuid();
        DB::connection('tenant')->table('customers')->insert([
            'id'         => $customerId,
            'name'       => 'Warranty Customer',
            'balance'    => 0,
            'is_active'  => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // original invoice that produced the warranty (FK for warehouse_id on the replacement invoice)
        $originalInvoiceId = Str::uuid();
        DB::connection('tenant')->table('invoices')->insert([
            'id'             => $originalInvoiceId,
            'invoice_number' => 'INV-WRN-TEST-001',
            'customer_id'    => $customerId,
            'type'           => 'cash',
            'status'         => 'confirmed',
            'warehouse_id'   => $warehouse->id,
            'subtotal'       => 100,
            'vat_amount'     => 0,
            'discount_amount' => 0,
            'total'          => 100,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        // warranty record
        $warrantyId = Str::uuid();
        DB::connection('tenant')->table('warranties')->insert([
            'id'              => $warrantyId,
            'tenant_id'       => '00000000-0000-0000-0000-000000000001',
            'warranty_number' => 'WRN-TEST-000001',
            'invoice_id'      => $originalInvoiceId,
            'product_id'      => $product->id,
            'customer_id'     => $customerId,
            'quantity'        => 1.00,
            'sale_date'       => now()->toDateString(),
            'warranty_months' => 12,
            'expiry_date'     => now()->addMonths(12)->toDateString(),
            'status'          => 'claimed',
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // warranty claim — replacement type, not yet resolved
        $claimId = Str::uuid();
        DB::connection('tenant')->table('warranty_claims')->insert([
            'id'           => $claimId,
            'tenant_id'    => '00000000-0000-0000-0000-000000000001',
            'claim_number' => 'CLM-TEST-000001',
            'warranty_id'  => $warrantyId,
            'claim_type'   => 'replacement',
            'complaint'    => 'Product stopped working after one week',
            'status'       => 'in_progress',
            'claim_date'   => now()->toDateString(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        $stockBefore = (float) DB::connection('tenant')->table('warehouse_products')
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->value('quantity');

        // ── Act: resolve the claim as a replacement ──
        $response = $this->putJson("/api/sales/warranties/{$warrantyId}/claims/{$claimId}", [
            'status'     => 'resolved',
            'resolution' => 'استبدال القطعة',
        ]);

        // ── Assert ──
        $response->assertOk();

        // (أ) replacement_invoice_id must be populated on the claim
        $replacementInvoiceId = DB::connection('tenant')->table('warranty_claims')
            ->where('id', $claimId)
            ->value('replacement_invoice_id');
        $this->assertNotNull($replacementInvoiceId, 'لازم replacement_invoice_id يتعبّى بعد الحل');

        // (ب) replacement invoice must be confirmed with total = 0
        $invoice = DB::connection('tenant')->table('invoices')
            ->where('id', $replacementInvoiceId)
            ->first();
        $this->assertNotNull($invoice, 'فاتورة الاستبدال مش موجودة في قاعدة البيانات');
        $this->assertSame('confirmed', $invoice->status, 'فاتورة الاستبدال لازم تكون مؤكدة');
        $this->assertEqualsWithDelta(0.0, (float) $invoice->total, 0.001,
            'فاتورة الاستبدال لازم تكون بإجمالي صفر (استبدال مجاني تحت الضمان)');

        // (ج) stock decremented by exactly 1 — not more, not less
        $stockAfter = (float) DB::connection('tenant')->table('warehouse_products')
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->value('quantity');
        $this->assertEqualsWithDelta($stockBefore - 1, $stockAfter, 0.001,
            'المخزون لازم ينقص 1 فقط — خصم مزدوج = bug');

        // (د) idempotent: a second call with status=resolved must NOT create another invoice or deduct more stock
        $this->putJson("/api/sales/warranties/{$warrantyId}/claims/{$claimId}", [
            'status' => 'resolved',
        ])->assertOk();

        $countLinked = DB::connection('tenant')->table('warranty_claims')
            ->where('id', $claimId)
            ->whereNotNull('replacement_invoice_id')
            ->count();
        $this->assertSame(1, $countLinked, 'إعادة الاستدعاء ماتنشئش فاتورة تانية');

        $stockAfterSecond = (float) DB::connection('tenant')->table('warehouse_products')
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->value('quantity');
        $this->assertEqualsWithDelta($stockAfter, $stockAfterSecond, 0.001,
            'إعادة الاستدعاء ماتخصمش مخزون تاني (idempotent)');
    }

    public function test_resolving_replacement_claim_fails_with_422_when_stock_is_insufficient(): void
    {
        $this->actingAsAuthenticatedUser();

        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(), 'name' => 'Empty WH', 'code' => 'WH-EMPTY-01', 'is_active' => true,
        ]);

        $product = ProductModel::create([
            'id'             => Str::uuid(),
            'name'           => 'Out Of Stock Widget',
            'name_ar'        => 'قطعة غير متوفرة',
            'sku'            => 'SKU-OOS-' . Str::random(6),
            'barcode'        => (string) random_int(100000000, 999999999),
            'cost_price'     => 50,
            'sell_price'     => 100,
            'warranty_months' => 0,
            'is_active'      => true,
        ]);

        // stock = 0 — confirmation must fail with insufficient stock
        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id,
            'product_id'   => $product->id,
            'quantity'     => 0,
            'average_cost' => 50,
        ]);

        $customerId = Str::uuid();
        DB::connection('tenant')->table('customers')->insert([
            'id' => $customerId, 'name' => 'Empty Stock Customer',
            'balance' => 0, 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $originalInvoiceId = Str::uuid();
        DB::connection('tenant')->table('invoices')->insert([
            'id'             => $originalInvoiceId,
            'invoice_number' => 'INV-OOS-TEST-001',
            'customer_id'    => $customerId,
            'type'           => 'cash',
            'status'         => 'confirmed',
            'warehouse_id'   => $warehouse->id,
            'subtotal'       => 100,
            'vat_amount'     => 0,
            'discount_amount' => 0,
            'total'          => 100,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        $warrantyId = Str::uuid();
        DB::connection('tenant')->table('warranties')->insert([
            'id'              => $warrantyId,
            'tenant_id'       => '00000000-0000-0000-0000-000000000001',
            'warranty_number' => 'WRN-OOS-000001',
            'invoice_id'      => $originalInvoiceId,
            'product_id'      => $product->id,
            'customer_id'     => $customerId,
            'quantity'        => 1.00,
            'sale_date'       => now()->toDateString(),
            'warranty_months' => 12,
            'expiry_date'     => now()->addMonths(12)->toDateString(),
            'status'          => 'claimed',
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $claimId = Str::uuid();
        DB::connection('tenant')->table('warranty_claims')->insert([
            'id'           => $claimId,
            'tenant_id'    => '00000000-0000-0000-0000-000000000001',
            'claim_number' => 'CLM-OOS-000001',
            'warranty_id'  => $warrantyId,
            'claim_type'   => 'replacement',
            'complaint'    => 'Defective',
            'status'       => 'in_progress',
            'claim_date'   => now()->toDateString(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        $response = $this->putJson("/api/sales/warranties/{$warrantyId}/claims/{$claimId}", [
            'status'     => 'resolved',
            'resolution' => 'استبدال',
        ]);

        // whole transaction must roll back → claim stays unresolved, no replacement invoice
        $response->assertStatus(422);

        $claimStatus = DB::connection('tenant')->table('warranty_claims')
            ->where('id', $claimId)
            ->value('status');
        $this->assertSame('in_progress', $claimStatus,
            'المطالبة لازم تفضل in_progress لو فيه خطأ (rollback)');

        $replacementInvoiceId = DB::connection('tenant')->table('warranty_claims')
            ->where('id', $claimId)
            ->value('replacement_invoice_id');
        $this->assertNull($replacementInvoiceId, 'replacement_invoice_id لازم يفضل null لو فشل المخزون');
    }
}
