'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import SmartSearchModal from '@/components/layout/SmartSearchModal';
import { SidebarProvider, useSidebar } from '@/providers/SidebarProvider';
import { getStoredUser, isMockMode } from '@/lib/auth';
import { LanguageProvider } from '@/i18n/LanguageContext';

// ── Breadcrumb helper ─────────────────────────────────────────────
const ROUTE_LABELS: Record<string, { ar: string; en: string }> = {
    dashboard:          { ar: 'لوحة التحكم',        en: 'Dashboard' },
    sales:              { ar: 'المبيعات',            en: 'Sales' },
    inventory:          { ar: 'المخزون',             en: 'Inventory' },
    movements:          { ar: 'حركات المخزون',       en: 'Stock Movements' },
    transfers:          { ar: 'تحويلات المخازن',     en: 'Stock Transfers' },
    purchases:          { ar: 'المشتريات',           en: 'Purchases' },
    accounting:         { ar: 'المحاسبة',            en: 'Accounting' },
    customers:          { ar: 'العملاء',             en: 'Customers' },
    suppliers:          { ar: 'الموردين',            en: 'Suppliers' },
    returns:            { ar: 'المرتجعات',           en: 'Returns' },
    reports:            { ar: 'التقارير',            en: 'Reports' },
    branches:           { ar: 'الفروع',              en: 'Branches' },
    users:              { ar: 'المستخدمون',          en: 'Users' },
    settings:           { ar: 'الإعدادات',           en: 'Settings' },
    hr:                 { ar: 'شؤون الموظفين',       en: 'HR & Employees' },
    partnerships:       { ar: 'الشراكات',            en: 'Partnerships' },
    zatca:              { ar: 'الزكاة والضريبة',     en: 'ZATCA' },
    'vat-report':       { ar: 'تقرير ضريبة القيمة المضافة', en: 'VAT Report' },
    create:             { ar: 'إنشاء فاتورة',        en: 'Create Invoice' },
};

function getBreadcrumbs(pathname: string, locale: string, isRTL: boolean): string[] {
    const segments = pathname
        .replace(`/${locale}/dashboard`, '')
        .split('/')
        .filter(Boolean);
    return segments.map(s => {
        const label = ROUTE_LABELS[s];
        if (!label) return s;
        return isRTL ? label.ar : label.en;
    });
}

// ── Inner Layout (needs SidebarProvider context) ──────────────────
function DashboardLayoutInner({
    children,
    locale,
}: {
    children: React.ReactNode;
    locale: string;
}) {
    const isRTL = locale === 'ar';
    const [dict, setDict] = useState<any>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const user = typeof window !== 'undefined' ? getStoredUser() : null;
    const { collapsed, mode } = useSidebar();

    const isPosMode = pathname?.includes('/pos');
    const [isMock, setIsMock] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        setIsMock(isMockMode());
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        import(`@/i18n/dictionaries/${locale}.json`).then(m => setDict(m.default));
    }, [locale]);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    if (!dict) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-body)' }}>
                <div className="auth-spinner" />
            </div>
        );
    }

    // Breadcrumbs
    const crumbs = getBreadcrumbs(pathname || '', locale, isRTL);

    // Sidebar effective width for main margin
    const isEffectivelyCollapsed = collapsed || mode === 'mini';
    const sidebarW = isEffectivelyCollapsed ? 'lg:ms-16' : 'lg:ms-64';

    if (isPosMode) {
        return (
            <AuthGuard locale={locale}>
                <div className="h-screen overflow-hidden">{children}</div>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard locale={locale}>
            <LanguageProvider initialDict={dict}>
                <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-body)' }}>
                    {/* Mobile Overlay */}
                    {mobileMenuOpen && (
                        <div
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                    )}

                    {/* Mock Mode Banner */}
                    {isMock && (
                        <div className="sticky top-0 z-30 flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold"
                            style={{ background: 'rgba(245,158,11,0.15)', borderBottom: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {isRTL
                                ? '⚠️ وضع العرض التجريبي — البيانات وهمية. الخادم غير متصل.'
                                : '⚠️ Demo Mode — Showing mock data. Backend server is offline.'}
                        </div>
                    )}

                    {/* Sidebar */}
                    <div className={`
                        fixed inset-y-0 start-0 z-50
                        transition-all duration-300 ease-in-out
                        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                        ${isRTL && !mobileMenuOpen ? 'translate-x-full lg:translate-x-0' : ''}
                    `}>
                        <Sidebar locale={locale as any} dict={dict} />
                    </div>

                    {/* Main Content */}
                    <main className={`min-h-screen transition-all duration-300 ms-0 ${sidebarW}`}>
                        {/* ── Top Bar ── */}
                        <header
                            className="sticky top-0 z-20 h-16 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 transition-colors duration-300"
                            style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-default)' }}
                        >
                            {/* Left: Mobile toggle + Breadcrumb */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                    onClick={() => setMobileMenuOpen(true)}
                                    className="lg:hidden btn-icon flex-shrink-0"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                    </svg>
                                </button>

                                {/* Breadcrumb */}
                                <nav className="hidden sm:flex items-center gap-1.5 min-w-0" aria-label="breadcrumb">
                                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'الرئيسية' : 'Home'}
                                    </span>
                                    {crumbs.map((crumb, i) => (
                                        <span key={i} className="flex items-center gap-1.5 min-w-0">
                                            <svg className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                                    d={isRTL ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
                                            </svg>
                                            <span
                                                className={`text-xs font-medium truncate ${i === crumbs.length - 1 ? 'font-semibold' : ''}`}
                                                style={{ color: i === crumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}
                                            >
                                                {crumb}
                                            </span>
                                        </span>
                                    ))}
                                </nav>

                                {/* Search */}
                                <div className="relative hidden md:block ms-4">
                                    <button
                                        onClick={() => setIsSearchOpen(true)}
                                        className="relative flex items-center w-64 xl:w-80 py-2 px-4 text-sm rounded-xl transition-all hover:scale-[1.02] text-start"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                                    >
                                        <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <span className="ps-6 font-medium">
                                            {`${dict.common?.search || 'Search'}...`}
                                        </span>
                                        <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md border shadow-sm" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-body)', color: 'var(--text-muted)' }}>Ctrl</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md border shadow-sm" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-body)', color: 'var(--text-muted)' }}>K</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Right: Notifications + User */}
                            <div className="flex items-center gap-2.5 flex-shrink-0">
                                {/* Notifications */}
                                <button
                                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all relative hover:scale-105"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}
                                    title={isRTL ? 'الإشعارات' : 'Notifications'}
                                >
                                    <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full bg-red-500 border border-white/20" />
                                </button>

                                {/* User info */}
                                <div
                                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                                    style={{ background: 'var(--bg-surface-hover)', border: '1px solid var(--border-default)' }}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                        {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                                            {user?.name || 'Admin'}
                                        </p>
                                        <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>
                                            {user?.role || 'admin'}
                                        </p>
                                    </div>
                                    <svg className="w-3 h-3 hidden sm:block" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </header>

                        {/* Page Content */}
                        <div className="p-4 sm:p-6 lg:p-8">{children}</div>

                        <SmartSearchModal 
                            isOpen={isSearchOpen} 
                            onClose={() => setIsSearchOpen(false)} 
                            locale={locale} 
                            dict={dict} 
                        />
                    </main>
                </div>
            </LanguageProvider>
        </AuthGuard>
    );
}

// ── Root Export with SidebarProvider ──────────────────────────────
export default function DashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const locale = params.locale || 'en';
    return (
        <SidebarProvider>
            <DashboardLayoutInner locale={locale}>
                {children}
            </DashboardLayoutInner>
        </SidebarProvider>
    );
}
