<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\CoreReturns;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use App\Infrastructure\Eloquent\Models\CustomerCoreReturnModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use Illuminate\Support\Facades\DB;

class RefundCustomerCoreReturnUseCase
{
    public function __construct(
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private AccountMappingService $accountMapping,
        private FiscalPeriodService $fiscalPeriodService,
    ) {}

    public function execute(string $coreReturnId, string $tenantId, string $userId, ?string $refundReference = null): void
    {
        DB::connection('tenant')->transaction(function () use ($coreReturnId, $tenantId, $userId, $refundReference) {
            $coreReturn = CustomerCoreReturnModel::query()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($coreReturnId);

            if ($coreReturn->status !== 'received') {
                throw new \DomainException('Only received core returns can be refunded.');
            }

            // 1. Reduce customer AR balance (they owe us less after refund)
            $customer = CustomerModel::query()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($coreReturn->customer_id);

            $customer->balance -= (float) $coreReturn->total_refund_value;
            $customer->save();

            // 2. Validate fiscal period is open
            $this->fiscalPeriodService->validatePostingDate(new \DateTimeImmutable);

            // 3. Create double-entry journal
            $this->createJournalEntry($coreReturn, $userId, $refundReference);

            // 4. Mark as refunded
            $coreReturn->status      = 'refunded';
            $coreReturn->refunded_at = now();
            if ($refundReference) {
                $coreReturn->notes = trim($coreReturn->notes . "\nRefund Reference: " . $refundReference);
            }
            $coreReturn->save();
        });
    }

    private function createJournalEntry(CustomerCoreReturnModel $coreReturn, string $userId, ?string $refundReference): void
    {
        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        $description = "Customer Core Return Refund: {$coreReturn->return_number}"
            . ($refundReference ? " (Ref: {$refundReference})" : '');

        $journalEntry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: new \DateTimeImmutable,
            description: $description,
            transactionCurrencyId: null,
            exchangeRate: 1.0,
            isPosted: false,
            referenceType: 'customer_core_return',
            referenceId: $coreReturn->id,
            createdBy: $userId,
        );

        $amount = round((float) $coreReturn->total_refund_value, 6);

        // Debit: Core Inventory — asset increases (we received the core parts back)
        try {
            $inventoryAccountId = $this->accountMapping->resolve('core_inventory');
        } catch (\Exception) {
            $inventoryAccountId = $this->accountMapping->resolve('inventory');
        }

        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $inventoryAccountId,
            debit: $amount,
            credit: 0,
            transactionDebit: $amount,
            transactionCredit: 0.0,
            description: 'Core Inventory — Customer Core Received',
        ));

        // Credit: Accounts Receivable — asset decreases (customer owes us less)
        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $this->accountMapping->resolve('ar'),
            debit: 0,
            credit: $amount,
            transactionDebit: 0.0,
            transactionCredit: $amount,
            description: 'Core Refund to Customer',
        ));

        $journalEntry->post();
        $this->journalEntryRepository->create($journalEntry);
    }
}
