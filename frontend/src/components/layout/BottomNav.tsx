'use client';

import { memo, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/providers/SidebarProvider';

interface BottomNavProps {
    locale: string;
}

const QUICK_ACTIONS = [
    {
        labelAr: 'فاتورة جديدة',
        labelEn: 'New Invoice',
        path: '/sales/create',
        color: '#6366f1',
        icon: 'M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M9 7V5a2 2 0 012-2h6l2 2v8a2 2 0 01-2 2h-2M9 7h2a2 2 0 012 2v2',
    },
    {
        labelAr: 'استلام دفعة',
        labelEn: 'Collect Payment',
        path: '/receivables/collect',
        color: '#22c55e',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
        labelAr: 'أمر شراء',
        labelEn: 'Purchase Order',
        path: '/purchases/orders',
        color: '#f59e0b',
        icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
    },
    {
        labelAr: 'مرتجعات',
        labelEn: 'Returns',
        path: '/returns',
        color: '#ef4444',
        icon: 'M9 14l-4-4m0 0l4-4m-4 4h11a4 4 0 010 8h-1',
    },
    {
        labelAr: 'منتج جديد',
        labelEn: 'New Product',
        path: '/inventory',
        color: '#10b981',
        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    },
    {
        labelAr: 'التقارير',
        labelEn: 'Reports',
        path: '/reports',
        color: '#0ea5e9',
        icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
];

const NAV_ITEMS = [
    {
        suffix: '',
        labelAr: 'الرئيسية',
        labelEn: 'Home',
        exact: true,
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
        suffix: '/sales',
        labelAr: 'المبيعات',
        labelEn: 'Sales',
        exact: false,
        icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
        suffix: '/inventory',
        labelAr: 'المخزون',
        labelEn: 'Stock',
        exact: false,
        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    },
];

function NavIcon({ d, active }: { d: string; active: boolean }) {
    return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
    );
}

const BottomNav = memo(function BottomNav({ locale }: BottomNavProps) {
    const pathname = usePathname();
    const { toggleCollapsed } = useSidebar();
    const isRTL = locale === 'ar';
    const base = `/${locale}/dashboard`;
    const [showActions, setShowActions] = useState(false);

    const closeActions = useCallback(() => setShowActions(false), []);
    const toggleActions = useCallback(() => setShowActions(p => !p), []);

    return (
        <>
            {/* Quick Actions Backdrop */}
            {showActions && (
                <div
                    className="fixed inset-0 z-40 md:hidden"
                    onClick={closeActions}
                    aria-hidden="true"
                    style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                />
            )}

            {/* Quick Actions Sheet */}
            <div
                className={`fixed inset-x-3 z-50 md:hidden transition-all duration-300 ease-out ${
                    showActions
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
                style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 8px)' }}
            >
                <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                        background: 'var(--bg-sidebar)',
                        border: '1px solid var(--border-default)',
                        boxShadow: '0 -4px 40px rgba(0,0,0,0.2)',
                    }}
                >
                    {/* Sheet header */}
                    <div
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: '1px solid var(--border-default)' }}
                    >
                        <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {isRTL ? 'إجراء سريع' : 'Quick Actions'}
                        </span>
                        <button
                            onClick={closeActions}
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-hover)' }}
                            aria-label={isRTL ? 'إغلاق' : 'Close'}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Actions grid */}
                    <div className="grid grid-cols-3">
                        {QUICK_ACTIONS.map((action, i) => (
                            <Link
                                key={action.path}
                                href={`${base}${action.path}`}
                                onClick={closeActions}
                                className="flex flex-col items-center gap-2 p-4 transition-colors active:opacity-60"
                                style={{
                                    borderTop: i >= 3 ? '1px solid var(--border-default)' : undefined,
                                    borderInlineStart: i % 3 !== 0 ? '1px solid var(--border-default)' : undefined,
                                }}
                                onTouchStart={e => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                                onTouchEnd={e => (e.currentTarget.style.background = '')}
                            >
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                    style={{ background: `${action.color}18` }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke={action.color} strokeWidth={1.8} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                                    </svg>
                                </div>
                                <span
                                    className="text-[11px] font-medium text-center leading-tight"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {isRTL ? action.labelAr : action.labelEn}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Nav Bar */}
            <nav
                className="md:hidden fixed bottom-0 inset-x-0 z-30"
                style={{
                    background: 'var(--bg-sidebar)',
                    borderTop: '1px solid var(--border-default)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
                aria-label={isRTL ? 'التنقل السفلي' : 'Bottom navigation'}
            >
                <div className="flex items-end justify-around h-16">
                    {/* First 2 items */}
                    {NAV_ITEMS.slice(0, 2).map(item => {
                        const href = `${base}${item.suffix}`;
                        const isActive = item.exact
                            ? pathname === base || pathname === `${base}/`
                            : pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className="flex flex-col items-center justify-center flex-1 h-full gap-1 relative transition-colors"
                                style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-muted)' }}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {isActive && (
                                    <span
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                                        style={{ background: 'var(--color-primary)' }}
                                    />
                                )}
                                <NavIcon d={item.icon} active={isActive} />
                                <span className="text-[10px] font-medium">{isRTL ? item.labelAr : item.labelEn}</span>
                            </Link>
                        );
                    })}

                    {/* FAB — center */}
                    <div className="flex flex-col items-center justify-end flex-1 h-full pb-2">
                        <button
                            onClick={toggleActions}
                            className="w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all duration-200"
                            style={{
                                background: showActions
                                    ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                                    : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                boxShadow: showActions
                                    ? '0 4px 20px rgba(239,68,68,0.45)'
                                    : '0 4px 20px rgba(99,102,241,0.45)',
                                transform: 'translateY(-10px)',
                            }}
                            aria-label={isRTL ? 'إجراءات سريعة' : 'Quick actions'}
                            aria-expanded={showActions}
                        >
                            <svg
                                className="w-6 h-6 text-white"
                                style={{ transition: 'transform 0.3s', transform: showActions ? 'rotate(45deg)' : 'none' }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>

                    {/* 3rd nav item (inventory) */}
                    {NAV_ITEMS.slice(2).map(item => {
                        const href = `${base}${item.suffix}`;
                        const isActive = pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className="flex flex-col items-center justify-center flex-1 h-full gap-1 relative transition-colors"
                                style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-muted)' }}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {isActive && (
                                    <span
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                                        style={{ background: 'var(--color-primary)' }}
                                    />
                                )}
                                <NavIcon d={item.icon} active={isActive} />
                                <span className="text-[10px] font-medium">{isRTL ? item.labelAr : item.labelEn}</span>
                            </Link>
                        );
                    })}

                    {/* More — opens sidebar drawer */}
                    <button
                        onClick={toggleCollapsed}
                        className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        aria-label={isRTL ? 'المزيد' : 'More'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        <span className="text-[10px] font-medium">{isRTL ? 'المزيد' : 'More'}</span>
                    </button>
                </div>
            </nav>
        </>
    );
});

export default BottomNav;
