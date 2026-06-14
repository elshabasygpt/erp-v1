<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Application\Sales\UseCases\CollectPaymentUseCase;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\CustomerPaymentModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

class CollectPaymentUseCaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_collects_payment_and_creates_journal_entry()
    {
        // 1. Setup mock repository
        $journalRepo = $this->createMock(JournalEntryRepositoryInterface::class);
        $journalRepo->method('getNextEntryNumber')->willReturn('JE-001');
        $journalRepo->expects($this->once())->method('save');

        $useCase = new CollectPaymentUseCase($journalRepo);

        // 2. Setup Data
        $customer = CustomerModel::create([
            'name' => 'Test Customer',
            'balance' => 1000,
            'credit_limit' => 5000,
        ]);

        $invoice = InvoiceModel::create([
            'id' => Str::uuid()->toString(),
            'invoice_number' => 'INV-001',
            'customer_id' => $customer->id,
            'type' => 'credit',
            'subtotal' => 1000,
            'total' => 1000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'paid_amount' => 0,
        ]);

        // 3. Execute
        $data = [
            'customer_id' => $customer->id,
            'payment_date' => '2026-05-23',
            'amount' => 500,
            'payment_method' => 'bank_transfer',
            'allocations' => [
                [
                    'invoice_id' => $invoice->id,
                    'amount' => 500,
                ]
            ]
        ];

        $payment = $useCase->execute($data, Str::uuid()->toString());

        // 4. Assertions
        $this->assertInstanceOf(CustomerPaymentModel::class, $payment);
        $this->assertEquals(500, $payment->amount);
        $this->assertEquals('bank_transfer', $payment->payment_method);

        $invoice->refresh();
        $this->assertEquals(500, $invoice->paid_amount);
        $this->assertEquals('partially_paid', $invoice->payment_status);

        $customer->refresh();
        $this->assertEquals(500, $customer->balance);
    }
}
