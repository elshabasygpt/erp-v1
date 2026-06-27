'use client';

import { useRegionalSettings } from '@/providers/RegionalSettingsProvider';

/**
 * Returns a formatCurrency function bound to the tenant's active currency.
 * Drop-in replacement for the static formatCurrency from utils.ts.
 *
 * Usage:
 *   const { format } = useCurrencyFormatter();
 *   format(1500) // → '١٬٥٠٠٫٠٠ ج.م' or '١٬٥٠٠٫٠٠ ر.س'
 */
export function useCurrencyFormatter() {
    const { formatAmount, currency, currencyLocale, currencySymbol } = useRegionalSettings();
    return { format: formatAmount, currency, locale: currencyLocale, currencySymbol };
}
