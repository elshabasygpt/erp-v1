<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use App\Infrastructure\Eloquent\Models\CustomerPaymentModel;
use App\Infrastructure\Eloquent\Models\PaymentAllocationModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CollectPaymentUseCase
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository
    ) {}

    public function execute(array $data, string $userId): CustomerPaymentModel
    {
        return DB::transaction(function () use ($data, $userId) {
            $customer = CustomerModel::findOrFail($data['customer_id']);

            // 1. Create Payment Record
            $payment = CustomerPaymentModel::create([
                'id' => Str::uuid()->toString(),
                'reference_number' => 'REC-' . Date('YmdHis'),
                'customer_id' => $customer->id,
                'payment_date' => $data['payment_date'],
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'],
                'bank_name' => $data['bank_name'] ?? null,
                'transaction_id' => $data['transaction_id'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
                'status' => 'completed',
            ]);

            // 2. Process Allocations
            $remainingAmount = (float) $data['amount'];
            $allocations = $data['allocations'] ?? [];

            foreach ($allocations as $allocation) {
                $invoice = InvoiceModel::findOrFail($allocation['invoice_id']);
                $allocAmount = (float) $allocation['amount'];

                if ($allocAmount > $remainingAmount) {
                    throw new \DomainException("Allocation amount exceeds available payment amount.");
                }

                if ($allocAmount <= 0) continue;

                // Create Allocation
                PaymentAllocationModel::create([
                    'id' => Str::uuid()->toString(),
                    'payment_id' => $payment->id,
                    'invoice_id' => $invoice->id,
                    'amount' => $allocAmount,
                ]);

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

            // 3. Update Customer Balance
            // If there's an unallocated amount, it acts as a credit to the customer balance.
            // Since customer balance represents how much they owe us (Receivables), a payment reduces the balance.
            $customer->balance -= $data['amount'];
            $customer->save();

            // 4. Deposit into Safe (Treasury)
            $this->depositToSafe($payment, $userId);

            // 5. Create Accounting Journal Entry
            $this->createAccountingEntry($payment, $userId);

            return $payment;
        });
    }

    private function depositToSafe(CustomerPaymentModel $payment, string $userId): void
    {
        // Try getting the primary safe for current user
        $safeId = DB::table('safe_users')
            ->where('user_id', $userId)
            ->where('is_primary', true)
            ->value('safe_id');
        
        if (!$safeId) {
            // Fallback: if cash payment, get first cash safe. Else get first bank safe.
            $safeType = $payment->payment_method === 'cash' ? 'cash' : 'bank';
            $safeId = \App\Infrastructure\Eloquent\Models\SafeModel::where('type', $safeType)->value('id');
        }

        if ($safeId) {
            $safe = \App\Infrastructure\Eloquent\Models\SafeModel::find($safeId);
            if ($safe) {
                $safe->balance += $payment->amount;
                $safe->save();

                \App\Infrastructure\Eloquent\Models\SafeTransactionModel::create([
                    'id' => Str::uuid()->toString(),
                    'safe_id' => $safe->id,
                    'type' => 'deposit',
                    'amount' => $payment->amount,
                    'description' => 'تحصيل دفعة من العميل: ' . ($payment->customer->name ?? ''),
                    'reference_type' => 'customer_payment',
                    'reference_id' => $payment->id,
                    'transaction_date' => now(),
                    'created_by' => $userId,
                ]);
            }
        } else {
            \Log::critical("No safe available to deposit payment {$payment->id}");
        }
    }

    private function createAccountingEntry(CustomerPaymentModel $payment, string $userId): void
    {
        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        $journalEntry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: new \DateTimeImmutable($payment->payment_date->format('Y-m-d')),
            description: "Customer Payment Receipt: {$payment->reference_number}",
            isPosted: false,
            referenceType: 'customer_payment',
            referenceId: $payment->id,
            createdBy: $userId,
        );

        $debitAccountId = $payment->payment_method === 'cash' ? 'CASH_ACCOUNT_ID' : 'BANK_ACCOUNT_ID';

        // Debit: Cash or Bank
        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $debitAccountId,
            debit: $payment->amount,
            credit: 0,
            description: "Payment received via {$payment->payment_method}",
        ));

        // Credit: Accounts Receivable
        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: 'AR_ACCOUNT_ID',
            debit: 0,
            credit: $payment->amount,
            description: "Decrease in Accounts Receivable for customer",
        ));

        $this->journalEntryRepository->save($journalEntry);
    }
}
