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
 * يثبت أن UpdateInvoiceUseCase عند status=confirmed يفوّض لـ ConfirmInvoiceUseCase
 * بدون تكرار خصم المخزون أو القيود، وبقيد متوازن.
 */
class UpdateInvoiceConfirmDelegationTest extends TestCase
{
    public function test_updating_a_draft_to_confirmed_deducts_stock_exactly_once_and_posts_one_balanced_entry(): void
    {
        // ── Arrange ──
        $this->actingAsAuthenticatedUser();

        $warehouse = WarehouseModel::create([
            'id'        => Str::uuid(),
            'name'      => 'Test Warehouse',
            'code'      => 'TW-' . Str::random(4),
            'is_active' => true,
        ]);

        $product = ProductModel::create([
            'id'         => Str::uuid(),
            'name'       => 'Test Product',
            'name_ar'    => 'منتج اختبار',
            'sku'        => 'SKU-' . Str::random(6),
            'barcode'    => (string) random_int(100000000, 999999999),
            'cost_price' => 50,
            'sell_price' => 100,
            'is_active'  => true,
        ]);

        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id,
            'product_id'   => $product->id,
            'quantity'     => 10,
            'average_cost' => 50,
        ]);

        // Create a DRAFT invoice — no stock deduction at this stage
        $draftResponse = $this->postJson('/api/sales/invoices', [
            'warehouse_id' => $warehouse->id,
            'type'         => 'cash',
            'status'       => 'draft',
            'items'        => [
                ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'vat_rate' => 15],
            ],
        ]);
        $draftResponse->assertStatus(201);
        $invoiceId = $draftResponse->json('data.id');

        $stockBefore = (float) DB::connection('tenant')->table('warehouse_products')
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->value('quantity');

        // ── Act: update the draft to confirmed, changing quantity to 3 ──
        $response = $this->putJson("/api/sales/invoices/{$invoiceId}", [
            'warehouse_id' => $warehouse->id,
            'type'         => 'cash',
            'status'       => 'confirmed',
            'items'        => [
                ['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 100, 'vat_rate' => 15],
            ],
        ]);

        // ── Assert ──
        $response->assertOk();

        // (أ) المخزون نقص بـ 3 بالظبط — مش 6 (إثبات عدم التكرار)
        $stockAfter = (float) DB::connection('tenant')->table('warehouse_products')
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->value('quantity');
        $this->assertEqualsWithDelta($stockBefore - 3, $stockAfter, 0.001,
            'المخزون لازم ينقص 3 فقط — لو نقص 6 يبقى فيه خصم مزدوج');

        // (ب) الفاتورة بقت confirmed
        $this->assertSame('confirmed', DB::connection('tenant')->table('invoices')
            ->where('id', $invoiceId)->value('status'));

        // (ج) قيد محاسبي واحد فقط للفاتورة (مش اتنين)
        $entryCount = DB::connection('tenant')->table('journal_entries')
            ->where('reference_type', 'invoice')->where('reference_id', $invoiceId)->count();
        $this->assertSame(1, $entryCount, 'لازم قيد واحد فقط — وجود قيدين دليل على تكرار المنطق');

        // (د) القيد متوازن: مجموع المدين = مجموع الدائن
        $entryId = DB::connection('tenant')->table('journal_entries')
            ->where('reference_type', 'invoice')->where('reference_id', $invoiceId)->value('id');
        $sums = DB::connection('tenant')->table('journal_entry_lines')
            ->where('journal_entry_id', $entryId)
            ->selectRaw('COALESCE(SUM(debit),0) as d, COALESCE(SUM(credit),0) as c')->first();
        $this->assertEqualsWithDelta((float) $sums->d, (float) $sums->c, 0.001,
            'القيد لازم يكون متوازن (مدين = دائن)');

        // (هـ) القيد يحتوي سطر COGS وسطر Inventory (إثبات استخدام منطق Confirm الكامل، مش الـ stub القديم)
        $lineCount = DB::connection('tenant')->table('journal_entry_lines')
            ->where('journal_entry_id', $entryId)->count();
        $this->assertGreaterThanOrEqual(4, $lineCount,
            'لازم على الأقل: نقدية/مدينون + إيراد + ضريبة + COGS + مخزون');
    }
}
