'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { useSidebar } from '@/providers/SidebarProvider';
import { logout, getStoredUser } from '@/lib/auth';
import type { Locale } from '@/types';

interface SidebarProps {
    locale: Locale;
    dict: any;
}

// ─── Icon Paths ──────────────────────────────────────────────────
const ICONS = {
    pos: 'M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M9 7V5a2 2 0 012-2h6l2 2v8a2 2 0 01-2 2h-2M9 7h2a2 2 0 012 2v2',
    dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    sales: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    returns: 'M9 14l-4-4m0 0l4-4m-4 4h11.586a2 2 0 012 2v2a2 2 0 01-2 2H5',
    inventory: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    movements: 'M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4',
    transfers: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    purchases: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
    suppliers: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
    accounting: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    zatca: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    customers: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    partnerships: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    hr: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    reports: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    branches: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    users: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
    settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    chevron: 'M19 9l-7 7-7-7',
    collapse: 'M11 19l-7-7 7-7m8 14l-7-7 7-7',
    expand: 'M13 5l7 7-7 7M5 5l7 7-7 7',
    sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
    logout: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
};

// ─── Menu Groups ──────────────────────────────────────────────────
interface SubItem {
    key: string;
    path: string;
    iconKey: keyof typeof ICONS;
    labelAr: string;
    labelEn: string;
    badge?: { text: string; color: string };
}

interface MenuGroup {
    key: string;
    iconKey: keyof typeof ICONS;
    labelAr: string;
    labelEn: string;
    color: string;
    children: SubItem[];
}

interface SingleItem {
    key: string;
    path: string;
    iconKey: keyof typeof ICONS;
    labelAr: string;
    labelEn: string;
    highlight?: boolean;
    badge?: { text: string; color: string };
}

const GROUPS: MenuGroup[] = [
    {
        key: 'sales-group',
        iconKey: 'sales',
        labelAr: 'المبيعات',
        labelEn: 'Sales',
        color: '#6366f1',
        children: [
            { key: 'sales_dashboard', path: '/sales', iconKey: 'dashboard', labelAr: 'لوحة المبيعات', labelEn: 'Sales Dashboard' },
            { key: 'sales_list', path: '/sales/list', iconKey: 'sales', labelAr: 'قائمة الفواتير', labelEn: 'Invoices List' },
            { key: 'sales_create', path: '/sales/create', iconKey: 'sales', labelAr: 'إنشاء فاتورة', labelEn: 'Create Invoice' },
            { key: 'quotations', path: '/quotations', iconKey: 'reports', labelAr: 'عروض الأسعار', labelEn: 'Quotations' },
            { key: 'shipping', path: '/shipping', iconKey: 'transfers', labelAr: 'الشحن السريع', labelEn: 'Shipping' },
            { key: 'deliveries', path: '/deliveries', iconKey: 'transfers', labelAr: 'إدارة التوصيل والمقادير', labelEn: 'Delivery Management' },
            { key: 'returns', path: '/returns', iconKey: 'returns', labelAr: 'المرتجعات والتلفيات', labelEn: 'Returns' },
        ],
    },
    {
        key: 'inventory-group',
        iconKey: 'inventory',
        labelAr: 'المخزون والتصنيع',
        labelEn: 'Inventory & MFG',
        color: '#22c55e',
        children: [
            { key: 'inventory', path: '/inventory', iconKey: 'inventory', labelAr: 'الأصناف والمنتجات', labelEn: 'Products' },
            { key: 'stockMovements', path: '/inventory/movements', iconKey: 'movements', labelAr: 'حركات المخزون', labelEn: 'Stock Movements' },
            { key: 'transfers', path: '/inventory/transfers', iconKey: 'transfers', labelAr: 'تحويلات المخازن', labelEn: 'Transfers' },
            { key: 'manufacturing', path: '/manufacturing', iconKey: 'inventory', labelAr: 'التصنيع والتجميع', labelEn: 'Manufacturing' },
        ],
    },
    {
        key: 'purchases-group',
        iconKey: 'purchases',
        labelAr: 'المشتريات',
        labelEn: 'Purchases',
        color: '#f59e0b',
        children: [
            { key: 'purchases', path: '/purchases', iconKey: 'purchases', labelAr: 'فواتير الشراء', labelEn: 'Purchase Invoices' },
            { key: 'suppliers', path: '/suppliers', iconKey: 'suppliers', labelAr: 'الموردين', labelEn: 'Suppliers' },
        ],
    },
    {
        key: 'accounting-group',
        iconKey: 'accounting',
        labelAr: 'المحاسبة والخزينة',
        labelEn: 'Accounting & Treasury',
        color: '#8b5cf6',
        children: [
            { key: 'accounting', path: '/accounting', iconKey: 'accounting', labelAr: 'القيود اليومية', labelEn: 'Journal Entries' },
            { key: 'treasury', path: '/treasury', iconKey: 'accounting', labelAr: 'الخزينة والبنوك', labelEn: 'Treasury & Banks' },
            { key: 'fixedAssets', path: '/fixed-assets', iconKey: 'inventory', labelAr: 'الأصول الثابتة', labelEn: 'Fixed Assets' },
            {
                key: 'vatReport', path: '/zatca/vat-report', iconKey: 'zatca', labelAr: 'تقرير ضريبة القيمة المضافة', labelEn: 'VAT Report',
                badge: { text: 'ZATCA', color: '#10b981' },
            },
        ],
    },
    {
        key: 'crm-group',
        iconKey: 'customers',
        labelAr: 'العملاء والعلاقات',
        labelEn: 'CRM',
        color: '#06b6d4',
        children: [
            { key: 'customers', path: '/customers', iconKey: 'customers', labelAr: 'العملاء', labelEn: 'Customers' },
            { key: 'receivables-dash', path: '/receivables', iconKey: 'reports', labelAr: 'إدارة المديونيات', labelEn: 'Receivables Dashboard' },
            { key: 'receivables-collect', path: '/receivables/collect', iconKey: 'accounting', labelAr: 'تحصيل الدفعات', labelEn: 'Collect Payment' },
            { key: 'receivables-statement', path: '/receivables/statement', iconKey: 'reports', labelAr: 'كشف حساب عميل', labelEn: 'Customer Statement' },
            { key: 'partnerships', path: '/partnerships', iconKey: 'partnerships', labelAr: 'الشراكات والأرباح', labelEn: 'Partnerships' },
        ],
    },
    {
        key: 'hr-group',
        iconKey: 'hr',
        labelAr: 'الموارد البشرية',
        labelEn: 'HR & Payroll',
        color: '#ec4899',
        children: [
            { key: 'employees', path: '/hr/employees', iconKey: 'users', labelAr: 'الموظفين', labelEn: 'Employees' },
            { key: 'attendance', path: '/hr/attendance', iconKey: 'reports', labelAr: 'الحضور والانصراف', labelEn: 'Attendance' },
            { key: 'leaves', path: '/hr/leaves', iconKey: 'reports', labelAr: 'إدارة الإجازات', labelEn: 'Leave Management' },
            { key: 'payroll', path: '/hr/payroll', iconKey: 'accounting', labelAr: 'مسيرات الرواتب', labelEn: 'Payroll' },
        ],
    },
];

const SINGLE_ITEMS: SingleItem[] = [
    { key: 'reports', path: '/reports', iconKey: 'reports', labelAr: 'التقارير الشاملة', labelEn: 'Reports' },
    { key: 'financialReports', path: '/reports/financial', iconKey: 'reports', labelAr: 'التقارير المالية (P&L, KPIs)', labelEn: 'Financial Reports (P&L)' },
    { key: 'advancedReports', path: '/reports/advanced', iconKey: 'reports', labelAr: 'تقارير متقدمة (أعمار الديون)', labelEn: 'Advanced Reports (Aging)' },
    { key: 'analytics', path: '/analytics', iconKey: 'reports', labelAr: 'ذكاء اصطناعي وتوقعات الذكاء', labelEn: 'AI Analytics & Forecasting',
        badge: { text: 'AI', color: '#7c3aed' } as any,
    },
    { key: 'branches', path: '/branches', iconKey: 'branches', labelAr: 'الفروع', labelEn: 'Branches' },
    { key: 'users', path: '/users', iconKey: 'users', labelAr: 'المستخدمون', labelEn: 'Users' },
    { key: 'settings', path: '/settings', iconKey: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings' },
];


function Icon({ path, className = 'w-5 h-5' }: { path: string; className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    );
}

// ─── Tooltip wrapper for mini mode ────────────────────────────────
function Tooltip({ label, children, collapsed, isRTL }: { label: string; children: React.ReactNode; collapsed: boolean; isRTL: boolean }) {
    if (!collapsed) return <>{children}</>;
    return (
        <div className="relative group/tip flex items-center">
            {children}
            <div className={`
                absolute z-[100] px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none
                opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150
                ${isRTL ? 'right-full me-2' : 'left-full ms-2'}
            `} style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-modal)' }}>
                {label}
            </div>
        </div>
    );
}

export default function Sidebar({ locale, dict }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { mode, collapsed, toggleCollapsed } = useSidebar();
    const isRTL = locale === 'ar';
    const user = typeof window !== 'undefined' ? getStoredUser() : null;
    const isMini = collapsed || mode === 'mini';

    // Track which groups are open
    const getInitialOpenGroups = () => {
        const open: Record<string, boolean> = {};
        GROUPS.forEach(group => {
            const isGroupActive = group.children.some(child =>
                pathname?.startsWith(`/${locale}/dashboard${child.path}`)
            );
            if (isGroupActive) open[group.key] = true;
        });
        return open;
    };

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpenGroups);
    const [isHovering, setIsHovering] = useState(false);

    // Update open groups on pathname change
    useEffect(() => {
        setOpenGroups(getInitialOpenGroups());
    }, [pathname]);

    const toggleGroup = (key: string) => {
        if (isMini && mode !== 'hover') return;
        setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleLogout = async () => {
        await logout();
        router.push(`/${locale}/login`);
    };

    const effectivelyExpanded = mode === 'hover' ? (isHovering || !collapsed) : !isMini;
    const sidebarWidth = effectivelyExpanded ? 'w-64' : 'w-16';

    const getLabel = (labelAr: string, labelEn: string) => isRTL ? labelAr : labelEn;

    return (
        <aside
            className={`${sidebarWidth} h-full flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}
            style={{ background: 'var(--bg-sidebar)', borderInlineEnd: '1px solid var(--border-default)' }}
            onMouseEnter={() => mode === 'hover' && setIsHovering(true)}
            onMouseLeave={() => mode === 'hover' && setIsHovering(false)}
        >
            {/* ── Logo ── */}
            <div className="h-16 flex items-center gap-3 px-4 flex-shrink-0 relative"
                style={{ borderBottom: '1px solid var(--border-default)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                    <span className="font-black text-sm" style={{ color: 'var(--color-primary)' }}>$</span>
                </div>
                {effectivelyExpanded && (
                    <span className="font-bold text-sm truncate transition-all duration-200" style={{ color: 'var(--text-primary)' }}>
                        {dict.common?.appName || 'SaaS Accounting'}
                    </span>
                )}
                {/* Collapse toggle */}
                {mode === 'full' && (
                    <button
                        onClick={toggleCollapsed}
                        className="absolute end-2 w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-hover)' }}
                        title={collapsed ? (isRTL ? 'توسيع' : 'Expand') : (isRTL ? 'تصغير' : 'Collapse')}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d={collapsed
                                    ? (isRTL ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7')
                                    : (isRTL ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7')
                                }
                            />
                        </svg>
                    </button>
                )}
            </div>

            {/* ── POS Quick Access ── */}
            <div className="px-3 pt-3 pb-1 flex-shrink-0">
                <Tooltip label={getLabel('نقطة البيع', 'POS Terminal')} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                    <Link
                        href={`/${locale}/dashboard/pos`}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 w-full
                            ${pathname?.includes('/pos') ? 'text-white' : 'hover:opacity-90'}
                        `}
                        style={{
                            background: pathname?.includes('/pos')
                                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                : 'rgba(99,102,241,0.1)',
                            color: pathname?.includes('/pos') ? 'white' : 'var(--color-primary)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            boxShadow: pathname?.includes('/pos') ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
                        }}
                    >
                        <Icon path={ICONS.pos} className="w-5 h-5 flex-shrink-0" />
                        {effectivelyExpanded && (
                            <>
                                <span>{getLabel('نقطة البيع', 'POS Terminal')}</span>
                                <span className="ms-auto text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/20">POS</span>
                            </>
                        )}
                    </Link>
                </Tooltip>
            </div>

            {/* ── Dashboard single link ── */}
            <div className="px-3 py-1 flex-shrink-0">
                <Tooltip label={getLabel('لوحة التحكم', 'Dashboard')} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                    <Link
                        href={`/${locale}/dashboard`}
                        className={`sidebar-link ${pathname === `/${locale}/dashboard` ? 'active' : ''}`}
                    >
                        <div className="icon shadow-sm"><Icon path={ICONS.dashboard} /></div>
                        {effectivelyExpanded && <span>{getLabel('لوحة التحكم', 'Dashboard')}</span>}
                    </Link>
                </Tooltip>
            </div>

            {/* ── Divider ── */}
            {effectivelyExpanded && (
                <div className="px-4 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'القوائم الرئيسية' : 'Main Menu'}
                    </p>
                </div>
            )}

            {/* ── Navigation ── */}
            <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto overflow-x-hidden">

                {/* Groups with dropdowns */}
                {GROUPS.map(group => {
                    const isGroupActive = group.children.some(child =>
                        pathname?.startsWith(`/${locale}/dashboard${child.path}`)
                    );
                    const isOpen = openGroups[group.key] || false;

                    return (
                        <div key={group.key}>
                            {/* Group Header */}
                            <Tooltip label={getLabel(group.labelAr, group.labelEn)} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                                <button
                                    onClick={() => toggleGroup(group.key)}
                                    className={`sidebar-link w-full text-start transition-all ${isGroupActive ? 'font-semibold' : ''}`}
                                    style={isGroupActive ? { color: group.color } : {}}
                                >
                                    {/* Group icon with color dot */}
                                    <div className="icon relative flex-shrink-0">
                                        <Icon path={ICONS[group.iconKey]} />
                                        {isGroupActive && (
                                            <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full border-2"
                                                style={{ background: group.color, borderColor: 'var(--bg-sidebar)' }} />
                                        )}
                                    </div>

                                    {effectivelyExpanded && (
                                        <>
                                            <span className="flex-1 truncate">{getLabel(group.labelAr, group.labelEn)}</span>
                                            {/* Chevron */}
                                            <svg
                                                className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.chevron} />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </Tooltip>

                            {/* Dropdown Children */}
                            <div className={`sidebar-dropdown ${isOpen && effectivelyExpanded ? 'open' : ''}`}>
                                <div className={`ps-2 space-y-1 pt-1 sidebar-tree`}>
                                    {group.children.map(child => {
                                        const href = `/${locale}/dashboard${child.path}`;
                                        const isActive = pathname?.startsWith(`/${locale}/dashboard${child.path}`);
                                        return (
                                            <Link
                                                key={child.key}
                                                href={href}
                                                className={`sidebar-sub-link ${isActive ? 'active' : ''} ms-4`}
                                                style={isActive ? { color: group.color } : {}}
                                            >
                                                <span className="truncate">{getLabel(child.labelAr, child.labelEn)}</span>
                                                {child.badge && (
                                                    <span className="ms-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                                        style={{ background: `${child.badge.color}20`, color: child.badge.color }}>
                                                        {child.badge.text}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Divider before single items */}
                <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
                    {effectivelyExpanded && (
                        <p className="px-1 text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'أخرى' : 'Other'}
                        </p>
                    )}
                    {SINGLE_ITEMS.map(item => {
                        const href = `/${locale}/dashboard${item.path}`;
                        const isActive = item.path === ''
                            ? pathname === `/${locale}/dashboard`
                            : pathname?.startsWith(`/${locale}/dashboard${item.path}`);
                        return (
                            <Tooltip key={item.key} label={getLabel(item.labelAr, item.labelEn)} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                                <Link href={href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                                    <div className="icon shadow-sm"><Icon path={ICONS[item.iconKey]} /></div>
                                    {effectivelyExpanded && <span className="truncate">{getLabel(item.labelAr, item.labelEn)}</span>}
                                </Link>
                            </Tooltip>
                        );
                    })}
                </div>
            </nav>

            {/* ── Bottom Controls ── */}
            <div className="px-3 py-3 space-y-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border-default)' }}>

                {/* Theme Toggle */}
                <Tooltip label={theme === 'dark' ? getLabel('الوضع النهاري','Light Mode') : getLabel('الوضع الليلي','Dark Mode')} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300"
                        style={{ background: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' }}
                    >
                        {theme === 'dark' ? (
                            <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.sun} />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.moon} />
                            </svg>
                        )}
                        {effectivelyExpanded && (
                            <>
                                <span className="flex-1 text-start">
                                    {theme === 'dark' ? getLabel('الوضع النهاري', 'Light Mode') : getLabel('الوضع الليلي', 'Dark Mode')}
                                </span>
                                <div className={`w-9 h-5 rounded-full flex items-center transition-all duration-300 px-0.5 ${theme === 'dark' ? 'justify-end' : 'justify-start'}`}
                                    style={{ background: theme === 'dark' ? 'var(--color-primary)' : 'var(--border-default)' }}>
                                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                                </div>
                            </>
                        )}
                    </button>
                </Tooltip>

                {/* Language Toggle — only when expanded */}
                {effectivelyExpanded && (
                    <div className="flex gap-2">
                        <Link
                            href={`/en/dashboard`}
                            className={`flex-1 text-center text-xs py-1.5 rounded-lg transition-all font-medium ${locale === 'en' ? 'bg-primary-600/20 text-primary-400' : ''}`}
                            style={locale !== 'en' ? { color: 'var(--text-muted)', background: 'var(--bg-surface-hover)' } : {}}
                        >EN</Link>
                        <Link
                            href={`/ar/dashboard`}
                            className={`flex-1 text-center text-xs py-1.5 rounded-lg transition-all font-arabic font-medium ${locale === 'ar' ? 'bg-primary-600/20 text-primary-400' : ''}`}
                            style={locale !== 'ar' ? { color: 'var(--text-muted)', background: 'var(--bg-surface-hover)' } : {}}
                        >عربي</Link>
                    </div>
                )}

                {/* Logout */}
                <Tooltip label={getLabel('تسجيل الخروج', 'Sign Out')} collapsed={!effectivelyExpanded} isRTL={isRTL}>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.06)' }}
                    >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.logout} />
                        </svg>
                        {effectivelyExpanded && <span>{getLabel('تسجيل الخروج', 'Sign Out')}</span>}
                    </button>
                </Tooltip>
            </div>
        </aside>
    );
}
