<?php

declare(strict_types=1);

namespace App\Domain\Shared\Services;

use Illuminate\Support\Facades\DB;

/**
 * Resolves the tenant's effective default VAT rate (as a percentage, e.g. 14.0 / 15.0).
 *
 * Replaces the scattered `tenant_settings.tax_rate ?? 15` reads, whose Saudi-biased `15`
 * fallback silently billed Egyptian tenants 15% instead of 14% whenever `tax_rate` was
 * unset. When no explicit rate is configured we derive it from the tenant's country
 * (EG → 14, SA → 15) instead of assuming Saudi Arabia.
 */
final class TaxRateResolver
{
    public static function resolve(): float
    {
        $settings = DB::connection('tenant')
            ->table('tenant_settings')
            ->whereIn('key', ['tax_rate', 'country'])
            ->pluck('value', 'key');

        $rate = $settings['tax_rate'] ?? null;
        if ($rate !== null && $rate !== '') {
            return (float) $rate;
        }

        return ($settings['country'] ?? 'SA') === 'EG' ? 14.0 : 15.0;
    }
}
