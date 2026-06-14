<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Services;

use App\Infrastructure\Eloquent\Models\Accounting\CreditNoteModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
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
            $lastCn = CreditNoteModel::where('type', $data['type'])
                ->latest('created_at')
                ->first();
            
            $nextNum = $lastCn ? ((int) str_replace($prefix, '', $lastCn->credit_note_number)) + 1 : 1;
            $data['credit_note_number'] = $prefix . str_pad((string)$nextNum, 6, '0', STR_PAD_LEFT);

            $creditNote = CreditNoteModel::create($data);

            return $creditNote;
        });
    }

    /**
     * Apply a credit note to the customer/supplier balance.
     */
    public function applyCreditNote(string $creditNoteId, string $userId): void
    {
        DB::connection('tenant')->transaction(function () use ($creditNoteId, $userId) {
            $creditNote = CreditNoteModel::lockForUpdate()->findOrFail($creditNoteId);

            if ($creditNote->status !== 'draft') {
                throw new \DomainException("Credit note is already {$creditNote->status}.");
            }

            if ($creditNote->type === 'customer') {
                $customer = CustomerModel::lockForUpdate()->find($creditNote->customer_id);
                if ($customer) {
                    // Credit Note decreases what the customer owes us
                    $customer->balance -= $creditNote->total;
                    $customer->save();
                }
            } else {
                $supplier = SupplierModel::lockForUpdate()->find($creditNote->supplier_id);
                if ($supplier) {
                    // Credit Note decreases what we owe the supplier
                    $supplier->balance -= $creditNote->total;
                    $supplier->save();
                }
            }

            $creditNote->update([
                'status' => 'applied',
            ]);

            // TODO: In a full system, create Journal Entries here (Reverse Revenue/COGS, AR/AP adjustments)
        });
    }
}
