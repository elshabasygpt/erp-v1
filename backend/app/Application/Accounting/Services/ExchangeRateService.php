<?php

declare(strict_types=1);

namespace App\Application\Accounting\Services;

use App\Infrastructure\Eloquent\Models\CurrencyModel;
use App\Infrastructure\Eloquent\Models\ExchangeRateModel;
use DomainException;

final class ExchangeRateService
{
    public function getBaseCurrency(string $tenantId): CurrencyModel
    {
        $base = CurrencyModel::where('tenant_id', $tenantId)->where('is_base', true)->first();
        if (!$base) {
            throw new DomainException("No base currency defined for this tenant.");
        }
        return $base;
    }

    public function getRate(string $tenantId, string $currencyId, string $date): float
    {
        $currency = CurrencyModel::where('tenant_id', $tenantId)->find($currencyId);
        if (!$currency) {
            throw new DomainException("Currency not found.");
        }

        if ($currency->is_base) {
            return 1.0;
        }

        // Get the rate for the exact date, or the closest previous date
        $rateRecord = ExchangeRateModel::where('tenant_id', $tenantId)
            ->where('currency_id', $currencyId)
            ->where('date', '<=', $date)
            ->orderBy('date', 'desc')
            ->first();

        if (!$rateRecord) {
            throw new DomainException("No exchange rate found for currency {$currency->code} on or before {$date}.");
        }

        return (float) $rateRecord->rate;
    }

    public function convertToBase(string $tenantId, string $currencyId, float $amount, string $date): float
    {
        $rate = $this->getRate($tenantId, $currencyId, $date);
        return $amount * $rate;
    }

    public function convertFromBase(string $tenantId, string $currencyId, float $baseAmount, string $date): float
    {
        $rate = $this->getRate($tenantId, $currencyId, $date);
        if ($rate == 0) {
            throw new DomainException("Exchange rate cannot be zero.");
        }
        return $baseAmount / $rate;
    }
}
