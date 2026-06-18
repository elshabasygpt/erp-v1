<?php

namespace Tests\Unit;

use App\Application\Accounting\Services\ExchangeRateService;
use App\Application\Sales\UseCases\CollectPaymentUseCase;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FXGainLossService;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\CustomerPaymentModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class CollectPaymentUseCaseTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsAuthenticatedUser();
    }

    public function test_it_collects_payment_and_creates_journal_entry()
    {
        // 1. Setup mock repository
        $journalRepo = $this->createMock(JournalEntryRepositoryInterface::class);
        $journalRepo->method('getNextEntryNumber')->willReturn('JE-001');
        $dummyEntry = new JournalEntry(
            id: 'test-id',
            entryNumber: 'JE-001',
            date: new \DateTimeImmutable,
            description: 'Test'
        );
        $journalRepo->expects($this->once())->method('create')->willReturn($dummyEntry);

        $accountMapping = $this->createMock(AccountMappingService::class);
        $accountMapping->method('resolve')->willReturn('a209c905-6c86-45d4-bde3-721604c4e5b5');

        $exchangeRate = $this->createMock(ExchangeRateService::class);
        $exchangeRate->method('getRate')->willReturn(1.0);

        $fxGainLoss = $this->createMock(FXGainLossService::class);
        $fxGainLoss->method('calculateAndGenerateLines')->willReturn(['fx_amount' => 0, 'lines' => []]);

        $useCase = new CollectPaymentUseCase($journalRepo, $accountMapping, $exchangeRate, $fxGainLoss);

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
                ],
            ],
        ];
        $payment = $useCase->execute('00000000-0000-0000-0000-000000000001', $data, Str::uuid()->toString());

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
