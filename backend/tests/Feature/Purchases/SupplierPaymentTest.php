<?php

declare(strict_types=1);

namespace Tests\Feature\Purchases;

use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Records a supplier payment + allocation in one step (CreateSupplierPaymentUseCase,
 * now routed). This touches the accounting core, so it asserts the AP-settlement
 * journal is balanced, the safe is debited, and the allocation row is written.
 */
class SupplierPaymentTest extends TestCase
{
    private function setupSupplierAndInvoice(float $invoiceTotal): array
    {
        $safe = SafeModel::create([
            'id' => Str::uuid(), 'name' => 'Main Cash', 'type' => 'cash', 'balance' => 5000, 'is_active' => true,
        ]);
        $supplier = SupplierModel::create([
            'id' => Str::uuid(), 'name' => 'Parts Supplier', 'balance' => 0, 'is_active' => true,
        ]);
        $invoice = PurchaseInvoiceModel::create([
            'id' => Str::uuid(), 'supplier_id' => $supplier->id, 'invoice_number' => 'PI-'.Str::random(5),
            'invoice_date' => now()->toDateString(), 'subtotal' => $invoiceTotal, 'vat_amount' => 0,
            'total' => $invoiceTotal, 'paid_amount' => 0, 'status' => 'confirmed', 'exchange_rate' => 1,
        ]);

        return [$safe, $supplier, $invoice];
    }

    public function test_recording_a_supplier_payment_allocates_and_posts_a_balanced_journal(): void
    {
        $this->actingAsAuthenticatedUser();
        [$safe, $supplier, $invoice] = $this->setupSupplierAndInvoice(1000);

        $res = $this->postJson("/api/purchases/suppliers/{$supplier->id}/payments", [
            'safe_id' => $safe->id,
            'amount' => 1000,
            'payment_date' => now()->toDateString(),
            'allocations' => [
                ['invoice_id' => $invoice->id, 'amount' => 1000],
            ],
        ]);
        $res->assertStatus(201);
        $paymentId = $res->json('data.id');

        // Payment row + allocation row written.
        $this->assertSame(1, DB::connection('tenant')->table('supplier_payments')->where('id', $paymentId)->count());
        $this->assertSame(1, DB::connection('tenant')->table('supplier_payment_allocations')
            ->where('supplier_payment_id', $paymentId)->where('purchase_invoice_id', $invoice->id)->count());

        // Safe debited.
        $this->assertSame(4000.0, (float) DB::connection('tenant')->table('safes')->where('id', $safe->id)->value('balance'));

        // The AP-settlement journal entry balances.
        $entry = DB::connection('tenant')->table('journal_entries')
            ->where('reference_type', 'supplier_payment')->where('reference_id', $paymentId)->first();
        $this->assertNotNull($entry);
        $sums = DB::connection('tenant')->selectOne(
            'SELECT SUM(debit) AS d, SUM(credit) AS c FROM journal_entry_lines WHERE journal_entry_id = ?',
            [$entry->id]
        );
        $this->assertGreaterThan(0, (float) $sums->d);
        $this->assertEqualsWithDelta((float) $sums->d, (float) $sums->c, 0.001, 'SUM(debit) must equal SUM(credit)');
    }

    public function test_payment_exceeding_safe_balance_is_rejected(): void
    {
        $this->actingAsAuthenticatedUser();
        [$safe, $supplier] = $this->setupSupplierAndInvoice(1000);

        $this->postJson("/api/purchases/suppliers/{$supplier->id}/payments", [
            'safe_id' => $safe->id,
            'amount' => 999999,
        ])->assertStatus(422);

        // Safe untouched.
        $this->assertSame(5000.0, (float) DB::connection('tenant')->table('safes')->where('id', $safe->id)->value('balance'));
    }
}
