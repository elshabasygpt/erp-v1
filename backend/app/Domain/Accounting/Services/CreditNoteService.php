<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Services;

use App\Infrastructure\Eloquent\Models\Accounting\CreditNoteModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * CreditNoteService
 *
 * Handles creation and processing of Credit Notes for both AR (Customers) and AP (Suppliers).
 */
class CreditNoteService
{
    /**
     * Create a new credit note.
     */
    public function createCreditNote(array $data, string $userId): CreditNoteModel
    {
        return DB::connection('tenant')->transaction(function () use ($data, $userId) {
            $data['id'] = Str::uuid()->toString();
            $data['created_by'] = $userId;

            // Generate credit note number based on type
            $prefix = $data['type'] === 'customer' ? 'CN-C-' : 'CN-S-';
            $lastCn = CreditNoteModel::query()->where(['type' => $data['type']])
                ->latest()
                ->first();

            $nextNum = $lastCn ? ((int) str_replace($prefix, '', $lastCn->credit_note_number)) + 1 : 1;
            $data['credit_note_number'] = $prefix.str_pad((string) $nextNum, 6, '0', STR_PAD_LEFT);

            $creditNote = CreditNoteModel::query()->create($data);

            return $creditNote;
        });
    }

    /**
     * Apply a credit note to the customer/supplier balance.
     */
    public function applyCreditNote(string $creditNoteId, array $data, string $userId): void
    {
        DB::connection('tenant')->transaction(function () use ($creditNoteId, $data, $userId) {
            $creditNote = CreditNoteModel::query()->lockForUpdate()->findOrFail($creditNoteId);

            if ($creditNote->status !== 'draft') {
                throw new \DomainException("Credit note is already {$creditNote->status}.");
            }

            if ($creditNote->type === 'customer') {
                $customer = CustomerModel::query()->lockForUpdate()->find($creditNote->customer_id);
                if ($customer) {
                    // Credit Note decreases what the customer owes us
                    $amountToApply = $data['amount'] ?? $creditNote->total;
                    $customer->balance -= $amountToApply;
                    $customer->save();

                    if (!empty($data['invoice_id'])) {
                        $invoice = InvoiceModel::query()->lockForUpdate()->find($data['invoice_id']);
                        if ($invoice) {
                            $invoice->due_amount -= $amountToApply;
                            if ($invoice->due_amount <= 0) {
                                $invoice->due_amount = 0;
                                $invoice->status = 'paid';
                            } else {
                                $invoice->status = 'partially_paid';
                            }
                            $invoice->save();
                        }
                    }
                }
            } else {
                $supplier = SupplierModel::query()->lockForUpdate()->find($creditNote->supplier_id);
                if ($supplier) {
                    // Credit Note decreases what we owe the supplier
                    $amountToApply = $data['amount'] ?? $creditNote->total;
                    $supplier->balance -= $amountToApply;
                    $supplier->save();
                }
            }

            $creditNote->remaining_amount -= $amountToApply;
            $creditNote->update([
                'status' => $creditNote->remaining_amount <= 0 ? 'applied' : 'partial',
                'remaining_amount' => $creditNote->remaining_amount
            ]);

            // Create Journal Entries (only if it's the first time being applied)
            if ($creditNote->status === 'applied' || $creditNote->status === 'partial') {
                $tenantId = $creditNote->tenant_id ?? (app()->has('current_tenant') ? app('current_tenant')->id : null);
            $entryNumber = 'JE-'.date('Y').'-'.str_pad((string) (JournalEntryModel::count() + 1), 4, '0', STR_PAD_LEFT);

            $je = JournalEntryModel::query()->create([
                'id' => Str::uuid()->toString(),
                'tenant_id' => $tenantId,
                'entry_number' => $entryNumber,
                'date' => now(),
                'reference_type' => 'credit_note',
                'reference_id' => $creditNote->id,
                'description' => 'Credit Note ' . $creditNote->credit_note_number,
                'is_posted' => true,
                'created_by' => $userId,
            ]);

            if ($creditNote->type === 'customer') {
                $revenueAccount = AccountModel::query()->where(['code' => '4100'])->first(); // Sales Revenue
                $arAccount = AccountModel::query()->where(['code' => '1102'])->first(); // Accounts Receivable
                
                if ($revenueAccount && $arAccount) {
                    // Reverse Revenue (Debit)
                    JournalEntryLineModel::query()->create([
                        'id' => Str::uuid()->toString(),
                        'tenant_id' => $tenantId,
                        'journal_entry_id' => $je->id,
                        'account_id' => $revenueAccount->id,
                        'debit' => $amountToApply,
                        'credit' => 0,
                        'description' => 'Reverse Revenue for Credit Note ' . $creditNote->credit_note_number,
                    ]);

                    // Reduce AR (Credit)
                    JournalEntryLineModel::query()->create([
                        'id' => Str::uuid()->toString(),
                        'tenant_id' => $tenantId,
                        'journal_entry_id' => $je->id,
                        'account_id' => $arAccount->id,
                        'debit' => 0,
                        'credit' => $amountToApply,
                        'description' => 'Apply Credit Note to AR',
                    ]);
                }
            } else {
                $apAccount = AccountModel::query()->where(['code' => '2101'])->first(); // Accounts Payable
                $cogsAccount = AccountModel::query()->where(['code' => '5100'])->first(); // COGS

                if ($apAccount && $cogsAccount) {
                    // Reduce AP (Debit)
                    JournalEntryLineModel::query()->create([
                        'id' => Str::uuid()->toString(),
                        'tenant_id' => $tenantId,
                        'journal_entry_id' => $je->id,
                        'account_id' => $apAccount->id,
                        'debit' => $amountToApply,
                        'credit' => 0,
                        'description' => 'Apply Credit Note to AP',
                    ]);

                    // Reverse COGS/Expense (Credit)
                    JournalEntryLineModel::query()->create([
                        'id' => Str::uuid()->toString(),
                        'tenant_id' => $tenantId,
                        'journal_entry_id' => $je->id,
                        'account_id' => $cogsAccount->id,
                        'debit' => 0,
                        'credit' => $amountToApply,
                        'description' => 'Reverse COGS for Credit Note ' . $creditNote->credit_note_number,
                    ]);
                }
                }
            }
        });
    }
}
