<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Services;

use App\Infrastructure\Eloquent\Models\Accounting\CreditNoteModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreditNoteService
{
    public function __construct(
        private readonly AccountMappingService $accountMapping
    ) {}

    public function createCreditNote(array $data, string $userId): CreditNoteModel
    {
        return DB::connection('tenant')->transaction(function () use ($data, $userId) {
            $data['id'] = Str::uuid()->toString();
            $data['created_by'] = $userId;

            $prefix = $data['type'] === 'customer' ? 'CN-C-' : 'CN-S-';
            $lastCn = CreditNoteModel::query()->where(['type' => $data['type']])->latest()->first();
            $nextNum = $lastCn ? ((int) str_replace($prefix, '', $lastCn->credit_note_number)) + 1 : 1;
            $data['credit_note_number'] = $prefix . str_pad((string) $nextNum, 6, '0', STR_PAD_LEFT);

            return CreditNoteModel::query()->create($data);
        });
    }

    public function applyCreditNote(string $creditNoteId, array $data, string $userId): void
    {
        DB::connection('tenant')->transaction(function () use ($creditNoteId, $data, $userId) {
            $creditNote = CreditNoteModel::query()->lockForUpdate()->findOrFail($creditNoteId);

            if ($creditNote->status !== 'draft') {
                throw new \DomainException("Credit note is already {$creditNote->status}.");
            }

            $amountToApply = (float) ($data['amount'] ?? $creditNote->total);
            $tenantId = $creditNote->tenant_id ?? (app()->has('current_tenant') ? app('current_tenant')->id : null);

            if ($creditNote->type === 'customer') {
                $customer = CustomerModel::query()->lockForUpdate()->find($creditNote->customer_id);
                if ($customer) {
                    $customer->balance -= $amountToApply;
                    $customer->save();
                }

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
            } else {
                $supplier = SupplierModel::query()->lockForUpdate()->find($creditNote->supplier_id);
                if ($supplier) {
                    $supplier->balance -= $amountToApply;
                    $supplier->save();
                }
            }

            $newRemaining = (float) $creditNote->remaining_amount - $amountToApply;
            $newStatus = $newRemaining <= 0 ? 'applied' : 'partial';

            $creditNote->update([
                'status' => $newStatus,
                'remaining_amount' => max(0, $newRemaining),
            ]);

            // Post GL entry using account mappings
            $entryNumber = 'JE-' . date('Y') . '-' . str_pad((string) (JournalEntryModel::count() + 1), 4, '0', STR_PAD_LEFT);

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
                // Debit Revenue (reverse the sale), Credit AR (reduce what customer owes)
                JournalEntryLineModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $je->id,
                    'account_id' => $this->accountMapping->resolve('revenue'),
                    'debit' => $amountToApply,
                    'credit' => 0,
                    'description' => 'Reverse Revenue for ' . $creditNote->credit_note_number,
                ]);

                JournalEntryLineModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $je->id,
                    'account_id' => $this->accountMapping->resolve('ar'),
                    'debit' => 0,
                    'credit' => $amountToApply,
                    'description' => 'Apply Credit Note ' . $creditNote->credit_note_number . ' to AR',
                ]);
            } else {
                // Debit AP (reduce what we owe supplier), Credit COGS (reverse cost)
                JournalEntryLineModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $je->id,
                    'account_id' => $this->accountMapping->resolve('ap'),
                    'debit' => $amountToApply,
                    'credit' => 0,
                    'description' => 'Apply Credit Note ' . $creditNote->credit_note_number . ' to AP',
                ]);

                JournalEntryLineModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $je->id,
                    'account_id' => $this->accountMapping->resolve('cogs'),
                    'debit' => 0,
                    'credit' => $amountToApply,
                    'description' => 'Reverse COGS for ' . $creditNote->credit_note_number,
                ]);
            }
        });
    }
}
