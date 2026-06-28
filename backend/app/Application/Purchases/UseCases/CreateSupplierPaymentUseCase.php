<?php

declare(strict_types=1);

namespace App\Application\Purchases\UseCases;

use App\Application\Accounting\Services\ExchangeRateService;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FXGainLossService;
use App\Domain\Accounting\Services\SupplierPaymentAllocationService;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\SupplierPaymentModel;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreateSupplierPaymentUseCase
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountMappingService $accountMapping,
        private readonly SupplierPaymentAllocationService $allocationService,
        private readonly ExchangeRateService $exchangeRateService,
        private readonly FXGainLossService $fxGainLossService
    ) {}

    /**
     * Creates a supplier payment, allocates it to invoices, and posts the journal entry.
     */
    public function execute(string $tenantId, array $data, string $userId): SupplierPaymentModel
    {
        return DB::connection('tenant')->transaction(function () use ($tenantId, $data, $userId) {
            $safeId = $data['safe_id'];
            $supplierId = $data['supplier_id'];
            $amount = (float) $data['amount'];
            $paymentDate = $data['payment_date'] ?? date('Y-m-d');
            $allocations = $data['allocations'] ?? [];

            // Lock the safe row so the funds check and the decrement below are atomic.
            $safe = SafeModel::query()->where('tenant_id', $tenantId)->lockForUpdate()->find($safeId);
            if (! $safe) {
                throw new DomainException('Safe not found.');
            }

            if ($safe->balance < $amount) {
                throw new DomainException("Insufficient funds in safe '{$safe->name}'.");
            }

            // Multi-Currency Logic
            $currencyId = $safe->currency_id;
            $exchangeRate = 1.0;
            if ($currencyId) {
                $exchangeRate = $this->exchangeRateService->getRate($tenantId, $currencyId, $paymentDate);
            } else {
                $baseCurrency = $this->exchangeRateService->getBaseCurrency($tenantId);
                $currencyId = $baseCurrency->id;
            }

            // Create Payment
            $paymentId = Str::uuid()->toString();
            $payment = SupplierPaymentModel::query()->create([
                'id' => $paymentId,
                'tenant_id' => $tenantId,
                'supplier_id' => $supplierId,
                'currency_id' => $currencyId,
                'exchange_rate' => $exchangeRate,
                'amount' => $amount,
                // Derived from the paying safe — the column is NOT NULL.
                'payment_method' => $safe->type === 'bank' ? 'bank_transfer' : 'cash',
                'payment_date' => $paymentDate,
                'reference' => $data['reference_number'] ?? null,
                'notes' => $data['notes'] ?? null,
                'cost_center_id' => $data['cost_center_id'] ?? null,
            ]);

            // Allocate Payment to Invoices and Calculate FX Differences
            $fxGainLoss = 0.0;
            if (! empty($allocations)) {
                // Use the persisted model id (HasUuids may regenerate the key on create),
                // consistent with the safe-transaction and journal references below.
                $this->allocationService->allocatePayment($payment->id, $allocations);

                foreach ($allocations as $allocation) {
                    $invoice = PurchaseInvoiceModel::query()->find($allocation['invoice_id']);
                    if ($invoice) {
                        $invoiceRate = (float) $invoice->exchange_rate;
                        $allocatedForeign = (float) $allocation['amount'];
                        $fxData = $this->fxGainLossService->calculateAndGenerateLines($invoiceRate, $exchangeRate, $allocatedForeign, 'ap');
                        $fxGainLoss += $fxData['fx_amount'];
                    }
                }
            }

            // Update Safe Balance (Foreign Currency)
            $safe->balance -= $amount;
            $safe->save();

            SafeTransactionModel::query()->create([
                'id' => Str::uuid()->toString(),
                'safe_id' => $safe->id,
                'type' => 'withdrawal',
                'amount' => $amount,
                'exchange_rate' => $exchangeRate,
                'description' => 'Payment to supplier',
                'reference_type' => 'supplier_payment',
                'reference_id' => $payment->id,
                'created_by' => $userId,
                'transaction_date' => $paymentDate,
                'cost_center_id' => $data['cost_center_id'] ?? null,
            ]);

            // Create Journal Entry
            $entryNumber = $this->journalEntryRepository->getNextEntryNumber();
            $journalEntry = new JournalEntry(
                id: null,
                entryNumber: $entryNumber,
                date: new \DateTimeImmutable($paymentDate),
                description: 'Supplier Payment',
                transactionCurrencyId: $currencyId,
                exchangeRate: $exchangeRate,
                isPosted: true,
                referenceType: 'supplier_payment',
                referenceId: $payment->id,
                createdBy: $userId
            );

            // The payment amount in Base Currency
            $baseAmount = round($amount * $exchangeRate, 6);

            // Accounts
            $apAccount = $this->accountMapping->resolve('ap');
            $creditAccountKey = $safe->type === 'bank' ? 'bank' : 'cash';
            $cashAccount = $this->accountMapping->resolve($creditAccountKey);

            // Debit: Accounts Payable (Using the AP Base Amount we are settling)
            // The AP was credited at InvoiceRate, so we must debit it at InvoiceRate to clear it correctly.
            // However, to balance the entry, we can just debit AP at the payment rate, and adjust via FX Gain/Loss.
            // Wait, standard accounting: Debit AP at Payment Rate minus FX difference, or just debit AP at invoice rate.
            // Let's debit AP at (Payment Base Amount - FX Loss + FX Gain) = Invoice Base Amount
            $apDebitBase = $baseAmount - $fxGainLoss;

            // Reduce the supplier's outstanding balance by the AP amount actually settled (base
            // currency), mirroring the increment done on credit purchases in ConfirmPurchaseUseCase.
            // Without this, payables grow on purchase but are never paid down → balance overstated.
            $supplier = SupplierModel::query()->lockForUpdate()->find($supplierId);
            if ($supplier) {
                $supplier->balance -= round($apDebitBase, 2);
                $supplier->save();
            }

            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $apAccount,
                debit: round($apDebitBase, 6),
                credit: 0,
                transactionDebit: round($amount, 6),
                transactionCredit: 0.0,
                description: 'Supplier Payment - AP Settlement',
                costCenterId: $data['cost_center_id'] ?? null,
            ));

            // Credit: Cash or Bank
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $cashAccount,
                debit: 0,
                credit: round($baseAmount, 6),
                transactionDebit: 0.0,
                transactionCredit: round($amount, 6),
                description: "Payment from {$safe->name}"
            ));

            // FX Gain/Loss
            if (round($fxGainLoss, 6) != 0.0) {
                $fxData = $this->fxGainLossService->calculateAndGenerateLines(
                    0.0, // Invoice Rate (Relative)
                    1.0, // Payment Rate (Relative)
                    $fxGainLoss, // Amount
                    'ap'
                );

                foreach ($fxData['fx_lines'] as $line) {
                    $journalEntry->addLine($line);
                }
            }

            $this->journalEntryRepository->create($journalEntry);

            return $payment;
        });
    }
}
