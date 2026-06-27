<?php

declare(strict_types=1);

namespace App\Application\Sales\Services;

use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Support\Facades\Gate;

final class CreditLimitChecker
{
    /**
     * Throws a DomainException if a credit-type invoice would push the
     * customer's balance past their configured credit limit.
     *
     * credit_limit <= 0 means "no limit configured" and is never enforced.
     */
    public function assert(CustomerModel $customer, float $dueAmount, bool $overrideRequested, string $userId): void
    {
        if ($dueAmount <= 0) {
            return;
        }

        if ((float) $customer->credit_limit <= 0) {
            return;
        }

        if (((float) $customer->balance + $dueAmount) <= (float) $customer->credit_limit) {
            return;
        }

        if (! $overrideRequested) {
            throw new \DomainException("Credit Limit Exceeded. Customer balance is {$customer->balance}, Credit Limit is {$customer->credit_limit}, and Due Amount is {$dueAmount}. Manager override required.");
        }

        $user = UserModel::query()->find($userId);

        if (! $user || ! Gate::forUser($user)->allows('overrideCreditLimit', InvoiceModel::class)) {
            throw new \DomainException('You do not have permission to override the customer credit limit.');
        }
    }
}
