<?php

declare(strict_types=1);

namespace App\Application\Purchases\UseCases\CoreReturns;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use App\Infrastructure\Eloquent\Models\SupplierCoreReturnModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use Illuminate\Support\Facades\DB;

class CreditCoreReturnUseCase
{
    public function __construct(
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private AccountMappingService $accountMapping,
        private FiscalPeriodService $fiscalPeriodService,
    ) {}

    public function execute(string $coreReturnId, string $tenantId, string $userId, ?string $creditNoteNumber = null): void
    {
        DB::connection('tenant')->transaction(function () use ($coreReturnId, $tenantId, $userId, $creditNoteNumber) {
            $coreReturn = SupplierCoreReturnModel::query()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($coreReturnId);

            if ($coreReturn->status !== 'shipped') {
                throw new \DomainException('Only shipped core returns can be credited.');
            }

            // 1. Update Supplier Balance
            $supplier = SupplierModel::query()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($coreReturn->supplier_id);

            // A core return acts as a supplier credit note (reduces what we owe them, so balance decreases)
            $supplier->balance -= (float) $coreReturn->total_credit_value;
            $supplier->save();

            // 2. Validate Fiscal Period
            $this->fiscalPeriodService->validatePostingDate(new \DateTimeImmutable);

            // 3. Create Double Entry Journal
            $this->createJournalEntry($coreReturn, $userId, $creditNoteNumber);

            // 4. Update status
            $coreReturn->status = 'credited';
            $coreReturn->credited_at = now();
            // In a full implementation, you might create an actual CreditNoteModel record here.
            if ($creditNoteNumber) {
                $coreReturn->notes = trim($coreReturn->notes . "\nSupplier Credit Note: " . $creditNoteNumber);
            }
            $coreReturn->save();
        });
    }

    private function createJournalEntry(SupplierCoreReturnModel $coreReturn, string $userId, ?string $creditNoteNumber): void
    {
        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        $journalEntry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: new \DateTimeImmutable,
            description: "Supplier Core Return Credit: {$coreReturn->return_number}" . ($creditNoteNumber ? " (Ref: {$creditNoteNumber})" : ""),
            transactionCurrencyId: null,
            exchangeRate: 1.0,
            isPosted: false,
            referenceType: 'supplier_core_return',
            referenceId: $coreReturn->id,
            createdBy: $userId,
        );

        $totalCreditValue = (float) $coreReturn->total_credit_value;

        // Debit: Accounts Payable (Reduces Liability)
        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $this->accountMapping->resolve('ap'),
            debit: round($totalCreditValue, 6),
            credit: 0,
            transactionDebit: round($totalCreditValue, 6),
            transactionCredit: 0.0,
            description: 'Core Return Credit',
        ));

        // Credit: Core Inventory (Reduces Asset)
        try {
            $inventoryAccountId = $this->accountMapping->resolve('core_inventory');
        } catch (\Exception $e) {
            $inventoryAccountId = $this->accountMapping->resolve('inventory');
        }

        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $inventoryAccountId,
            debit: 0,
            credit: round($totalCreditValue, 6),
            transactionDebit: 0.0,
            transactionCredit: round($totalCreditValue, 6),
            description: 'Core Inventory Reduction',
        ));

        $journalEntry->post();
        $this->journalEntryRepository->create($journalEntry);
    }
}
