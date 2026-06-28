<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use App\Infrastructure\Eloquent\Models\InvoiceModel;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * (Re)generates the customer-side installment plan for an invoice.
 *
 * Pure schedule data — no journal entry is posted here (collection still flows
 * through the receivables/collect-payment path). Two business rules are enforced:
 *  - the plan total must equal the invoice's outstanding amount, and
 *  - a plan cannot be regenerated once a payment has landed on any installment.
 */
final class SaveInvoiceInstallmentsUseCase
{
    /**
     * @param  array<int, array{due_date: string, amount: float|int|string}>  $installments
     * @return Collection<int, InvoiceInstallmentModel> the saved plan, ordered by due date
     *
     * @throws DomainException on total mismatch or when a paid installment exists
     */
    public function execute(InvoiceModel $invoice, array $installments): Collection
    {
        $totalInstallments = (float) collect($installments)->sum('amount');
        $dueAmount = (float) $invoice->total - (float) $invoice->paid_amount;

        if (abs($totalInstallments - $dueAmount) > 0.1) {
            throw new DomainException(
                "Total installments amount ($totalInstallments) does not match the invoice due amount ($dueAmount)."
            );
        }

        DB::connection('tenant')->transaction(function () use ($invoice, $installments) {
            if ($invoice->installments()->where('paid_amount', '>', 0)->exists()) {
                throw new DomainException('Cannot regenerate installments because some have already been paid.');
            }

            $invoice->installments()->delete();

            foreach ($installments as $inst) {
                $invoice->installments()->create([
                    'due_date' => $inst['due_date'],
                    'amount' => $inst['amount'],
                    'paid_amount' => 0,
                    'status' => 'unpaid',
                ]);
            }
        });

        return $invoice->installments()->orderBy('due_date')->get();
    }
}
