"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface LanguageContextType {
    dict: any;
    d: any; // Shortcut for dict
    locale: string;
    isRTL: boolean;
    loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children, initialDict }: { children: React.ReactNode; initialDict?: any }) {
    const params = useParams();
    const locale = (params?.locale as string) || 'en';
    const isRTL = locale === 'ar';
    const [dict, setDict] = useState<any>(initialDict || null);
    const [loading, setLoading] = useState(!initialDict);

    useEffect(() => {
        if (!initialDict) {
            import(`@/i18n/dictionaries/${locale}.json`).then((m) => {
                setDict(m.default);
                setLoading(false);
            });
        }
    }, [locale, initialDict]);

    const value = {
        dict,
        d: dict,
        locale,
        isRTL,
        loading
    };

    return (
        <LanguageContext.Provider value={value}>
            {!loading && children}
            {loading && (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="auth-spinner" />
                </div>
            )}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        // Fallback or Error? 
        // Some components might be used outside the provider. 
        // For now, let's return a safe object or throw.
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
