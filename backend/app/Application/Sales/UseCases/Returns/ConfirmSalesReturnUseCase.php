<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\Returns;

use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Sales\Services\SalesReturnService;
use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use App\Infrastructure\Eloquent\Models\SalesReturnModel;
use App\Infrastructure\Eloquent\Models\WarrantyModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConfirmSalesReturnUseCase
{
    public function __construct(
        private readonly SalesReturnService $salesReturnService,
        private readonly AccountMappingService $accountMapping
    ) {}

    public function execute(string $salesReturnId, string $userId): void
    {
        DB::connection('tenant')->transaction(function () use ($salesReturnId, $userId) {
            $salesReturn = SalesReturnModel::query()->with('items')->findOrFail($salesReturnId);

            if ($salesReturn->status !== 'pending_approval' && $salesReturn->status !== 'draft') {
                throw new \DomainException('Sales Return cannot be confirmed in its current state.');
            }

            $invoice = InvoiceModel::query()->findOrFail($salesReturn->invoice_id);
            $customer = CustomerModel::query()->findOrFail($salesReturn->customer_id);

            // Change status
            $salesReturn->status = 'completed';
            $salesReturn->approval_status = 'approved';
            $salesReturn->save();

            // 2. Process Items and Inventory Reversal using SalesReturnService
            $this->salesReturnService->processInventoryReturn($salesReturn->tenant_id, $salesReturn, $userId);

            // Cost basis of goods returned to resaleable stock. Damaged items net to zero
            // physically (returned then quarantined out), so they carry no net inventory GL effect.
            $totalCogs = 0.0;
            foreach ($salesReturn->items as $item) {
                if ($item->condition === 'good') {
                    $totalCogs += (float) ($item->cost_price ?? 0) * (float) $item->quantity;
                }
            }

            // Void related warranties for the returned items
            foreach ($salesReturn->items as $item) {
                WarrantyModel::query()->where('invoice_id', $salesReturn->invoice_id)
                    ->where('product_id', $item->product_id)
                    ->whereIn('status', ['active', 'claimed'])
                    ->update([
                        'status' => 'void',
                        'notes' => DB::raw("CONCAT(COALESCE(notes, ''), '\nVoided due to Sales Return: {$salesReturn->return_number}')"),
                    ]);
            }

            // 3. Accounting Reversal (Double Entry)
            // Resolve via the canonical account mapping first; fall back to the legacy hardcoded
            // codes so tenants whose chart still uses 4102/2105/1103/1101 keep working. Resolving
            // only by hardcoded code silently skipped the WHOLE entry when the codes differed.
            $resolveAccountId = function (string $key, string $legacyCode): ?string {
                try {
                    $id = $this->accountMapping->resolve($key);
                    if ($id) {
                        return $id;
                    }
                } catch (\Throwable $e) {
                    // fall through to the legacy lookup
                }

                return AccountModel::query()->where('code', $legacyCode)->value('id');
            };

            $salesReturnsAccountId = $resolveAccountId('revenue', '4102');
            $vatPayableAccountId = $resolveAccountId('vat_payable', '2105');
            $receivablesAccountId = $resolveAccountId('ar', '1103');
            $cashAccountId = $resolveAccountId('cash', '1101');

            if ($salesReturnsAccountId && $vatPayableAccountId && ($receivablesAccountId || $cashAccountId)) {
                $tenantId = $salesReturn->tenant_id ?? (app()->has('current_tenant') ? app('current_tenant')->id : null);
                $entryNumber = 'JE-'.date('Y').'-'.str_pad((string) (JournalEntryModel::count() + 1), 4, '0', STR_PAD_LEFT);

                $je = JournalEntryModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $tenantId,
                    'entry_number' => $entryNumber,
                    'date' => now(),
                    'reference_type' => 'sales_return',
                    'reference_id' => $salesReturn->id,
                    'description' => 'Sales Return for Invoice '.$invoice->invoice_number,
                    'is_posted' => true,
                    'created_by' => $userId,
                ]);

                JournalEntryLineModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $je->id,
                    'account_id' => $salesReturnsAccountId,
                    'debit' => $salesReturn->subtotal,
                    'credit' => 0,
                    'description' => 'Sales Return Subtotal',
                ]);

                if ($salesReturn->vat_amount > 0) {
                    JournalEntryLineModel::query()->create([
                        'id' => Str::uuid()->toString(),
                        'tenant_id' => $tenantId,
                        'journal_entry_id' => $je->id,
                        'account_id' => $vatPayableAccountId,
                        'debit' => $salesReturn->vat_amount,
                        'credit' => 0,
                        'description' => 'Sales Return VAT',
                    ]);
                }

                $creditAccountId = ($salesReturn->refund_method === 'store_credit')
                    ? ($receivablesAccountId ?? $cashAccountId)
                    : ($cashAccountId ?? $receivablesAccountId);

                JournalEntryLineModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $je->id,
                    'account_id' => $creditAccountId,
                    'debit' => 0,
                    'credit' => $salesReturn->total,
                    'description' => "Sales Return Refund ({$salesReturn->refund_method})",
                ]);

                // COGS / Inventory reversal — restore the asset value of resaleable goods to the
                // ledger and credit COGS back. Without this the GL inventory & COGS drift from the
                // physical stock that processInventoryReturn() just put back. Net effect on the
                // entry is zero (equal debit + credit), so it stays balanced.
                if ($totalCogs > 0) {
                    try {
                        $inventoryAccountId = $this->accountMapping->resolve('inventory');
                        $cogsAccountId = $this->accountMapping->resolve('cogs');

                        JournalEntryLineModel::query()->create([
                            'id' => Str::uuid()->toString(),
                            'tenant_id' => $tenantId,
                            'journal_entry_id' => $je->id,
                            'account_id' => $inventoryAccountId,
                            'debit' => round($totalCogs, 6),
                            'credit' => 0,
                            'description' => 'Inventory return (cost)',
                        ]);

                        JournalEntryLineModel::query()->create([
                            'id' => Str::uuid()->toString(),
                            'tenant_id' => $tenantId,
                            'journal_entry_id' => $je->id,
                            'account_id' => $cogsAccountId,
                            'debit' => 0,
                            'credit' => round($totalCogs, 6),
                            'description' => 'COGS reversal',
                        ]);
                    } catch (\Throwable $e) {
                        // Inventory/COGS accounts not mapped for this tenant — surface rather than
                        // silently writing a half-posted (revenue-only) reversal to the ledger.
                        throw new \DomainException('Sales return cannot post COGS/Inventory reversal: '.$e->getMessage());
                    }
                }
            }

            // 4. Refund Payment & Customer Balance Handling
            if ($salesReturn->refund_method === 'store_credit') {
                $customer->balance -= $salesReturn->total;
            }

            // CRM Loyalty Reversal
            $deductedPoints = floor($salesReturn->total / 10);
            $customer->loyalty_points = max(0, $customer->loyalty_points - $deductedPoints);

            // Re-evaluate segmentation
            if ($customer->loyalty_points >= 1000) {
                $customer->segment = 'VIP';
            } elseif ($customer->loyalty_points >= 500) {
                $customer->segment = 'Gold';
            } else {
                $customer->segment = 'Regular';
            }

            $customer->save();

            if (in_array($salesReturn->refund_method, ['cash', 'card', 'bank_transfer'])) {
                $safe = SafeModel::query()->where('is_active', true)->first();
                if ($safe) {
                    SafeTransactionModel::query()->create([
                        'id' => Str::uuid()->toString(),
                        'safe_id' => $safe->id,
                        'type' => 'expense',
                        'amount' => $salesReturn->total,
                        'reference_id' => $salesReturn->id,
                        'reference_type' => 'sales_return',
                        'description' => 'Refund for Sales Return '.$salesReturn->return_number,
                        'transaction_date' => now(),
                        'created_by' => $userId,
                    ]);
                    $safe->balance -= $salesReturn->total;
                    $safe->save();
                }
            }
        });
    }
}
