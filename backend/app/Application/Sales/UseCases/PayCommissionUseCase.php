<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use App\Application\Accounting\Services\ExchangeRateService;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Infrastructure\Eloquent\Models\CommissionPayoutModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * PayCommissionUseCase
 *
 * Settles previously-accrued sales commission (see the commission accrual
 * block in ConfirmInvoiceUseCase) for one salesperson across a set of
 * invoices: marks those invoices as paid, optionally withdraws the amount
 * from a safe, and posts the settling journal entry (debit commission
 * payable, credit cash/bank) — the mirror of the accrual entry.
 */
class PayCommissionUseCase
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountMappingService $accountMapping,
        private readonly ExchangeRateService $exchangeRateService,
    ) {}

    public function execute(string $tenantId, string $salespersonId, array $invoiceIds, ?string $safeId, string $userId): CommissionPayoutModel
    {
        return DB::connection('tenant')->transaction(function () use ($tenantId, $salespersonId, $invoiceIds, $safeId, $userId) {
            $invoices = InvoiceModel::query()
                ->whereIn('id', $invoiceIds)
                ->where('salesperson_id', $salespersonId)
                ->whereNull('commission_paid_at')
                ->where('commission_amount', '>', 0)
                ->lockForUpdate()
                ->get();

            if ($invoices->isEmpty()) {
                throw new \DomainException('No unpaid commission found for the given invoices.');
            }

            $totalAmount = round((float) $invoices->sum('commission_amount'), 2);

            $payout = CommissionPayoutModel::create([
                'salesperson_id' => $salespersonId,
                'total_amount' => $totalAmount,
                'payout_date' => now()->toDateString(),
                'safe_id' => $safeId,
                'created_by' => $userId,
            ]);

            InvoiceModel::query()->whereIn('id', $invoices->pluck('id'))->update([
                'commission_paid_at' => now(),
                'commission_payout_id' => $payout->id,
            ]);

            if ($safeId) {
                $safe = SafeModel::query()->lockForUpdate()->find($safeId);

                if ($safe) {
                    if ((float) $safe->balance < $totalAmount) {
                        throw new \DomainException('Insufficient safe balance to pay this commission.');
                    }

                    $safe->balance -= $totalAmount;
                    $safe->save();

                    SafeTransactionModel::query()->create([
                        'id' => Str::uuid()->toString(),
                        'safe_id' => $safe->id,
                        'type' => 'withdrawal',
                        'amount' => $totalAmount,
                        'description' => 'Commission payout for salesperson',
                        'reference_type' => 'commission_payout',
                        'reference_id' => $payout->id,
                        'created_by' => $userId,
                        'transaction_date' => now(),
                    ]);
                }
            }

            $baseCurrency = $this->exchangeRateService->getBaseCurrency($tenantId);
            $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

            $journalEntry = new JournalEntry(
                id: null,
                entryNumber: $entryNumber,
                date: new \DateTimeImmutable,
                description: 'Commission payout: '.$payout->id,
                transactionCurrencyId: $baseCurrency->id,
                exchangeRate: 1.0,
                isPosted: false,
                referenceType: 'commission_payout',
                referenceId: $payout->id,
                createdBy: $userId,
            );

            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('commission_payable'),
                debit: $totalAmount,
                credit: 0,
                transactionDebit: $totalAmount,
                transactionCredit: 0.0,
                description: 'Clear accrued commission payable',
            ));

            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve($safeId ? 'cash' : 'bank'),
                debit: 0,
                credit: $totalAmount,
                transactionDebit: 0.0,
                transactionCredit: $totalAmount,
                description: 'Commission payout disbursed',
            ));

            $journalEntry->post();
            $this->journalEntryRepository->create($journalEntry);

            return $payout;
        });
    }
}
