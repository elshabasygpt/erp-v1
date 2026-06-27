<?php

declare(strict_types=1);

namespace App\Application\Sales\Services;

use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Support\Facades\Gate;

final class DownPaymentAuthorizer
{
    /**
     * paid_amount on a credit invoice is self-reported with no link to a
     * verified payment event. Require the 'collect_payments' permission
     * (via InvoicePolicy::recordDownPayment) before trusting a non-zero
     * claim — otherwise any user who can create an invoice could fabricate
     * a payment to bypass the credit limit or inflate a safe's balance.
     */
    public function assert(string $type, float $paidAmount, string $userId): void
    {
        if ($type !== 'credit' || $paidAmount <= 0) {
            return;
        }

        $user = UserModel::query()->find($userId);

        if (! $user || ! Gate::forUser($user)->allows('recordDownPayment', InvoiceModel::class)) {
            throw new \DomainException('You do not have permission to record a down payment on a credit invoice. Ask a manager to collect the payment instead.');
        }
    }
}
