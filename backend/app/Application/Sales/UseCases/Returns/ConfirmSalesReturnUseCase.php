<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\Returns;

use App\Infrastructure\Eloquent\Models\SalesReturnModel;
use App\Infrastructure\Eloquent\Models\SalesReturnItemModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\Accounting\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\Accounting\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\Treasury\TransactionModel;
use App\Infrastructure\Eloquent\Models\Treasury\SafeModel;
use App\Infrastructure\Eloquent\Models\Accounting\ChartOfAccountModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

use App\Domain\Sales\Services\SalesReturnService;

class ConfirmSalesReturnUseCase
{
    public function __construct(
        private readonly SalesReturnService $salesReturnService
    ) {}

    public function execute(string $salesReturnId, string $userId): void
    {
        DB::transaction(function () use ($salesReturnId, $userId) {
            $salesReturn = SalesReturnModel::with('items')->findOrFail($salesReturnId);
            
            if ($salesReturn->status !== 'pending_approval' && $salesReturn->status !== 'draft') {
                throw new \DomainException("Sales Return cannot be confirmed in its current state.");
            }

            $invoice = InvoiceModel::findOrFail($salesReturn->invoice_id);
            $customer = CustomerModel::findOrFail($salesReturn->customer_id);

            // Change status
            $salesReturn->status = 'completed';
            $salesReturn->approval_status = 'approved';
            $salesReturn->save();

            // 2. Process Items and Inventory Reversal using SalesReturnService
            $this->salesReturnService->processInventoryReturn($salesReturn->tenant_id, $salesReturn, $userId);

            // Void related warranties for the returned items
            foreach ($salesReturn->items as $item) {
                \App\Infrastructure\Eloquent\Models\WarrantyModel::where('invoice_id', $salesReturn->invoice_id)
                    ->where('product_id', $item->product_id)
                    ->whereIn('status', ['active', 'claimed'])
                    ->update([
                        'status' => 'void',
                        'notes' => DB::raw("CONCAT(COALESCE(notes, ''), '\nVoided due to Sales Return: {$salesReturn->return_number}')")
                    ]);
            }

            // 3. Accounting Reversal (Double Entry)
            $salesReturnsAccount = ChartOfAccountModel::where('code', '4102')->first();
            $vatPayableAccount = ChartOfAccountModel::where('code', '2105')->first();
            $receivablesAccount = ChartOfAccountModel::where('code', '1103')->first();
            $cashAccount = ChartOfAccountModel::where('code', '1101')->first();

            if ($salesReturnsAccount && $vatPayableAccount && ($receivablesAccount || $cashAccount)) {
                $je = JournalEntryModel::create([
                    'id' => Str::uuid()->toString(),
                    'date' => now(),
                    'reference' => 'RET-' . $salesReturn->return_number,
                    'description' => "Sales Return for Invoice " . $invoice->invoice_number,
                    'status' => 'posted',
                    'created_by' => $userId,
                ]);

                JournalEntryLineModel::create([
                    'id' => Str::uuid()->toString(),
                    'journal_entry_id' => $je->id,
                    'account_id' => $salesReturnsAccount->id,
                    'debit' => $salesReturn->subtotal,
                    'credit' => 0,
                    'description' => 'Sales Return Subtotal'
                ]);

                if ($salesReturn->vat_amount > 0) {
                    JournalEntryLineModel::create([
                        'id' => Str::uuid()->toString(),
                        'journal_entry_id' => $je->id,
                        'account_id' => $vatPayableAccount->id,
                        'debit' => $salesReturn->vat_amount,
                        'credit' => 0,
                        'description' => 'Sales Return VAT'
                    ]);
                }

                $creditAccount = ($salesReturn->refund_method === 'store_credit') ? $receivablesAccount : $cashAccount;
                
                JournalEntryLineModel::create([
                    'id' => Str::uuid()->toString(),
                    'journal_entry_id' => $je->id,
                    'account_id' => $creditAccount->id,
                    'debit' => 0,
                    'credit' => $salesReturn->total,
                    'description' => "Sales Return Refund ({$salesReturn->refund_method})"
                ]);
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
                $safe = SafeModel::where('is_active', true)->first();
                if ($safe) {
                    TransactionModel::create([
                        'id' => Str::uuid()->toString(),
                        'safe_id' => $safe->id,
                        'type' => 'expense',
                        'amount' => $salesReturn->total,
                        'reference_id' => $salesReturn->id,
                        'reference_type' => 'sales_return',
                        'description' => "Refund for Sales Return " . $salesReturn->return_number,
                        'date' => now(),
                        'created_by' => $userId,
                    ]);
                    $safe->balance -= $salesReturn->total;
                    $safe->save();
                }
            }
        });
    }
}
