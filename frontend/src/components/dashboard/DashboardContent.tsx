'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useDashboardData } from '@/hooks/useDashboard';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import toast from 'react-hot-toast';
import PayableRemindersWidget from './PayableRemindersWidget';
import ReceivableRemindersWidget from './ReceivableRemindersWidget';
import ClockWidget from './ClockWidget';
import DashboardSkeleton from './DashboardSkeleton';
import PeriodSelector, { type DashboardPeriod } from './PeriodSelector';
import { CHART_COLORS as COLORS } from '@/lib/chart-colors';

const defaultAccountsPie = [
    { name: 'Assets',      nameAr: 'الأصول',          value: 0 },
    { name: 'Liabilities', nameAr: 'الخصوم',           value: 0 },
    { name: 'Equity',      nameAr: 'حقوق الملكية',     value: 0 },
];

// ── Helpers ────────────────────────────────────────────────────────
function EmptyRow({ cols, message }: { cols: number; message: string }) {
    return (
        <tr>
            <td colSpan={cols} className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                {message}
            </td>
        </tr>
    );
}

function MiniStat({ label, value, color = '' }: { label: string; value: string; color?: string }) {
    return (
        <div
            className="text-center p-3 rounded-xl"
            style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)' }}
        >
            <p className="text-xs mb-1 truncate" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className={`text-lg font-bold ${color}`} style={!color ? { color: 'var(--text-primary)' } : {}}>
                {value}
            </p>
        </div>
    );
}

function SectionHeader({
    title, href, icon, locale,
    viewAllLabel,
}: {
    title: string; href: string; icon: string; locale: string; viewAllLabel: string;
}) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
                <span className="text-xl" aria-hidden="true">{icon}</span>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</h3>
            </div>
            <Link
                href={`/${locale}/dashboard${href}`}
                className="text-xs font-medium transition-colors flex items-center gap-1 group"
                style={{ color: 'var(--color-primary)' }}
            >
                {viewAllLabel}
                <svg
                    className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </Link>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────
interface DashboardContentProps {
    dict: any;
    locale: string;
}

export default function DashboardContent({ dict, locale }: DashboardContentProps) {
    const isRTL = locale === 'ar';
    const [period, setPeriod] = useState<DashboardPeriod>('month');
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const { data: dashboardData, isLoading, isError, refetch, isFetching } = useDashboardData(period);

    const handleRefresh = useCallback(async () => {
        try {
            await refetch();
            setLastRefresh(new Date());
            toast.success(isRTL ? 'تم تحديث البيانات' : 'Data refreshed');
        } catch {
            toast.error(isRTL ? 'فشل التحديث' : 'Refresh failed');
        }
    }, [refetch, isRTL]);

    // ── Derived data ────────────────────────────────────────────────
    const invoices       = dashboardData?.salesRows    || [];
    const purchases      = dashboardData?.purRows      || [];
    const products       = dashboardData?.invRows      || [];
    const customers      = dashboardData?.custRows     || [];
    const aiForecasts    = dashboardData?.forecastsData || [];
    const tasksDash      = dashboardData?.tasksDashData || null;
    const kpis           = dashboardData?.kpis         || {};

    const s = kpis.summary || {};
    const statsSummary = {
        totalSales:           Number(s.total_sales       || 0),
        totalPurchases:       Number(s.total_purchases   || 0),
        totalProducts:        Number(s.total_products    || 0),
        totalCustomers:       Number(s.total_customers   || 0),
        todayInvoicesCount:   Number(s.today_invoices_count   || invoices.length),
        pendingAmount:        Number(s.pending_amount    || 0),
        todayPurchasesCount:  Number(s.today_purchases_count  || purchases.length),
        purchaseOrdersCount:  Number(s.purchase_orders_count  || purchases.length),
        activeProducts:       Number(s.active_products   || products.length),
        lowStockCount:        Number(s.low_stock_count   || 0),
        revenue:              Number(s.revenue           || s.total_sales       || 0),
        expenses:             Number(s.expenses          || s.total_purchases   || 0),
        netIncome:            Number(s.net_income        || (Number(s.total_sales || 0) - Number(s.total_purchases || 0))),
        activeCustomers:      Number(s.active_customers  || customers.length),
        overduePaymentsCount: Number(s.overdue_payments_count || 0),
        newCustomersThisMonth:Number(s.new_customers_this_month || 0),
        pendingDelivery:      Number(s.pending_delivery  || 0),
        supplierPayments:     Number(s.supplier_payments || 0),
    };

    const topProducts        = kpis.top_products        || [];
    const topCustomers       = kpis.top_customers       || [];
    const deadStock          = kpis.dead_stock          || [];
    const vatSummary         = kpis.vat_summary         || null;
    const receivablesAging   = kpis.receivables_aging   || null;
    const payablesAging      = kpis.payables_aging      || null;
    const liquidity          = kpis.liquidity           || null;
    const pendingTasks       = kpis.pending_tasks       || null;
    const grossMargin        = kpis.gross_margin        || null;
    const salesReps          = kpis.top_sales_reps      || [];
    const liveAuditTrail     = kpis.live_audit_trail    || [];
    const expensesBreakdown  = kpis.expenses_breakdown  || [];
    const dailySalesData     = (kpis.daily_sales || []).map((d: any) => ({
        ...d, revenue: Number(d.revenue || 0),
    }));

    const ad = kpis.accounts_distribution;
    const accountsPie = ad
        ? [
            { name: 'Assets',      nameAr: 'الأصول',        value: ad.assets      || 0 },
            { name: 'Liabilities', nameAr: 'الخصوم',        value: ad.liabilities || 0 },
            { name: 'Equity',      nameAr: 'حقوق الملكية',  value: ad.equity      || 0 },
        ]
        : defaultAccountsPie;

    // ── Formatting ──────────────────────────────────────────────────
    const { format: formatAmount } = useCurrencyFormatter();
    const formatCurrency = useCallback(
        (val: number) => formatAmount(val),
        [formatAmount]
    );

    const periodLabel = { today: isRTL ? 'اليوم' : 'Today', week: isRTL ? 'هذا الأسبوع' : 'This Week', month: isRTL ? 'هذا الشهر' : 'This Month', year: isRTL ? 'هذه السنة' : 'This Year' }[period];

    const tooltipStyle = {
        backgroundColor: 'var(--bg-modal)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-modal)',
    };

    const viewAll = isRTL ? 'عرض الكل' : 'View All';

    // ── Loading / Error states ──────────────────────────────────────
    if (isLoading) return <DashboardSkeleton />;

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'تعذّر تحميل بيانات لوحة التحكم' : 'Failed to load dashboard data'}
                </p>
                <button onClick={handleRefresh} className="btn-primary text-sm">
                    {isRTL ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </div>
        );
    }

    // ── KPI card definitions ─────────────────────────────────────────
    const kpiCards = [
        {
            label: dict.dashboard.totalSales,
            value: statsSummary.totalSales,
            sub: `${statsSummary.todayInvoicesCount} ${isRTL ? 'فاتورة اليوم' : 'invoices today'}`,
            isPositive: true,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            gradient: 'from-emerald-500/15 to-emerald-600/5',
            iconBg: 'rgba(16,185,129,0.12)',
            iconColor: '#10b981',
            borderHover: 'hover:border-emerald-500/30',
        },
        {
            label: dict.dashboard.totalPurchases,
            value: statsSummary.totalPurchases,
            sub: `${statsSummary.purchaseOrdersCount} ${isRTL ? 'طلب شراء' : 'purchase orders'}`,
            isPositive: true,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
            ),
            gradient: 'from-blue-500/15 to-blue-600/5',
            iconBg: 'rgba(59,130,246,0.12)',
            iconColor: '#3b82f6',
            borderHover: 'hover:border-blue-500/30',
        },
        {
            label: dict.dashboard.totalCustomers,
            value: statsSummary.totalCustomers,
            sub: `${statsSummary.newCustomersThisMonth} ${isRTL ? 'عميل جديد هذا الشهر' : 'new this month'}`,
            isPositive: true,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            gradient: 'from-violet-500/15 to-violet-600/5',
            iconBg: 'rgba(139,92,246,0.12)',
            iconColor: '#8b5cf6',
            borderHover: 'hover:border-violet-500/30',
        },
        {
            label: dict.dashboard.totalProducts,
            value: statsSummary.totalProducts,
            sub: `${statsSummary.lowStockCount} ${isRTL ? 'منتج تحت الحد' : 'low stock'}`,
            isPositive: statsSummary.lowStockCount === 0,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            ),
            gradient: 'from-amber-500/15 to-amber-600/5',
            iconBg: 'rgba(245,158,11,0.12)',
            iconColor: '#f59e0b',
            borderHover: 'hover:border-amber-500/30',
        },
    ];

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 animate-fade-in">

            {/* ── Page Header ── */}
            <div className="flex flex-col gap-4">
                {/* Title row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
                            {dict.dashboard.title}
                        </h1>
                        <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'نظرة شاملة على أداء الأعمال' : 'Comprehensive overview of business performance'}
                            <span className="opacity-50">·</span>
                            <span>{periodLabel}</span>
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        <ClockWidget isRTL={isRTL} />

                        {/* Refresh */}
                        <button
                            onClick={handleRefresh}
                            disabled={isFetching}
                            className="hidden md:flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                            title={`${isRTL ? 'آخر تحديث' : 'Last updated'}: ${lastRefresh.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`}
                        >
                            <svg
                                className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isRTL ? 'تحديث' : 'Refresh'}
                        </button>

                        <Link
                            href={`/${locale}/dashboard/pos`}
                            className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M9 7V5a2 2 0 012-2h6l2 2v8a2 2 0 01-2 2h-2M9 7h2a2 2 0 012 2v2" />
                            </svg>
                            {isRTL ? 'نقطة البيع' : 'Open POS'}
                        </Link>
                    </div>
                </div>

                {/* Period selector row */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <PeriodSelector value={period} onChange={setPeriod} isRTL={isRTL} />
                    <p className="text-[11px] hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                        {isRTL
                            ? `آخر تحديث: ${lastRefresh.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`
                            : `Last updated: ${lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                </div>
            </div>

            {/* ── Quick Access ── */}
            <nav aria-label={isRTL ? 'روابط سريعة' : 'Quick access'}>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                        { label: dict.common.sales,        icon: '🧾', href: '/sales',       hoverBorder: 'hover:border-emerald-500/30' },
                        { label: dict.common.inventory,    icon: '📦', href: '/inventory',   hoverBorder: 'hover:border-blue-500/30' },
                        { label: dict.common.purchases,    icon: '🛒', href: '/purchases',   hoverBorder: 'hover:border-orange-500/30' },
                        { label: dict.common.accounting,   icon: '📊', href: '/accounting',  hoverBorder: 'hover:border-purple-500/30' },
                        { label: isRTL ? 'المهام' : 'Tasks', icon: '✅', href: '/tasks',    hoverBorder: 'hover:border-indigo-500/30' },
                        { label: dict.common.settings,     icon: '⚙️', href: '/settings',   hoverBorder: 'hover:border-slate-400/30' },
                    ].map((item) => (
                        <Link
                            key={item.href}
                            href={`/${locale}/dashboard${item.href}`}
                            className={`relative overflow-hidden flex flex-col items-center gap-2 p-4 rounded-xl border ${item.hoverBorder} transition-all duration-300 group`}
                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
                        >
                            <span className="relative text-2xl group-hover:scale-110 transition-transform duration-300" aria-hidden="true">{item.icon}</span>
                            <span className="relative text-xs font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>

            {/* ── KPI Cards ── */}
            <section aria-label={isRTL ? 'مؤشرات الأداء' : 'Key performance indicators'}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {kpiCards.map((card, i) => (
                        <div
                            key={i}
                            className={`glass-card relative overflow-hidden p-6 ${card.borderHover} transition-all duration-300`}
                            style={{ animationDelay: `${i * 80}ms` }}
                        >
                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.gradient} opacity-50`} aria-hidden="true" />
                            <div className="relative flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium uppercase tracking-wider truncate" style={{ color: 'var(--text-muted)' }}>
                                        {card.label}
                                    </p>
                                    <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: 'var(--text-heading)' }}>
                                        {card.value > 9999 ? formatCurrency(card.value) : card.value.toLocaleString()}
                                    </p>
                                </div>
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ms-2"
                                    style={{ background: card.iconBg, color: card.iconColor }}
                                    aria-hidden="true"
                                >
                                    {card.icon}
                                </div>
                            </div>
                            <div className="relative mt-3 flex items-center gap-1.5">
                                <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${card.isPositive ? 'text-green-700 dark:text-green-300 bg-green-500/10' : 'text-amber-700 dark:text-amber-300 bg-amber-500/10'}`}
                                >
                                    {card.sub}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Charts: Revenue + Accounts Distribution ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Area Chart */}
                <div className="lg:col-span-2 glass-card p-6 min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>
                        {dict.dashboard.salesChart}
                    </h3>
                    <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                        {dict.dashboard.revenue} (SAR) — {periodLabel}
                    </p>
                    <div className="flex-1 w-full min-h-[200px]">
                        {dailySalesData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailySalesData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false} tickLine={false}
                                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                        tickFormatter={(v) => v ? String(v).split('-').slice(1).join('/') : ''}
                                    />
                                    <YAxis
                                        axisLine={false} tickLine={false}
                                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                        mirror={isRTL}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v) => [formatCurrency(Number(v)), isRTL ? 'الإيرادات' : 'Revenue']}
                                    />
                                    <Area
                                        type="monotone" dataKey="revenue"
                                        stroke="var(--color-primary)" strokeWidth={3}
                                        fillOpacity={1} fill="url(#colorRev)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? 'لا توجد بيانات مبيعات لهذه الفترة' : 'No sales data for this period'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Accounts Pie */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>
                        {isRTL ? 'توزيع الحسابات' : 'Account Distribution'}
                    </h3>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{dict.accounting.balanceSheet}</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={accountsPie} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={5} dataKey="value">
                                {accountsPie.map((_, idx) => (
                                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                        {accountsPie.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} aria-hidden="true" />
                                    <span style={{ color: 'var(--text-secondary)' }}>{isRTL ? item.nameAr : item.name}</span>
                                </div>
                                <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                    {formatCurrency(item.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Sales Summary ── */}
            <section className="glass-card p-6" aria-label={dict.dashboard.salesSummary}>
                <SectionHeader title={dict.dashboard.salesSummary} href="/sales" icon="💰" locale={locale} viewAllLabel={viewAll} />

                {/* Quick Action Buttons — each linked to the correct page */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                    {[
                        { label: dict.sales.createInvoice, icon: '🧾', href: '/sales/create',  border: 'border-emerald-500/20 hover:border-emerald-400/40' },
                        { label: dict.sales.quickSale,     icon: '⚡', href: '/pos',            border: 'border-yellow-500/20 hover:border-yellow-400/40' },
                        { label: dict.sales.salesReport,   icon: '📋', href: '/sales/list',     border: 'border-blue-500/20   hover:border-blue-400/40' },
                        { label: dict.sales.returns,       icon: '🔄', href: '/returns',        border: 'border-orange-500/20 hover:border-orange-400/40' },
                        { label: dict.sales.createReturn,  icon: '↩️', href: '/returns',        border: 'border-red-500/20    hover:border-red-400/40' },
                    ].map((action) => (
                        <Link
                            key={action.href + action.label}
                            href={`/${locale}/dashboard${action.href}`}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border ${action.border} transition-all duration-300 group`}
                            style={{ background: 'var(--bg-surface-secondary)' }}
                        >
                            <span className="text-lg group-hover:scale-110 transition-transform duration-300" aria-hidden="true">{action.icon}</span>
                            <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{action.label}</span>
                        </Link>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="grid grid-cols-2 gap-3">
                        <MiniStat label={dict.dashboard.todayInvoices}  value={statsSummary.todayInvoicesCount.toString()} />
                        <MiniStat label={dict.dashboard.pendingAmount}  value={formatCurrency(statsSummary.pendingAmount)} color="text-yellow-500 dark:text-yellow-400" />
                        <MiniStat label={dict.dashboard.revenue}        value={formatCurrency(statsSummary.revenue)} color="text-green-600 dark:text-green-400" />
                        <MiniStat label={dict.dashboard.netIncome}      value={formatCurrency(statsSummary.netIncome)} color="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                        <div className="overflow-x-auto"><table className="data-table">
                            <thead>
                                <tr>
                                    <th>{dict.sales.invoiceNumber}</th>
                                    <th>{dict.sales.customer}</th>
                                    <th>{dict.common.total}</th>
                                    <th>{dict.common.status}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length > 0 ? invoices.map((inv: any) => (
                                    <tr key={inv.id}>
                                        <td className="font-medium text-sm" style={{ color: 'var(--color-primary)' }}>
                                            {inv.invoice_number || inv.number || inv.id?.substring(0, 8) || '---'}
                                        </td>
                                        <td className="text-sm">{inv.customer?.name || (isRTL ? 'عميل نقدي' : 'Cash Customer')}</td>
                                        <td className="text-sm tabular-nums">{formatCurrency(Number(inv.total_amount || 0))}</td>
                                        <td>
                                            <span className={`badge ${inv.status === 'confirmed' ? 'badge-success' : inv.status === 'draft' ? 'badge-warning' : 'badge-danger'}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <EmptyRow cols={4} message={isRTL ? 'لا توجد فواتير حديثة' : 'No recent invoices'} />
                                )}
                            </tbody>
                        </table></div>
                    </div>
                </div>
            </section>

            {/* ── Purchases Summary ── */}
            <section className="glass-card p-6" aria-label={dict.dashboard.purchasesSummary}>
                <SectionHeader title={dict.dashboard.purchasesSummary} href="/purchases" icon="🛒" locale={locale} viewAllLabel={viewAll} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="grid grid-cols-2 gap-3">
                        <MiniStat label={dict.dashboard.purchaseOrders}    value={statsSummary.purchaseOrdersCount.toString()} />
                        <MiniStat label={dict.dashboard.todayPurchases}    value={statsSummary.todayPurchasesCount.toString()} />
                        <MiniStat label={dict.dashboard.supplierPayments}  value={formatCurrency(statsSummary.supplierPayments)} color="text-blue-600 dark:text-blue-400" />
                        <MiniStat label={dict.dashboard.pendingDelivery}   value={statsSummary.pendingDelivery.toString()} color="text-yellow-500 dark:text-yellow-400" />
                    </div>
                    <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                        <div className="overflow-x-auto"><table className="data-table">
                            <thead>
                                <tr>
                                    <th>{dict.purchases.orderNumber}</th>
                                    <th>{dict.purchases.supplier}</th>
                                    <th>{dict.common.total}</th>
                                    <th>{dict.common.status}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.length > 0 ? purchases.map((po: any) => (
                                    <tr key={po.id}>
                                        <td className="font-medium text-sm" style={{ color: 'var(--color-primary)' }}>
                                            {po.invoice_number || po.number || po.id?.substring(0, 8) || '---'}
                                        </td>
                                        <td className="text-sm">{po.supplier?.name || '---'}</td>
                                        <td className="text-sm tabular-nums">{formatCurrency(Number(po.total_amount || 0))}</td>
                                        <td>
                                            <span className={`badge ${po.status === 'received' ? 'badge-success' : po.status === 'draft' ? 'badge-warning' : 'badge-info'}`}>
                                                {po.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <EmptyRow cols={4} message={isRTL ? 'لا توجد مشتريات حديثة' : 'No recent purchases'} />
                                )}
                            </tbody>
                        </table></div>
                    </div>
                </div>
            </section>

            {/* ── Receivables + Payables Reminders ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReceivableRemindersWidget isRTL={isRTL} formatCurrency={formatCurrency} />
                <PayableRemindersWidget    isRTL={isRTL} formatCurrency={formatCurrency} />
            </div>

            {/* ── Inventory + Accounting ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inventory */}
                <section className="glass-card p-6" aria-label={dict.dashboard.inventorySummary}>
                    <SectionHeader title={dict.dashboard.inventorySummary} href="/inventory" icon="📦" locale={locale} viewAllLabel={viewAll} />
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <MiniStat label={dict.dashboard.totalProducts}   value={statsSummary.totalProducts.toLocaleString()} />
                        <MiniStat label={dict.dashboard.activeProducts}  value={statsSummary.activeProducts.toLocaleString()} color="text-green-600 dark:text-green-400" />
                        <MiniStat label={dict.dashboard.lowStockItems}   value={(statsSummary.lowStockCount || aiForecasts.length).toString()} color="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-xs uppercase tracking-wider flex items-center gap-1 font-semibold text-rose-500">
                                🤖 {isRTL ? 'تنبؤات نفاذ المخزون (AI)' : 'AI Depletion Forecast'}
                            </p>
                            {aiForecasts.length > 0 && (
                                <Link
                                    href={`/${locale}/dashboard/purchases/smart-orders`}
                                    className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
                                >
                                    ⚡ {isRTL ? 'مسودة شراء ذكية' : 'Smart PO Draft'}
                                </Link>
                            )}
                        </div>
                        <div className="space-y-2">
                            {aiForecasts.slice(0, 4).map((f: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                                    <div className="min-w-0">
                                        <span className="text-sm font-medium block truncate" style={{ color: 'var(--text-primary)' }}>
                                            {isRTL ? f.name_ar : f.name}
                                        </span>
                                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                            {isRTL ? `البيع اليومي: ${f.daily_velocity} | المخزون: ${f.current_stock}` : `Daily: ${f.daily_velocity} | Stock: ${f.current_stock}`}
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0 ms-2">
                                        {isRTL ? `ينفد خلال ${f.days_to_empty} يوم` : `${f.days_to_empty}d left`}
                                    </span>
                                </div>
                            ))}
                            {aiForecasts.length === 0 && (
                                <div className="text-center text-sm p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400">
                                    ✨ {isRTL ? 'المخزون بوضع ممتاز!' : 'Inventory is completely healthy!'}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Accounting */}
                <section className="glass-card p-6" aria-label={dict.dashboard.accountingSummary}>
                    <SectionHeader title={dict.dashboard.accountingSummary} href="/accounting" icon="📊" locale={locale} viewAllLabel={viewAll} />
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <MiniStat label={dict.dashboard.revenue}   value={formatCurrency(statsSummary.revenue)}   color="text-green-600 dark:text-green-400" />
                        <MiniStat label={dict.dashboard.expenses}  value={formatCurrency(statsSummary.expenses)}  color="text-red-600 dark:text-red-400" />
                        <MiniStat label={dict.dashboard.netIncome} value={formatCurrency(statsSummary.netIncome)} color="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'روابط سريعة' : 'Quick Links'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { title: dict.accounting.chartOfAccounts,  icon: '🌳', href: '/accounting' },
                            { title: dict.accounting.journalEntries,   icon: '📝', href: '/accounting' },
                            { title: dict.accounting.trialBalance,     icon: '⚖️', href: '/accounting' },
                            { title: dict.accounting.incomeStatement,  icon: '📈', href: '/accounting' },
                            { title: dict.accounting.balanceSheet,     icon: '📊', href: '/accounting' },
                            { title: dict.accounting.generalLedger,    icon: '📒', href: '/accounting' },
                        ].map((link) => (
                            <Link
                                key={link.title}
                                href={`/${locale}/dashboard${link.href}`}
                                className="flex items-center gap-2 p-2.5 rounded-lg transition-all text-sm group hover:opacity-80"
                                style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                            >
                                <span className="text-base" aria-hidden="true">{link.icon}</span>
                                <span className="truncate">{link.title}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>

            {/* ── Customers + Top Products ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customers */}
                <section className="glass-card p-6" aria-label={dict.dashboard.customersSummary}>
                    <SectionHeader title={dict.dashboard.customersSummary} href="/customers" icon="👥" locale={locale} viewAllLabel={viewAll} />
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <MiniStat label={dict.dashboard.activeCustomers} value={statsSummary.activeCustomers.toLocaleString()} color="text-green-600 dark:text-green-400" />
                        <MiniStat label={dict.dashboard.newThisMonth}    value={statsSummary.newCustomersThisMonth.toString()}  color="text-indigo-600 dark:text-indigo-400" />
                        <MiniStat label={dict.dashboard.overduePayments} value={statsSummary.overduePaymentsCount.toString()}   color="text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'أفضل العملاء' : 'Top Customers'}
                    </p>
                    <div className="space-y-2">
                        {topCustomers.length > 0 ? topCustomers.map((c: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)' }}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border flex-shrink-0"
                                        style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)', color: 'var(--color-primary)' }}>
                                        {i + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{isRTL ? c.name_ar : c.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.orders_count} {isRTL ? 'طلب' : 'orders'}</p>
                                    </div>
                                </div>
                                <span className="text-sm text-green-600 dark:text-green-400 font-semibold tabular-nums flex-shrink-0 ms-2">
                                    {formatCurrency(c.total_spent)}
                                </span>
                            </div>
                        )) : (
                            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                                {isRTL ? 'لا يوجد عملاء بعد' : 'No customers yet'}
                            </p>
                        )}
                    </div>
                </section>

                {/* Top Products */}
                <section className="glass-card p-6" aria-label={dict.dashboard.topProducts}>
                    <SectionHeader title={dict.dashboard.topProducts} href="/inventory" icon="🏷️" locale={locale} viewAllLabel={viewAll} />
                    <div className="space-y-3 mt-2">
                        {topProducts.length > 0 ? topProducts.map((p: any, i: number) => {
                            const maxSales = topProducts[0]?.total_sold || 1;
                            const pct      = Math.round((Number(p.total_sold || 0) / maxSales) * 100);
                            const clr      = COLORS[i % COLORS.length];
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: clr }}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                                            {isRTL ? p.name_ar : p.name}
                                        </p>
                                        {(p.oem_number || p.brand) && (
                                            <p className="text-xs truncate opacity-70" style={{ color: 'var(--text-muted)' }}>
                                                {p.brand ? `${p.brand} — ` : ''}{p.oem_number}
                                            </p>
                                        )}
                                    </div>
                                    <div className="hidden sm:block w-20 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-secondary)' }}>
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: clr, opacity: 0.85 }} />
                                    </div>
                                    <span className="w-10 text-sm font-bold flex-shrink-0 text-end tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                        {p.total_sold}
                                    </span>
                                </div>
                            );
                        }) : (
                            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                                {isRTL ? 'لا توجد مبيعات بعد' : 'No sales yet'}
                            </p>
                        )}
                    </div>
                </section>
            </div>

            {/* ── Spare Parts Intelligence ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dead Stock */}
                <section className="glass-card p-6" style={{ borderColor: 'rgba(239,68,68,0.2)' }} aria-label={isRTL ? 'المخزون الراكد' : 'Dead Stock'}>
                    <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-xl" aria-hidden="true">⚠️</span>
                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                            {isRTL ? 'المخزون الراكد (Dead Stock)' : 'Dead Stock Alert'}
                        </h3>
                    </div>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'قطع بدون مبيعات مؤخراً — ينصح بتصفيتها' : 'Parts with zero recent sales, recommended for clearance'}
                    </p>
                    <div className="space-y-2">
                        {deadStock.length > 0 ? deadStock.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-sm text-red-900 dark:text-red-200 truncate">{isRTL ? p.name_ar : p.name}</h4>
                                    <div className="text-xs text-red-700 dark:text-red-400 mt-0.5 flex gap-2 flex-wrap">
                                        <span>OEM: {p.oem_number || 'N/A'}</span>
                                        {p.brand && <span>| {p.brand}</span>}
                                    </div>
                                </div>
                                <div className="text-end flex-shrink-0 ms-2">
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{isRTL ? 'كمية:' : 'Qty:'} {p.total_stock}</p>
                                    <p className="text-sm font-bold text-red-800 dark:text-red-300">{formatCurrency(p.total_value)}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400 text-sm">
                                {isRTL ? '✅ لا توجد قطع راكدة! مخزونك سليم.' : '✅ No dead stock! Your inventory is healthy.'}
                            </div>
                        )}
                    </div>
                </section>

                {/* Payables Aging — replaces the duplicate "Fast Movers" widget */}
                <section className="glass-card p-6" style={{ borderColor: 'rgba(245,158,11,0.2)' }} aria-label={isRTL ? 'أعمار الديون على الموردين' : 'Payables Aging'}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl" aria-hidden="true">🏦</span>
                        <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                            {isRTL ? 'أعمار المستحقات على الموردين' : 'Payables Aging'}
                        </h3>
                    </div>
                    {payablesAging ? (
                        <div className="space-y-3">
                            {[
                                { label: isRTL ? '0 – 30 يوم' : '0 – 30 Days', key: '0_30',    color: 'text-green-600 dark:text-green-400',  bg: 'border-green-500/20 bg-green-500/5' },
                                { label: isRTL ? '31 – 60 يوم' : '31 – 60 Days', key: '31_60', color: 'text-yellow-600 dark:text-yellow-400', bg: 'border-yellow-500/20 bg-yellow-500/5' },
                                { label: isRTL ? '61 – 90 يوم' : '61 – 90 Days', key: '61_90', color: 'text-orange-600 dark:text-orange-400', bg: 'border-orange-500/20 bg-orange-500/5' },
                                { label: isRTL ? 'أكثر من 90 يوم' : 'Over 90 Days', key: 'over_90', color: 'text-red-600 dark:text-red-400', bg: 'border-red-500/20 bg-red-500/5' },
                            ].map(({ label, key, color, bg }) => (
                                <div key={key} className={`flex justify-between items-center p-2.5 rounded-lg border ${bg}`}>
                                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                    <span className={`font-bold tabular-nums ${color}`}>{formatCurrency(payablesAging[key] || 0)}</span>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-dashed" style={{ borderColor: 'var(--border-default)' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'إجمالي المستحقات' : 'Total Payables'}</span>
                                    <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(payablesAging['total'] || 0)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'لا توجد مستحقات مسجلة' : 'No payables recorded'}
                        </p>
                    )}
                </section>
            </div>

            {/* ── Financial Intelligence ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* VAT Summary */}
                <section className="glass-card p-6" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl" aria-hidden="true">🧾</span>
                        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            {isRTL ? 'ملخص ضريبة القيمة المضافة' : 'ZATCA VAT Summary'}
                        </h3>
                    </div>
                    {vatSummary ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'ضريبة المخرجات' : 'Output VAT (Sales)'}</span>
                                <span className="font-bold tabular-nums text-blue-700 dark:text-blue-300">{formatCurrency(vatSummary.outputVat || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'ضريبة المدخلات' : 'Input VAT (Purchases)'}</span>
                                <span className="font-bold tabular-nums text-blue-700 dark:text-blue-300">{formatCurrency(vatSummary.inputVat || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl border" style={{ background: 'var(--bg-surface-secondary)', borderColor: 'rgba(59,130,246,0.25)' }}>
                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'الصافي المستحق (ZATCA)' : 'Net Payable'}</span>
                                <span className={`font-bold tabular-nums ${(vatSummary.netVatPayable || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                    {formatCurrency(vatSummary.netVatPayable || 0)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    )}
                </section>

                {/* Liquidity */}
                <section className="glass-card p-6" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl" aria-hidden="true">💸</span>
                        <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                            {isRTL ? 'السيولة النقدية' : 'Cash & Bank Balances'}
                        </h3>
                    </div>
                    {liquidity ? (
                        <div className="space-y-3">
                            <div className="text-center mb-2">
                                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'إجمالي السيولة' : 'Total Available'}</p>
                                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(liquidity.total || 0)}</p>
                            </div>
                            <div className="space-y-2">
                                {(liquidity.safes || []).slice(0, 3).map((safe: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-2.5 rounded-lg" style={{ background: 'var(--bg-surface-secondary)' }}>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span aria-hidden="true">{safe.type === 'bank' ? '🏦' : '💵'}</span>
                                            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{isRTL ? safe.name_ar : safe.name}</span>
                                        </div>
                                        <span className="text-sm font-bold tabular-nums flex-shrink-0 ms-2" style={{ color: 'var(--text-primary)' }}>{formatCurrency(safe.balance)}</span>
                                    </div>
                                ))}
                                {(liquidity.safes || []).length === 0 && (
                                    <p className="text-sm text-center py-2" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'لا توجد حسابات مالية' : 'No financial accounts'}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    )}
                </section>

                {/* Receivables Aging */}
                <section className="glass-card p-6" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl" aria-hidden="true">⏳</span>
                        <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                            {isRTL ? 'أعمار الذمم المدينة' : 'Receivables Aging'}
                        </h3>
                    </div>
                    {receivablesAging ? (
                        <div className="space-y-3">
                            {[
                                { label: isRTL ? '0 – 30 يوم' : '0 – 30 Days',    key: '0_30',    color: 'text-green-600 dark:text-green-400',   bg: 'border-green-500/20 bg-green-500/5' },
                                { label: isRTL ? '31 – 60 يوم' : '31 – 60 Days',  key: '31_60',   color: 'text-yellow-600 dark:text-yellow-400',  bg: 'border-yellow-500/20 bg-yellow-500/5' },
                                { label: isRTL ? '61 – 90 يوم' : '61 – 90 Days',  key: '61_90',   color: 'text-orange-600 dark:text-orange-400',  bg: 'border-orange-500/20 bg-orange-500/5' },
                                { label: isRTL ? 'أكثر من 90 يوم' : 'Over 90 Days', key: 'over_90', color: 'text-red-600 dark:text-red-400',    bg: 'border-red-500/20 bg-red-500/5' },
                            ].map(({ label, key, color, bg }) => (
                                <div key={key} className={`flex justify-between items-center p-2.5 rounded-lg border ${bg}`}>
                                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                    <span className={`font-bold tabular-nums ${color}`}>{formatCurrency(receivablesAging[key] || 0)}</span>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-dashed" style={{ borderColor: 'var(--border-default)' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'إجمالي المديونيات' : 'Total Receivables'}</span>
                                    <span className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(receivablesAging['total'] || 0)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    )}
                </section>
            </div>

            {/* ── Command Center ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Pending Tasks */}
                <section className="glass-card p-6" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl" aria-hidden="true">🔔</span>
                        <h3 className="text-base font-semibold text-red-600 dark:text-red-400">
                            {isRTL ? 'المهام المعلقة' : 'Action Center'}
                        </h3>
                    </div>
                    {pendingTasks ? (
                        <div className="space-y-2.5">
                            {[
                                { label: isRTL ? 'فواتير مسودة' : 'Draft Invoices',     val: pendingTasks.draft_invoices   },
                                { label: isRTL ? 'طلبات شراء مسودة' : 'Draft POs',      val: pendingTasks.draft_purchases  },
                                { label: isRTL ? 'قيود غير مرحلة' : 'Unposted Journals', val: pendingTasks.unposted_journals },
                            ].map(({ label, val }) => (
                                <div key={label} className="flex justify-between items-center p-2.5 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                    <span className="font-bold text-red-700 dark:text-red-300 px-2 py-0.5 bg-white dark:bg-black/20 rounded-md tabular-nums text-sm">{val}</span>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-dashed flex justify-between items-center" style={{ borderColor: 'var(--border-default)' }}>
                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'الإجمالي' : 'Total'}</span>
                                <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">{pendingTasks.total_pending}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'لا توجد مهام' : 'No pending tasks'}</p>
                    )}
                </section>

                {/* Tasks Management */}
                <section className="glass-card p-6" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl" aria-hidden="true">✅</span>
                            <h3 className="text-base font-semibold text-indigo-600 dark:text-indigo-400">
                                {isRTL ? 'إدارة المهام' : 'Task Board'}
                            </h3>
                        </div>
                        <Link href={`/${locale}/dashboard/tasks`} className="text-xs font-medium text-indigo-600 hover:underline">
                            {viewAll}
                        </Link>
                    </div>
                    {tasksDash?.counts ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-center p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                                    <div className="text-xl font-bold text-indigo-600 tabular-nums">{tasksDash.counts.todo || 0}</div>
                                    <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'للتنفيذ' : 'To Do'}</div>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30">
                                    <div className="text-xl font-bold text-yellow-600 tabular-nums">{tasksDash.counts.in_progress || 0}</div>
                                    <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'جاري' : 'In Progress'}</div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {(tasksDash.urgent || []).slice(0, 3).map((task: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-xs p-1.5 rounded" style={{ background: 'var(--bg-surface-secondary)' }}>
                                        <span className="truncate font-medium" style={{ maxWidth: '150px' }}>🔴 {task.title}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{task.assignee?.name || '---'}</span>
                                    </div>
                                ))}
                                {(!tasksDash.urgent || tasksDash.urgent.length === 0) && (
                                    <p className="text-center text-xs text-green-500 py-2">
                                        {isRTL ? 'لا توجد مهام عاجلة ✨' : 'No urgent tasks ✨'}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    )}
                </section>

                {/* Gross Margin */}
                <section className="glass-card p-6" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl" aria-hidden="true">📈</span>
                        <h3 className="text-base font-semibold text-purple-600 dark:text-purple-400">
                            {isRTL ? 'هامش الربح' : 'Gross Margin'}
                        </h3>
                    </div>
                    {grossMargin ? (
                        <div className="flex flex-col items-center">
                            <div className="relative w-28 h-28 mb-3" role="img" aria-label={`${grossMargin.gross_margin_percent}% gross margin`}>
                                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                    <circle className="text-purple-100 dark:text-purple-900/30" strokeWidth="3" stroke="currentColor" fill="none" r="15.9155" cx="18" cy="18" />
                                    <circle
                                        className="text-purple-500" strokeWidth="3" strokeLinecap="round"
                                        stroke="currentColor" fill="none"
                                        r="15.9155" cx="18" cy="18"
                                        strokeDasharray={`${grossMargin.gross_margin_percent} 100`}
                                        strokeDashoffset="0"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-bold text-purple-700 dark:text-purple-300">{grossMargin.gross_margin_percent}%</span>
                                </div>
                            </div>
                            <div className="w-full space-y-1.5">
                                {[
                                    { label: isRTL ? 'المبيعات' : 'Revenue', val: grossMargin.revenue },
                                    { label: isRTL ? 'تكلفة البضاعة' : 'COGS',    val: grossMargin.cogs    },
                                ].map(({ label, val }) => (
                                    <div key={label} className="flex justify-between text-xs">
                                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                        <span className="font-semibold tabular-nums">{formatCurrency(val)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm pt-2 border-t border-dashed" style={{ borderColor: 'var(--border-default)' }}>
                                    <span className="font-bold text-purple-600 dark:text-purple-400">{isRTL ? 'الربح الإجمالي' : 'Gross Profit'}</span>
                                    <span className="font-bold text-purple-600 dark:text-purple-400 tabular-nums">{formatCurrency(grossMargin.gross_margin_amount)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    )}
                </section>

                {/* Top Sales Reps */}
                <section className="glass-card p-6" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl" aria-hidden="true">🏆</span>
                        <h3 className="text-base font-semibold text-amber-600 dark:text-amber-400">
                            {isRTL ? 'أفضل البائعين' : 'Top Sales Reps'}
                        </h3>
                    </div>
                    {salesReps.length > 0 ? (
                        <div className="space-y-2.5">
                            {salesReps.map((rep: any, i: number) => (
                                <div key={i} className="flex justify-between items-center p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-xs flex-shrink-0">
                                            #{i + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-xs text-amber-900 dark:text-amber-100 truncate">{rep.name}</h4>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400">{rep.invoices_count} {isRTL ? 'فاتورة' : 'invoices'}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-amber-700 dark:text-amber-300 tabular-nums text-xs flex-shrink-0 ms-1">{formatCurrency(rep.total_sales)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
                    )}
                </section>
            </div>

            {/* ── Activity: Audit Trail + Expenses Breakdown ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Audit Trail — RTL fixed: ps-4 border-s-2 */}
                <section className="glass-card p-6" style={{ borderColor: 'rgba(56,189,248,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl" aria-hidden="true">⏱️</span>
                        <h3 className="text-lg font-semibold text-sky-600 dark:text-sky-400">
                            {isRTL ? 'سجل النشاطات الحية' : 'Live Audit Trail'}
                        </h3>
                    </div>
                    {liveAuditTrail.length > 0 ? (
                        <ol className="relative ps-5 border-s-2 border-sky-200 dark:border-sky-800 space-y-5">
                            {liveAuditTrail.map((log: any, i: number) => (
                                <li key={i} className="relative">
                                    <div
                                        className="absolute -start-[9px] w-3.5 h-3.5 bg-sky-500 rounded-full mt-0.5 ring-4 ring-white dark:ring-slate-900"
                                        aria-hidden="true"
                                    />
                                    <p className="text-xs font-bold text-sky-600 dark:text-sky-400">{log.user_name}</p>
                                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>
                                        {isRTL ? 'قام بـ' : 'Performed'}{' '}
                                        <strong className="text-sky-700 dark:text-sky-300">{log.action}</strong>{' '}
                                        {isRTL ? 'على' : 'on'}{' '}
                                        {log.model_type?.split('\\').pop() || 'System'}
                                    </p>
                                    <time className="text-xs mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(log.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
                                    </time>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'لا توجد نشاطات مسجلة' : 'No recent activity'}
                        </p>
                    )}
                </section>

                {/* Expenses Breakdown */}
                <section className="glass-card p-6" style={{ borderColor: 'rgba(236,72,153,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl" aria-hidden="true">💸</span>
                        <h3 className="text-lg font-semibold text-pink-600 dark:text-pink-400">
                            {isRTL ? 'تحليل المصروفات' : 'Expenses Breakdown'}
                        </h3>
                    </div>
                    {expensesBreakdown.length > 0 ? (
                        <>
                            <div className="h-52 mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={expensesBreakdown}
                                            cx="50%" cy="50%"
                                            innerRadius={55} outerRadius={75}
                                            paddingAngle={5} dataKey="total_amount"
                                        >
                                            {expensesBreakdown.map((_: any, idx: number) => (
                                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(v: any) => formatCurrency(v)}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {expensesBreakdown.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} aria-hidden="true" />
                                        <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{isRTL ? item.name_ar : item.name}</span>
                                        <span className="ms-auto font-bold tabular-nums">{formatCurrency(item.total_amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'لا توجد مصروفات مسجلة' : 'No expenses recorded'}
                        </p>
                    )}
                </section>
            </div>

        </div>
    );
}
