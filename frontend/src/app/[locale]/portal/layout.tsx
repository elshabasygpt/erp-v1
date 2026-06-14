'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { portalAuthApi } from '@/lib/portal-api';

export default function PortalLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const isRTL = params.locale === 'ar';
    const router = useRouter();
    const pathname = usePathname();
    const [partner, setPartner] = useState<any>(null);
    const [checked, setChecked] = useState(false);

    const isLoginPage = pathname.endsWith('/login');

    useEffect(() => {
        const token = localStorage.getItem('partner_token');
        const partnerData = localStorage.getItem('partner_data');

        if (!token && !isLoginPage) {
            router.replace(`/${params.locale}/portal/login`);
            return;
        }

        if (partnerData) {
            setPartner(JSON.parse(partnerData));
        }
        setChecked(true);
    }, [pathname]);

    const handleLogout = async () => {
        try { await portalAuthApi.logout(); } catch (_) {}
        localStorage.removeItem('partner_token');
        localStorage.removeItem('partner_data');
        localStorage.removeItem('partner_tenant_id');
        router.push(`/${params.locale}/portal/login`);
    };

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (!checked) {
        return (
            <div className="min-h-screen flex items-center justify-center"
                style={{ background: 'radial-gradient(ellipse at 60% 50%, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
                <div className="w-12 h-12 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div 
            dir={isRTL ? 'rtl' : 'ltr'}
            className="min-h-screen"
            style={{ background: 'radial-gradient(ellipse at 60% 50%, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
        >
            {/* Portal Top Bar */}
            <header
                className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 backdrop-blur-xl"
                style={{ background: 'rgba(15,12,41,0.8)', borderBottom: '1px solid rgba(255,215,0,0.15)' }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ background: 'linear-gradient(135deg, #ffd700, #b8860b)' }}>
                        🏦
                    </div>
                    <div>
                        <p className="text-xs font-bold" style={{ color: '#ffd700' }}>
                            {isRTL ? 'بوابة الشريك' : 'Partner Portal'}
                        </p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {isRTL ? 'قراءة فقط · Read Only' : 'Read Only Access'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-white">{partner?.name || '...'}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,215,0,0.6)' }}>
                            {partner?.profit_share_percentage}% {isRTL ? 'حصة' : 'share'}
                        </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg, #ffd700, #b8860b)', color: '#1a1a2e' }}>
                        {partner?.name?.charAt(0) || '?'}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        {isRTL ? 'خروج' : 'Logout'}
                    </button>
                </div>
            </header>

            {/* Page content */}
            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
}
