<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use App\Domain\Inventory\Services\InventoryValuationService;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\SalesReturnModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use App\Infrastructure\Eloquent\Models\SafeUserModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConfirmSalesReturnUseCase
{
    public function __construct(
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private AccountMappingService $accountMapping,
        private FiscalPeriodService $fiscalPeriodService,
        private InventoryValuationService $inventoryValuationService,
    ) {}

    public function execute(string $salesReturnId, string $userId): void
    {
        DB::connection('tenant')->transaction(function () use ($salesReturnId, $userId) {
            $salesReturn = SalesReturnModel::query()->with(['items', 'invoice'])->lockForUpdate()->find($salesReturnId);
            
            if (! $salesReturn) {
                throw new \DomainException('Sales return not found.');
            }

            if ($salesReturn->status === 'completed') {
                throw new \DomainException('Sales return is already completed.');
            }

            // 1. Inventory Reversal (Add back to stock)
            $totalCogs = 0;
            $isCoreReturn = $salesReturn->return_type === 'core';

            foreach ($salesReturn->items as $item) {
                if ($item->condition === 'damaged') {
                    // Damaged items might not go back to regular inventory or might have 0 cost.
                    // For simplicity, we assume they are returned to stock at cost, then written off later, or handled manually.
                }

                $costPrice = $item->cost_price ?? 0;

                if ($isCoreReturn) {
                    $warehouseStock = \App\Infrastructure\Eloquent\Models\WarehouseProductModel::query()
                        ->firstOrCreate(
                            ['warehouse_id' => $salesReturn->warehouse_id, 'product_id' => $item->product_id],
                            ['quantity' => 0, 'core_quantity' => 0, 'average_cost' => 0]
                        );
                    $warehouseStock->core_quantity += $item->quantity;
                    $warehouseStock->save();
                    
                    // Core value is determined by the unit_price of the returned item (the refunded core charge)
                    $totalCogs += ($item->unit_price * $item->quantity);
                } else {
                    $totalCost = $this->inventoryValuationService->recordMovement(
                        $item->product_id,
                        $salesReturn->warehouse_id,
                        $item->quantity, // positive for incoming
                        $costPrice,
                        'return',
                        $salesReturn->id,
                        $userId
                    );

                    $totalCogs += ($costPrice * $item->quantity);
                }
            }

            // 2. Customer Balance update
            $refundAmount = (float) $salesReturn->total;
            if ($salesReturn->customer_id) {
                $customerModel = CustomerModel::query()->lockForUpdate()->find($salesReturn->customer_id);
                if ($customerModel) {
                    if ($salesReturn->refund_method === 'credit_balance') {
                        $customerModel->balance -= $refundAmount; // Decrease debt / Increase their credit
                    }
                    
                    // Deduct loyalty points
                    $deductedPoints = floor($refundAmount / 10);
                    $customerModel->loyalty_points = max(0, $customerModel->loyalty_points - $deductedPoints);
                    $customerModel->save();
                }
            }

            // 3. Safe / Cash withdrawal if cash refund
            if ($salesReturn->refund_method === 'cash') {
                $safeId = SafeUserModel::query()
                    ->where('user_id', $userId)
                    ->where('is_primary', true)
                    ->value('safe_id');

                if (! $safeId) {
                    $safeId = SafeModel::query()->where('type', 'cash')->value('id');
                }

                if ($safeId) {
                    $safe = SafeModel::query()->lockForUpdate()->find($safeId);
                    if ($safe) {
                        if ($safe->balance < $refundAmount) {
                            throw new \DomainException('Insufficient safe balance for cash refund.');
                        }
                        
                        $safe->balance -= $refundAmount;
                        $safe->save();

                        SafeTransactionModel::query()->create([
                            'id' => Str::uuid()->toString(),
                            'safe_id' => $safe->id,
                            'type' => 'withdrawal',
                            'amount' => $refundAmount,
                            'description' => 'سحب نقدي لمرتجع مبيعات رقم: ' . $salesReturn->return_number,
                            'reference_type' => 'sales_return',
                            'reference_id' => $salesReturn->id,
                            'created_by' => $userId,
                            'transaction_date' => now(),
                        ]);
                    }
                }
            }

            // 4. Validate fiscal period
            $this->fiscalPeriodService->validatePostingDate(new \DateTimeImmutable);

            // 5. Generate double-entry Journal Entry
            $this->createJournalEntry($salesReturn, $totalCogs, $userId);
        });
    }

    private function createJournalEntry(SalesReturnModel $salesReturn, float $totalCogs, string $userId): void
    {
        $tenantId = app('current_tenant')->id ?? 'tenant_context';
        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        $journalEntry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: new \DateTimeImmutable,
            description: "Sales Return: {$salesReturn->return_number}",
            transactionCurrencyId: null, // Assume base currency for now
            exchangeRate: 1.0,
            isPosted: false,
            referenceType: 'sales_return',
            referenceId: $salesReturn->id,
            createdBy: $userId,
        );

        // Debit: Sales Returns (Contra-Revenue) or Revenue directly
        $netRevenue = (float) $salesReturn->subtotal;
        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $this->accountMapping->resolve('revenue'), // Ideally should map to 'sales_returns'
            debit: round($netRevenue, 2),
            credit: 0,
            transactionDebit: round($netRevenue, 2),
            transactionCredit: 0.0,
            description: 'Sales return',
        ));

        // Debit: VAT Payable
        if ((float) $salesReturn->vat_amount > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('vat_payable'),
                debit: round((float) $salesReturn->vat_amount, 2),
                credit: 0,
                transactionDebit: round((float) $salesReturn->vat_amount, 2),
                transactionCredit: 0.0,
                description: 'VAT return reversal',
            ));
        }

        // Credit: Cash/Bank or Accounts Receivable
        $refundAmount = (float) $salesReturn->total;
        $creditAccount = $this->accountMapping->resolve('ar');
        if ($salesReturn->refund_method === 'cash') {
            $creditAccount = $this->accountMapping->resolve('cash');
        } elseif ($salesReturn->refund_method === 'bank_transfer' || $salesReturn->refund_method === 'card') {
            $creditAccount = $this->accountMapping->resolve('bank');
        }

        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $creditAccount,
            debit: 0,
            credit: round($refundAmount, 2),
            transactionDebit: 0.0,
            transactionCredit: round($refundAmount, 2),
            description: 'Refund payment / Balance adjustment',
        ));

        // Inventory & COGS Reversal
        if ($totalCogs > 0) {
            $isCoreReturn = $salesReturn->return_type === 'core';
            
            // Debit: Inventory (or Core Inventory)
            try {
                $inventoryAccountId = $isCoreReturn 
                    ? $this->accountMapping->resolve('core_inventory') 
                    : $this->accountMapping->resolve('inventory');
            } catch (\Exception $e) {
                // Fallback to regular inventory if core_inventory mapping doesn't exist
                $inventoryAccountId = $this->accountMapping->resolve('inventory');
            }

            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $inventoryAccountId,
                debit: round($totalCogs, 2),
                credit: 0,
                transactionDebit: round($totalCogs, 2),
                transactionCredit: 0.0,
                description: $isCoreReturn ? 'Core return inventory' : 'Inventory return',
            ));

            // Credit: COGS
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('cogs'),
                debit: 0,
                credit: round($totalCogs, 2),
                transactionDebit: 0.0,
                transactionCredit: round($totalCogs, 2),
                description: $isCoreReturn ? 'Core charge reversal / COGS' : 'COGS reversal',
            ));
        }

        $journalEntry->post();
        $this->journalEntryRepository->create($journalEntry);
    }
}
