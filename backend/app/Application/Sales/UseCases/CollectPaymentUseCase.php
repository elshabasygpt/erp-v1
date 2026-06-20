<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use App\Application\Accounting\Services\ExchangeRateService;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FXGainLossService;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\CustomerPaymentModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\PaymentAllocationModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CollectPaymentUseCase
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountMappingService $accountMapping,
        private readonly ExchangeRateService $exchangeRateService,
        private readonly FXGainLossService $fxGainLossService
    ) {}

    public function execute(string $tenantId, array $data, string $userId): CustomerPaymentModel
    {
        return DB::connection('tenant')->transaction(function () use ($tenantId, $data, $userId) {
            $customer = CustomerModel::query()->findOrFail($data['customer_id']);

            // 1. Determine Payment Currency and Exchange Rate
            $currencyId = $data['currency_id'] ?? null;
            $exchangeRate = 1.0;
            if ($currencyId) {
                $exchangeRate = $this->exchangeRateService->getRate($tenantId, $currencyId, $data['payment_date']);
            } else {
                $baseCurrency = $this->exchangeRateService->getBaseCurrency($tenantId);
                $currencyId = $baseCurrency->id;
            }

            // 2. Create Payment Record
            $payment = CustomerPaymentModel::query()->create([
                'id' => Str::uuid()->toString(),
                'reference_number' => 'REC-'.date('YmdHis'),
                'customer_id' => $customer->id,
                'currency_id' => $currencyId,
                'exchange_rate' => $exchangeRate,
                'payment_date' => $data['payment_date'],
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'],
                'bank_name' => $data['bank_name'] ?? null,
                'transaction_id' => $data['transaction_id'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
                'status' => 'completed',
                'cost_center_id' => $data['cost_center_id'] ?? null,
            ]);

            // 3. Process Allocations & FX Gain/Loss
            $remainingAmount = (float) $data['amount'];
            $allocations = $data['allocations'] ?? [];
            $fxGainLoss = 0.0;

            foreach ($allocations as $allocation) {
                $invoice = InvoiceModel::query()->findOrFail($allocation['invoice_id']);
                $allocAmount = (float) $allocation['amount'];

                if ($allocAmount > $remainingAmount) {
                    throw new \DomainException('Allocation amount exceeds available payment amount.');
                }

                if ($allocAmount <= 0) {
                    continue;
                }

                // Create Allocation
                PaymentAllocationModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'payment_id' => $payment->id,
                    'invoice_id' => $invoice->id,
                    'amount' => $allocAmount,
                ]);

                // Calculate FX Difference
                $invoiceRate = (float) $invoice->exchange_rate;
                $fxData = $this->fxGainLossService->calculateAndGenerateLines($invoiceRate, $exchangeRate, $allocAmount, 'ar');
                $fxGainLoss += $fxData['fx_amount'];

                // Update Invoice Paid Amount
                $invoice->paid_amount += $allocAmount;
                $dueAmount = $invoice->total - $invoice->paid_amount;

                if ($dueAmount <= 0) {
                    $invoice->payment_status = 'paid';
                } else {
                    $invoice->payment_status = 'partially_paid';
                }
                $invoice->save();

                $remainingAmount -= $allocAmount;
            }

            // 4. Update Customer Balance
            // If there's an unallocated amount, it acts as a credit to the customer balance.
            // Since customer balance represents how much they owe us (Receivables), a payment reduces the balance.
            $customer->balance -= $data['amount'];
            $customer->save();

            // 5. Deposit into Safe (Treasury)
            $this->depositToSafe($tenantId, $payment, $userId, $data['cost_center_id'] ?? null);

            // 6. Create Accounting Journal Entry
            $this->createAccountingEntry($payment, $userId, $fxGainLoss, $data['cost_center_id'] ?? null);

            return $payment;
        });
    }

    private function depositToSafe(string $tenantId, CustomerPaymentModel $payment, string $userId, ?string $costCenterId): void
    {
        // Try getting the primary safe for current user
        $safeId = DB::table('safe_users')
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->where('is_primary', true)
            ->value('safe_id');

        if (! $safeId) {
            // Fallback: if cash payment, get first cash safe. Else get first bank safe.
            $safeType = $payment->payment_method === 'cash' ? 'cash' : 'bank';
            $safeId = SafeModel::query()->where('tenant_id', $tenantId)->where('type', $safeType)->value('id');
        }

        if ($safeId) {
            $safe = SafeModel::query()->find($safeId);
            if ($safe) {
                $safe->balance += $payment->amount;
                $safe->save();

                SafeTransactionModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'safe_id' => $safe->id,
                    'type' => 'deposit',
                    'amount' => $payment->amount,
                    'exchange_rate' => $payment->exchange_rate,
                    'description' => 'تحصيل دفعة من العميل: '.($payment->customer->name ?? ''),
                    'reference_type' => 'customer_payment',
                    'reference_id' => $payment->id,
                    'transaction_date' => now(),
                    'created_by' => $userId,
                    'cost_center_id' => $costCenterId,
                ]);
            }
        } else {
            \Log::critical("No safe available to deposit payment {$payment->id}");
        }
    }

    private function createAccountingEntry(CustomerPaymentModel $payment, string $userId, float $fxGainLoss, ?string $costCenterId): void
    {
        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        $journalEntry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: new \DateTimeImmutable($payment->payment_date->format('Y-m-d')),
            description: "Customer Payment Receipt: {$payment->reference_number}",
            transactionCurrencyId: $payment->currency_id,
            exchangeRate: (float) $payment->exchange_rate,
            isPosted: true,
            referenceType: 'customer_payment',
            referenceId: $payment->id,
            createdBy: $userId,
        );

        $debitAccountKey = $payment->payment_method === 'cash' ? 'cash' : 'bank';
        $debitAccountId = $this->accountMapping->resolve($debitAccountKey);
        $arAccountId = $this->accountMapping->resolve('ar');

        $baseAmount = round($payment->amount * $payment->exchange_rate, 6);

        // Debit: Cash or Bank
        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $debitAccountId,
            debit: $baseAmount,
            credit: 0,
            transactionDebit: (float) $payment->amount,
            transactionCredit: 0.0,
            description: "Payment received via {$payment->payment_method}",
            costCenterId: $costCenterId,
        ));

        // Credit: Accounts Receivable (AR Base Amount cleared = Base Amount - FX Gain + FX Loss)
        $arCreditBase = $baseAmount - $fxGainLoss;

        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $arAccountId,
            debit: 0,
            credit: round($arCreditBase, 6),
            transactionDebit: 0.0,
            transactionCredit: (float) $payment->amount,
            description: 'Decrease in Accounts Receivable for customer',
            costCenterId: $costCenterId,
        ));

        // FX Gain/Loss
        // Instead of calculating it again, we should pass the generated lines from FXGainLossService.
        // Wait, since we aggregated fxGainLoss across all allocations, we can just call calculateAndGenerateLines
        // with the aggregated amount or reconstruct it. Let's just generate the lines directly for the aggregate.
        if (round($fxGainLoss, 6) != 0.0) {
            // Re-use logic for aggregated fx difference
            $fxData = $this->fxGainLossService->calculateAndGenerateLines(
                0.0, // Invoice Rate (Relative)
                1.0, // Payment Rate (Relative)
                $fxGainLoss, // Amount
                'ar'
            );
            // Actually, calculateAndGenerateLines expects rates.
            // Since we already know the total fxGainLoss, we can just generate the line.
            foreach ($fxData['fx_lines'] as $line) {
                $journalEntry->addLine($line);
            }
        }

        $this->journalEntryRepository->create($journalEntry);
    }
}
