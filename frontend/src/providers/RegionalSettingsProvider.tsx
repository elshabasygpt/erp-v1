'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { settingsApi } from '@/lib/api';

export type Country = 'SA' | 'EG';
export type Currency = 'SAR' | 'EGP';

interface RegionalSettings {
    country: Country;
    currency: Currency;
    taxRate: number;
    taxRegistrationNumber: string;
    currencyLocale: string;
    currencySymbol: string;
}

interface RegionalSettingsContextType extends RegionalSettings {
    setCountry: (country: Country) => void;
    formatAmount: (value: number) => string;
    isLoaded: boolean;
}

const COUNTRY_DEFAULTS: Record<Country, Omit<RegionalSettings, 'taxRegistrationNumber'>> = {
    SA: { country: 'SA', currency: 'SAR', taxRate: 15, currencyLocale: 'ar-SA', currencySymbol: 'ر.س' },
    EG: { country: 'EG', currency: 'EGP', taxRate: 14, currencyLocale: 'ar-EG', currencySymbol: 'ج.م' },
};

const RegionalSettingsContext = createContext<RegionalSettingsContextType>({
    ...COUNTRY_DEFAULTS.SA,
    taxRegistrationNumber: '',
    setCountry: () => {},
    formatAmount: (v) => v.toFixed(2),
    isLoaded: false,
});

export function useRegionalSettings() {
    return useContext(RegionalSettingsContext);
}

export function RegionalSettingsProvider({ children }: { children: React.ReactNode }) {
    const [country, setCountryState] = useState<Country>('SA');
    const [taxRegistrationNumber, setTaxRegistrationNumber] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load from localStorage first for instant render
        const stored = localStorage.getItem('erp_country') as Country | null;
        if (stored && (stored === 'SA' || stored === 'EG')) {
            setCountryState(stored);
        }
        const storedTrn = localStorage.getItem('erp_tax_reg_number') || '';
        setTaxRegistrationNumber(storedTrn);

        // Then sync from API
        settingsApi.getSettings()
            .then((res) => {
                const data = res.data?.data || res.data || {};
                if (data.country === 'SA' || data.country === 'EG') {
                    setCountryState(data.country);
                    localStorage.setItem('erp_country', data.country);
                }
                if (data.tax_registration_number) {
                    setTaxRegistrationNumber(data.tax_registration_number);
                    localStorage.setItem('erp_tax_reg_number', data.tax_registration_number);
                }
            })
            .catch(() => {})
            .finally(() => setIsLoaded(true));
    }, []);

    const setCountry = (c: Country) => {
        setCountryState(c);
        localStorage.setItem('erp_country', c);
        settingsApi.updateSettings({ country: c }).catch(() => {});
    };

    const defaults = COUNTRY_DEFAULTS[country];

    const formatter = useMemo(
        () => new Intl.NumberFormat(defaults.currencyLocale, {
            style: 'currency',
            currency: defaults.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }),
        [defaults.currencyLocale, defaults.currency]
    );

    const formatAmount = useCallback((value: number) => formatter.format(value), [formatter]);

    return (
        <RegionalSettingsContext.Provider
            value={{
                ...defaults,
                taxRegistrationNumber,
                setCountry,
                formatAmount,
                isLoaded,
            }}
        >
            {children}
        </RegionalSettingsContext.Provider>
    );
}
