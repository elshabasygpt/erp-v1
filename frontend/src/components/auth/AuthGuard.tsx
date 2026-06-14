'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, refreshUser } from '@/lib/auth';

interface AuthGuardProps {
    children: React.ReactNode;
    locale: string;
}

export default function AuthGuard({ children, locale }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.replace(`/${locale}/login`);
            return;
        }

        // Validate token with backend (non-blocking — if it fails in mock mode, we still proceed)
        refreshUser().then((user) => {
            if (!user && !isAuthenticated()) {
                router.replace(`/${locale}/login`);
            } else {
                setChecked(true);
            }
        }).catch(() => {
            // Network error but token exists — allow access (offline/mock mode)
            setChecked(true);
        });
    }, [locale, router, pathname]);

    if (!checked) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-body)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="auth-spinner" />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                        {locale === 'ar' ? 'جاري التحقق...' : 'Verifying...'}
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
