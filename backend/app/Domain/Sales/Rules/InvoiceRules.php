<?php

declare(strict_types=1);

namespace App\Domain\Sales\Rules;

use App\Domain\Sales\Entities\Invoice;

final class InvoiceRules
{
    public static function validateForConfirmation(Invoice $invoice): array
    {
        $errors = [];

        if (empty($invoice->getItems())) {
            $errors[] = 'Invoice must have at least one item.';
        }

        if ($invoice->getTotal() <= 0) {
            $errors[] = 'Invoice total must be greater than zero.';
        }

        if ($invoice->getType() === 'credit' && $invoice->getCustomerId() === null) {
            $errors[] = 'Credit invoices must have a customer assigned.';
        }

        return $errors;
    }

    public static function canApplyDiscount(Invoice $invoice, float $discountPercent): bool
    {
        return $discountPercent >= 0 && $discountPercent <= 100;
    }

    public static function canReturn(Invoice $invoice): bool
    {
        return $invoice->getStatus() === 'confirmed';
    }
}
