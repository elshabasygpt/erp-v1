'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { salesApi, inventoryApi, purchasesApi, crmApi } from '@/lib/api';
import { useDashboardData } from '@/hooks/useDashboard';
import toast from 'react-hot-toast';
import PayableRemindersWidget from './PayableRemindersWidget';
import ReceivableRemindersWidget from './ReceivableRemindersWidget';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

// Accounts distribution for pie chart — filled from API
const defaultAccountsPie = [
    { name: 'Assets', nameAr: 'الأصول', value: 0 },
    { name: 'Liabilities', nameAr: 'الخصوم', value: 0 },
    { name: 'Equity', nameAr: 'حقوق الملكية', value: 0 },
];

// ── Animated Number Component ──
function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const duration = 1200;
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.round((Number(value) || 0) * eased));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);

    return <>{format(displayValue)}</>;
}

// ── Component ──────────────────────────────────────────────────────
interface DashboardContentProps {
    dict: any;
    locale: string;
}

export default function DashboardContent({ dict, locale }: DashboardContentProps) {
    const isRTL = locale === 'ar';
    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);

    const { data: dashboardData, isLoading } = useDashboardData();

    // Derived states from React Query
    const invoices = dashboardData?.salesRows || [];
    const purchases = dashboardData?.purRows || [];
    const products = dashboardData?.invRows || [];
    const customers = dashboardData?.custRows || [];
    const aiForecasts = dashboardData?.forecastsData || [];
    const tasksDash = dashboardData?.tasksDashData || null;
    const kpis = dashboardData?.kpis || {};
    
    const s = kpis.summary || {};
    const statsSummary = {
        totalSales: s.total_sales || 0,
        totalPurchases: s.total_purchases || 0,
        totalProducts: s.total_products || 0,
        totalCustomers: s.total_customers || 0,
        todayInvoicesCount: s.today_invoices_count || invoices.length,
        pendingAmount: s.pending_amount || 0,
        todayPurchasesCount: s.today_purchases_count || purchases.length,
        purchaseOrdersCount: s.purchase_orders_count || purchases.length,
        activeProducts: s.active_products || products.length,
        lowStockCount: s.low_stock_count || 0,
        revenue: s.revenue || s.total_sales || 0,
        expenses: s.expenses || s.total_purchases || 0,
        netIncome: s.net_income || ((s.total_sales || 0) - (s.total_purchases || 0)),
        activeCustomers: s.active_customers || customers.length,
        overduePaymentsCount: s.overdue_payments_count || 0,
        newCustomersThisMonth: s.new_customers_this_month || 0,
        pendingDelivery: s.pending_delivery || 0,
        supplierPayments: s.supplier_payments || 0,
    };

    const topProducts = kpis.top_products || [];
    const topCustomers = kpis.top_customers || [];
    const deadStock = kpis.dead_stock || [];
    const vatSummary = kpis.vat_summary || null;
    const receivablesAging = kpis.receivables_aging || null;
    const payablesAging = kpis.payables_aging || null;
    const liquidity = kpis.liquidity || null;
    const pendingTasks = kpis.pending_tasks || null;
    const grossMargin = kpis.gross_margin || null;
    const salesReps = kpis.top_sales_reps || [];
    const liveAuditTrail = kpis.live_audit_trail || [];
    const expensesBreakdown = kpis.expenses_breakdown || [];
    const dailySalesData = (kpis.daily_sales || []).map((d: any) => ({
        ...d,
        revenue: Number(d.revenue || 0)
    }));

    const ad = kpis.accounts_distribution;
    const accountsPie = ad ? [
        { name: 'Assets', nameAr: 'الأصول', value: ad.assets || 0 },
        { name: 'Liabilities', nameAr: 'الخصوم', value: ad.liabilities || 0 },
        { name: 'Equity', nameAr: 'حقوق الملكية', value: ad.equity || 0 },
    ] : defaultAccountsPie;

    useEffect(() => {
        const tick = () => {
            setCurrentTime(new Date().toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        tick();
        const id = setInterval(tick, 1000);
        setMounted(true);
        return () => clearInterval(id);
    }, [isRTL]);

    if (!mounted) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0,
        }).format(val);

    const handleQuickSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setShowSearchModal(true);
        try {
            const { inventoryApi } = await import('@/lib/api');
            const res = await inventoryApi.getProducts({ search: searchQuery, limit: 10 });
            setSearchResults(res.data?.data || []);
        } catch (err) {

        } finally {
            setIsSearching(false);
        }
    };

    const stats = [
        { label: dict.dashboard.totalSales, value: statsSummary.totalSales, change: '+12.5%', positive: true, icon: '💰', gradient: 'from-emerald-500/15 to-emerald-600/5', iconBg: 'rgba(16,185,129,0.12)', borderHover: 'hover:border-emerald-500/30' },
        { label: dict.dashboard.totalPurchases, value: statsSummary.totalPurchases, change: '+8.2%', positive: true, icon: '📦', gradient: 'from-blue-500/15 to-blue-600/5', iconBg: 'rgba(59,130,246,0.12)', borderHover: 'hover:border-blue-500/30' },
        { label: dict.dashboard.totalCustomers, value: statsSummary.totalCustomers, change: '+5.3%', positive: true, icon: '👥', gradient: 'from-violet-500/15 to-violet-600/5', iconBg: 'rgba(139,92,246,0.12)', borderHover: 'hover:border-violet-500/30' },
        { label: dict.dashboard.totalProducts, value: statsSummary.totalProducts, change: '-2.1%', positive: false, icon: '🏷️', gradient: 'from-amber-500/15 to-amber-600/5', iconBg: 'rgba(245,158,11,0.12)', borderHover: 'hover:border-amber-500/30' },
    ];

    const tooltipStyle = {
        backgroundColor: 'var(--bg-modal)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-modal)',
    };

    // Section header component
    const SectionHeader = ({ title, href, icon }: { title: string; href: string; icon: string }) => (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
                <span className="text-xl">{icon}</span>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</h3>
            </div>
            <Link
                href={`/${locale}/dashboard${href}`}
                className="text-xs font-medium transition-colors flex items-center gap-1 group"
                style={{ color: 'var(--color-primary)' }}
            >
                {dict.dashboard.viewAll}
                <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </Link>
        </div>
    );

    // Mini stat component
    const MiniStat = ({ label, value, color = '' }: { label: string; value: string; color?: string }) => (
        <div className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className={`text-lg font-bold ${color}`} style={!color ? { color: 'var(--text-primary)' } : {}}>{value}</p>
        </div>
    );

    return (
        <>
        <div className="space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>{dict.dashboard.title}</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'نظرة شاملة على أداء الأعمال' : 'Comprehensive overview of business performance'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    {/* OEM Quick Search Form */}
                    <form onSubmit={handleQuickSearch} className="relative w-full sm:w-80 group">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-muted transition-colors group-focus-within:text-indigo-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isRTL ? "بحث برقم القطعة (OEM) / الشاسيه..." : "Search OEM / Part Number..."}
                            className="block w-full p-2.5 ps-10 text-sm rounded-xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500/50"
                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                        />
                        <button type="submit" className="hidden">Search</button>
                    </form>

                    <div className="px-4 py-2.5 rounded-xl text-sm font-mono font-semibold tabular-nums hidden md:block"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--color-primary)' }}>
                        🕐 {currentTime}
                    </div>
                    <Link href={`/${locale}/dashboard/pos`}
                        className="btn-primary flex items-center gap-2 py-2.5 w-full sm:w-auto justify-center">
                        <span>🖥️</span>
                        {isRTL ? 'نقطة البيع' : 'Open POS'}
                    </Link>
                </div>
            </div>

            {/* Quick Search Modal/Results overlay */}
            {showSearchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-surface)' }}>
                        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>
                                {isRTL ? 'نتائج البحث السريع' : 'Quick Search Results'}
                            </h3>
                            <button onClick={() => setShowSearchModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                ✕
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            {isSearching ? (
                                <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
                            ) : searchResults.length > 0 ? (
                                <div className="space-y-3">
                                    {searchResults.map((p, i) => (
                                        <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl border" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-surface-secondary)' }}>
                                            <div>
                                                <h4 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{isRTL ? p.name_ar : p.name}</h4>
                                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                    <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">OEM: {p.oem_number || p.sku || 'N/A'}</span>
                                                    {p.part_number && <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">PN: {p.part_number}</span>}
                                                    {p.brand && <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded">{p.brand}</span>}
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:mt-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${Number(p.stock_quantity) > p.stock_alert_level ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {isRTL ? 'المخزون:' : 'Stock:'} {p.stock_quantity}
                                                </span>
                                                <span className="font-bold text-lg mt-1" style={{ color: 'var(--color-primary)' }}>{formatCurrency(Number(p.sell_price))}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center p-8 text-muted">{isRTL ? 'لا توجد نتائج مطابقة لرقم القطعة.' : 'No matching parts found.'}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Access Shortcuts */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                    { label: dict.common.sales, icon: '🧾', href: '/sales', hoverBorder: 'hover:border-green-500/30' },
                    { label: dict.common.inventory, icon: '📦', href: '/inventory', hoverBorder: 'hover:border-blue-500/30' },
                    { label: dict.common.purchases, icon: '🛒', href: '/purchases', hoverBorder: 'hover:border-orange-500/30' },
                    { label: dict.common.accounting, icon: '📊', href: '/accounting', hoverBorder: 'hover:border-purple-500/30' },
                    { label: isRTL ? 'المهام' : 'Tasks', icon: '✅', href: '/tasks', hoverBorder: 'hover:border-indigo-500/30' },
                    { label: dict.common.settings, icon: '⚙️', href: '/settings', hoverBorder: 'hover:border-slate-400/30' },
                ].map((item, i) => (
                    <Link
                        key={i}
                        href={`/${locale}/dashboard${item.href}`}
                        className={`relative overflow-hidden flex flex-col items-center gap-2 p-4 rounded-xl border ${item.hoverBorder} transition-all duration-300 group`}
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
                    >
                        <span className="relative text-2xl group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                        <span className="relative text-xs font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    </Link>
                ))}
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, i) => (
                    <div key={i}
                        className={`glass-card relative overflow-hidden p-6 ${stat.borderHover} transition-all duration-300`}
                        style={{ animationDelay: `${i * 80}ms` }}>
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-50`} />
                        <div className="relative flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                    {stat.label}
                                </p>
                                <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-heading)' }}>
                                    <AnimatedNumber value={stat.value} format={stat.value > 9999 ? formatCurrency : (v) => v.toLocaleString()} />
                                </p>
                            </div>
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: stat.iconBg }}>
                                {stat.icon}
                            </div>
                        </div>
                        <div className="relative mt-3 flex items-center gap-1.5">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${stat.positive ? 'text-green-600 dark:text-green-400 bg-green-500/10' : 'text-red-600 dark:text-red-400 bg-red-500/10'}`}>
                                {stat.change}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {isRTL ? 'مقارنة بالشهر الماضي' : 'vs last month'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Revenue & Expenses Chart + Accounts Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6 min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>{dict.dashboard.salesChart}</h3>
                    <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                        {dict.dashboard.revenue} (SAR)
                    </p>
                    <div className="flex-1 w-full min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailySalesData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fill: 'var(--text-muted)'}}
                                    tickFormatter={(val) => val ? String(val).split('-').slice(1).join('/') : ''}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fill: 'var(--text-muted)'}}
                                />
                                <Tooltip 
                                    contentStyle={tooltipStyle}
                                    formatter={(val) => [formatCurrency(Number(val)), isRTL ? 'الإيرادات' : 'Revenue']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="var(--color-primary)" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorRev)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>
                        {isRTL ? 'توزيع الحسابات' : 'Account Distribution'}
                    </h3>
                    <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>{dict.accounting.balanceSheet}</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={accountsPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                                {accountsPie.map((_, index) => (
                                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                        {accountsPie.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>{isRTL ? item.nameAr : item.name}</span>
                                </div>
                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Sales Summary ── */}
            <div className="glass-card p-6">
                <SectionHeader title={dict.dashboard.salesSummary} href="/sales" icon="💰" />

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                    {[
                        { label: dict.sales.createInvoice, icon: '🧾', border: 'border-green-500/20 hover:border-green-400/40' },
                        { label: dict.sales.quickSale, icon: '⚡', border: 'border-yellow-500/20 hover:border-yellow-400/40' },
                        { label: dict.sales.salesReport, icon: '📋', border: 'border-blue-500/20 hover:border-blue-400/40' },
                        { label: dict.sales.returns, icon: '🔄', border: 'border-orange-500/20 hover:border-orange-400/40' },
                        { label: dict.sales.createReturn, icon: '↩️', border: 'border-red-500/20 hover:border-red-400/40' },
                    ].map((action, i) => (
                        <Link
                            key={i}
                            href={`/${locale}/dashboard/sales`}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border ${action.border} transition-all duration-300 group`}
                            style={{ background: 'var(--bg-surface-secondary)' }}
                        >
                            <span className="text-lg group-hover:scale-110 transition-transform duration-300">{action.icon}</span>
                            <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{action.label}</span>
                        </Link>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Mini Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <MiniStat label={dict.dashboard.todayInvoices} value={statsSummary.todayInvoicesCount.toString()} />
                        <MiniStat label={dict.dashboard.pendingAmount} value={formatCurrency(statsSummary.pendingAmount)} color="text-yellow-500 dark:text-yellow-400" />
                        <MiniStat label={dict.dashboard.revenue} value={formatCurrency(statsSummary.revenue)} color="text-green-600 dark:text-green-400" />
                        <MiniStat label={dict.dashboard.netIncome} value={formatCurrency(statsSummary.netIncome)} color="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    {/* Recent Invoices mini table */}
                    <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                        <table className="data-table">
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
                                        <td className="font-medium text-sm" style={{ color: 'var(--color-primary)' }}>{inv.invoice_number || inv.number || inv.id?.substring(0,8) || '---'}</td>
                                        <td className="text-sm" style={{ color: 'var(--text-primary)' }}>{inv.customer?.name || (isRTL ? 'عميل نقدي' : 'Cash Customer')}</td>
                                        <td className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(inv.total_amount || 0))}</td>
                                        <td>
                                            <span className={`badge ${inv.status === 'confirmed' ? 'badge-success' : inv.status === 'draft' ? 'badge-warning' : 'badge-danger'}`}>
                                                {(dict.sales as any)[inv.status] || inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-4 text-muted">
                                            {isRTL ? 'لا توجد فواتير حديثة حتى الآن' : 'No recent invoices yet'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── Purchases Summary ── */}
            <div className="glass-card p-6">
                <SectionHeader title={dict.dashboard.purchasesSummary} href="/purchases" icon="🛒" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="grid grid-cols-2 gap-3">
                        <MiniStat label={dict.dashboard.purchaseOrders} value={statsSummary.purchaseOrdersCount.toString()} />
                        <MiniStat label={dict.dashboard.todayPurchases} value={statsSummary.todayPurchasesCount.toString()} />
                        <MiniStat label={dict.dashboard.supplierPayments} value={formatCurrency(statsSummary.supplierPayments)} color="text-blue-600 dark:text-blue-400" />
                        <MiniStat label={dict.dashboard.pendingDelivery} value={statsSummary.pendingDelivery.toString()} color="text-yellow-500 dark:text-yellow-400" />
                    </div>
                    <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                        <table className="data-table">
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
                                        <td className="font-medium text-sm" style={{ color: 'var(--color-primary)' }}>{po.invoice_number || po.number || po.id?.substring(0,8) || '---'}</td>
                                        <td className="text-sm" style={{ color: 'var(--text-primary)' }}>{po.supplier?.name || '---'}</td>
                                        <td className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(po.total_amount || 0))}</td>
                                        <td>
                                            <span className={`badge ${po.status === 'received' ? 'badge-success' : po.status === 'draft' ? 'badge-warning' : 'badge-info'}`}>
                                                {(dict.purchases as any)[po.status] || po.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-4 text-muted">
                                            {isRTL ? 'لا توجد مشتريات حديثة حتى الآن' : 'No recent purchases yet'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <ReceivableRemindersWidget isRTL={isRTL} formatCurrency={formatCurrency} />
                <PayableRemindersWidget isRTL={isRTL} formatCurrency={formatCurrency} />
            </div>

            {/* ── Inventory + Accounting side by side ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inventory Summary */}
                <div className="glass-card p-6">
                    <SectionHeader title={dict.dashboard.inventorySummary} href="/inventory" icon="📦" />
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <MiniStat label={dict.dashboard.totalProducts} value={statsSummary.totalProducts.toLocaleString()} />
                        <MiniStat label={dict.dashboard.activeProducts} value={statsSummary.activeProducts.toLocaleString()} color="text-green-600 dark:text-green-400" />
                        <MiniStat label={dict.dashboard.lowStockItems} value={(statsSummary.lowStockCount || aiForecasts.length).toString()} color="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-xs uppercase tracking-wider flex items-center gap-1 font-semibold text-rose-500">
                                🤖 {isRTL ? 'تنبؤات نفاذ المخزون (AI)' : 'AI Depletion Forecast'}
                            </p>
                            {aiForecasts.length > 0 && (
                                <Link 
                                    href={`/${locale}/dashboard/purchases/smart-orders`}
                                    className="btn-primary py-1 px-3 text-xs flex items-center gap-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                                >
                                    {isRTL ? '⚡ مسودة شراء ذكية' : '⚡ Smart PO Draft'}
                                </Link>
                            )}
                        </div>
                        <div className="space-y-2">
                            {aiForecasts.slice(0, 4).map((f: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-red-500/20 bg-red-500/5 transition-colors hover:bg-red-500/10">
                                    <div>
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{isRTL ? f.name_ar : f.name}</span>
                                        <div className="text-xs font-mono text-muted mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            البيع اليومي: {f.daily_velocity} / المخزون: {f.current_stock}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                            {isRTL ? 'ينفد خلال' : 'Empty in'} {f.days_to_empty} {isRTL ? 'يوم' : 'days'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {aiForecasts.length === 0 && (
                                <div className="text-center text-sm p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400">
                                     ✨ {isRTL ? 'المخزون بوضع ممتاز بناءً على توقعات المبيعات الحالية!' : 'Inventory is completely healthy based on current sales trajectory!'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Accounting Summary */}
                <div className="glass-card p-6">
                    <SectionHeader title={dict.dashboard.accountingSummary} href="/accounting" icon="📊" />
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <MiniStat label={dict.dashboard.revenue} value={formatCurrency(statsSummary.revenue)} color="text-green-600 dark:text-green-400" />
                        <MiniStat label={dict.dashboard.expenses} value={formatCurrency(statsSummary.expenses)} color="text-red-600 dark:text-red-400" />
                        <MiniStat label={dict.dashboard.netIncome} value={formatCurrency(statsSummary.netIncome)} color="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'روابط سريعة' : 'Quick Links'}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { title: dict.accounting.chartOfAccounts, icon: '🌳' },
                                { title: dict.accounting.journalEntries, icon: '📝' },
                                { title: dict.accounting.trialBalance, icon: '⚖️' },
                                { title: dict.accounting.incomeStatement, icon: '📈' },
                                { title: dict.accounting.balanceSheet, icon: '📊' },
                                { title: dict.accounting.generalLedger, icon: '📒' },
                            ].map((link, i) => (
                                <Link
                                    key={i}
                                    href={`/${locale}/dashboard/accounting`}
                                    className="flex items-center gap-2 p-2.5 rounded-lg transition-all text-sm group"
                                    style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                                >
                                    <span className="text-base">{link.icon}</span>
                                    <span className="truncate">{link.title}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Customers Summary + Top Products ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customers Summary */}
                <div className="glass-card p-6">
                    <SectionHeader title={dict.dashboard.customersSummary} href="/customers" icon="👥" />
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <MiniStat label={dict.dashboard.activeCustomers} value={statsSummary.activeCustomers.toLocaleString()} color="text-green-600 dark:text-green-400" />
                        <MiniStat label={dict.dashboard.newThisMonth} value={statsSummary.newCustomersThisMonth.toString()} color="text-indigo-600 dark:text-indigo-400" />
                        <MiniStat label={dict.dashboard.overduePayments} value={statsSummary.overduePaymentsCount.toString()} color="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'أفضل العملاء' : 'Top Customers'}
                        </p>
                        <div className="space-y-2">
                            {topCustomers.length > 0 ? topCustomers.map((c: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border"
                                            style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)', color: 'var(--color-primary)' }}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{isRTL ? c.name_ar : c.name}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.orders_count} {isRTL ? 'طلب' : 'orders'}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm text-green-600 dark:text-green-400 font-semibold">{formatCurrency(c.total_spent)}</span>
                                </div>
                            )) : (
                                <p className="text-sm text-center py-4 text-muted">{isRTL ? 'لا يوجد عملاء بعد' : 'No customers yet'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Products */}
                <div className="glass-card p-6">
                    <SectionHeader title={dict.dashboard.topProducts} href="/inventory" icon="🏷️" />
                    <div className="space-y-3 mt-2">
                        {topProducts.length > 0 ? topProducts.map((p: any, i: number) => {
                            const maxSales = topProducts[0]?.total_sold || 1;
                            const pctVal = Math.round((Number(p.total_sold || 0) / maxSales) * 100) || 0;
                            const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                        style={{ background: colors[i % colors.length] }}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                                            {isRTL ? p.name_ar : p.name}
                                        </p>
                                        {(p.oem_number || p.brand) && (
                                            <p className="text-xs truncate opacity-70" style={{ color: 'var(--text-muted)' }}>
                                                {p.brand ? p.brand + ' - ' : ''} {p.oem_number}
                                            </p>
                                        )}
                                    </div>
                                    <div className="hidden sm:block w-20 h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-secondary)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${pctVal}%`, background: colors[i % colors.length], opacity: 0.85 }}
                                        />
                                    </div>
                                    <span className="w-10 text-sm font-bold shrink-0 text-end" style={{ color: 'var(--text-primary)' }}>
                                        {p.total_sold}
                                    </span>
                                </div>
                            );
                        }) : (
                            <p className="text-sm text-center py-4 text-muted">{isRTL ? 'لا توجد مبيعات بعد' : 'No sales yet'}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Auto Spare Parts Intelligence ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl">⚠️</span>
                            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                                {isRTL ? 'تحذير القطع الراكدة (Dead Stock)' : 'Dead Stock Alert'}
                            </h3>
                        </div>
                    </div>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'قطع غيار متوفرة في المخزون ولم يتم بيعها مؤخراً، ينصح بتصفيتها.' : 'Parts in stock with zero recent sales, recommended for clearance.'}
                    </p>
                    <div className="space-y-3">
                        {deadStock.length > 0 ? deadStock.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-sm text-red-900 dark:text-red-200 truncate">{isRTL ? p.name_ar : p.name}</h4>
                                    <div className="text-xs text-red-700 dark:text-red-400 mt-1 flex gap-2">
                                        <span>OEM: {p.oem_number || 'N/A'}</span>
                                        {p.brand && <span>| {p.brand}</span>}
                                    </div>
                                </div>
                                <div className="text-end shrink-0 pl-2">
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{isRTL ? 'كمية:' : 'Qty:'} {p.total_stock}</p>
                                    <p className="text-sm font-bold text-red-800 dark:text-red-300">{formatCurrency(p.total_value)}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400 text-sm">
                                {isRTL ? 'لا توجد قطع راكدة! مخزونك سليم.' : 'No dead stock found! Your inventory is healthy.'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-card p-6" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl">🚀</span>
                            <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                                {isRTL ? 'القطع سريعة الحركة (Fast Movers)' : 'Fast Movers'}
                            </h3>
                        </div>
                    </div>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'أكثر قطع الغيار طلباً ومبيعاً، تأكد من عدم نفاد كمياتها.' : 'Highest demand spare parts, ensure these never run out of stock.'}
                    </p>
                    <div className="space-y-3">
                        {topProducts.length > 0 ? topProducts.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-sm text-green-900 dark:text-green-200 truncate">{isRTL ? p.name_ar : p.name}</h4>
                                    <div className="text-xs text-green-700 dark:text-green-400 mt-1 flex gap-2">
                                        <span>OEM: {p.oem_number || 'N/A'}</span>
                                        {p.brand && <span>| {p.brand}</span>}
                                    </div>
                                </div>
                                <div className="text-end shrink-0 pl-2">
                                    <p className="text-xs font-bold text-green-600 dark:text-green-400">{p.total_sold} {isRTL ? 'مباع' : 'sold'}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-center py-4 text-muted">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Advanced Financial Intelligence (SMACC-like) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. VAT & ZATCA Summary */}
                <div className="glass-card p-6" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl">🧾</span>
                        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            {isRTL ? 'ملخص ضريبة القيمة المضافة (VAT)' : 'ZATCA VAT Summary'}
                        </h3>
                    </div>
                    {vatSummary ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'ضريبة المخرجات (مبيعات)' : 'Output VAT (Sales)'}</span>
                                <span className="font-bold text-blue-700 dark:text-blue-300">{formatCurrency(vatSummary.outputVat || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'ضريبة المدخلات (مشتريات)' : 'Input VAT (Purchases)'}</span>
                                <span className="font-bold text-blue-700 dark:text-blue-300">{formatCurrency(vatSummary.inputVat || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl border border-blue-200 dark:border-blue-800" style={{ background: 'var(--bg-surface-secondary)' }}>
                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'الصافي المستحق (ZATCA)' : 'Net Payable'}</span>
                                <span className={`font-bold ${(vatSummary.netVatPayable || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                    {formatCurrency(vatSummary.netVatPayable || 0)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4 text-muted">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    )}
                </div>

                {/* 2. Cash Flow & Liquidity */}
                <div className="glass-card p-6" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl">💸</span>
                        <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                            {isRTL ? 'السيولة النقدية (Liquidity)' : 'Cash & Bank Balances'}
                        </h3>
                    </div>
                    {liquidity ? (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'إجمالي السيولة المتوفرة' : 'Total Available Liquidity'}</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(liquidity.total || 0)}</p>
                            </div>
                            <div className="space-y-2">
                                {(liquidity.safes || []).slice(0, 3).map((safe: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-2.5 rounded-lg" style={{ background: 'var(--bg-surface-secondary)' }}>
                                        <div className="flex items-center gap-2">
                                            <span>{safe.type === 'bank' ? '🏦' : '💵'}</span>
                                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? safe.name_ar : safe.name}</span>
                                        </div>
                                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(safe.balance)}</span>
                                    </div>
                                ))}
                                {(liquidity.safes || []).length === 0 && (
                                    <p className="text-sm text-center py-2 text-muted">{isRTL ? 'لا توجد حسابات مالية' : 'No financial accounts'}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4 text-muted">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    )}
                </div>

                {/* 3. Receivables Aging */}
                <div className="glass-card p-6" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl">⏳</span>
                        <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                            {isRTL ? 'أعمار الديون (Receivables Aging)' : 'Receivables Aging'}
                        </h3>
                    </div>
                    {receivablesAging ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-2.5 rounded-lg border border-green-500/20 bg-green-500/5">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? '0 - 30 يوم' : '0 - 30 Days'}</span>
                                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(receivablesAging['0_30'] || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? '31 - 60 يوم' : '31 - 60 Days'}</span>
                                <span className="font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(receivablesAging['31_60'] || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-lg border border-orange-500/20 bg-orange-500/5">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? '61 - 90 يوم' : '61 - 90 Days'}</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(receivablesAging['61_90'] || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-lg border border-red-500/20 bg-red-500/5">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'أكثر من 90 يوم' : 'Over 90 Days'}</span>
                                <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(receivablesAging['over_90'] || 0)}</span>
                            </div>
                            <div className="pt-2 mt-2 border-t border-dashed" style={{ borderColor: 'var(--border-default)' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'إجمالي المديونيات' : 'Total Receivables'}</span>
                                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(receivablesAging['total'] || 0)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4 text-muted">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    )}
                </div>
            </div>

            {/* ── ERP Command Center (Advanced Intelligence) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* 1. Pending Tasks Center */}
                <div className="glass-card p-6" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl">🔔</span>
                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                            {isRTL ? 'المهام المعلقة والاعتمادات' : 'Action Center & Approvals'}
                        </h3>
                    </div>
                    {pendingTasks ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'فواتير مبيعات مسودة' : 'Draft Sales Invoices'}</span>
                                <span className="font-bold text-red-700 dark:text-red-300 px-2 py-1 bg-white dark:bg-black/20 rounded-md">{pendingTasks.draft_invoices}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'طلبات شراء مسودة' : 'Draft Purchase Orders'}</span>
                                <span className="font-bold text-red-700 dark:text-red-300 px-2 py-1 bg-white dark:bg-black/20 rounded-md">{pendingTasks.draft_purchases}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'قيود يومية غير مرحلة' : 'Unposted Journals'}</span>
                                <span className="font-bold text-red-700 dark:text-red-300 px-2 py-1 bg-white dark:bg-black/20 rounded-md">{pendingTasks.unposted_journals}</span>
                            </div>
                            <div className="pt-2 mt-2 border-t border-dashed" style={{ borderColor: 'var(--border-default)' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'إجمالي المهام' : 'Total Pending'}</span>
                                    <span className="font-bold text-red-600 dark:text-red-400">{pendingTasks.total_pending}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4 text-muted">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    )}
                </div>

                {/* 1.5 Task Management Widget */}
                <div className="glass-card p-6" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl">✅</span>
                            <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                                {isRTL ? 'إدارة المهام' : 'Tasks Management'}
                            </h3>
                        </div>
                        <Link href={`/${locale}/dashboard/tasks`} className="text-xs font-medium text-indigo-600 hover:underline">
                            {dict.dashboard.viewAll}
                        </Link>
                    </div>
                    {tasksDash?.counts ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-center p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                                    <div className="text-xl font-bold text-indigo-600">{tasksDash.counts.todo || 0}</div>
                                    <div className="text-[10px] text-gray-500 uppercase">{isRTL ? 'للتنفيذ' : 'To Do'}</div>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30">
                                    <div className="text-xl font-bold text-yellow-600">{tasksDash.counts.in_progress || 0}</div>
                                    <div className="text-[10px] text-gray-500 uppercase">{isRTL ? 'جاري' : 'In Progress'}</div>
                                </div>
                            </div>
                            <div className="pt-2 mt-2 border-t border-dashed" style={{ borderColor: 'var(--border-default)' }}>
                                <div className="flex flex-col gap-1.5">
                                    {tasksDash.urgent && tasksDash.urgent.slice(0, 3).map((task: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-xs p-1.5 rounded bg-surface-50 dark:bg-surface-800">
                                            <span className="truncate max-w-[150px] font-medium">🔴 {task.title}</span>
                                            <span className="text-gray-400">{task.assignee?.name || '---'}</span>
                                        </div>
                                    ))}
                                    {(!tasksDash.urgent || tasksDash.urgent.length === 0) && (
                                        <div className="text-center text-xs text-green-500 py-2">
                                            {isRTL ? 'لا توجد مهام عاجلة! ✨' : 'No urgent tasks! ✨'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4 text-muted">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    )}
                </div>

                {/* 2. Gross Margin */}
                <div className="glass-card p-6" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl">📈</span>
                        <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                            {isRTL ? 'هامش الربح (Gross Margin)' : 'Gross Margin & COGS'}
                        </h3>
                    </div>
                    {grossMargin ? (
                        <div className="flex flex-col items-center justify-center h-full pb-6">
                            <div className="relative w-32 h-32 mb-4">
                                <svg viewBox="0 0 36 36" className="w-full h-full">
                                    <path
                                        className="text-purple-100 dark:text-purple-900/30"
                                        strokeWidth="3"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="text-purple-500"
                                        strokeDasharray={`${grossMargin.gross_margin_percent}, 100`}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">{grossMargin.gross_margin_percent}%</span>
                                </div>
                            </div>
                            <div className="w-full space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted">{isRTL ? 'المبيعات:' : 'Revenue:'}</span>
                                    <span className="font-semibold">{formatCurrency(grossMargin.revenue)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted">{isRTL ? 'التكلفة (COGS):' : 'COGS:'}</span>
                                    <span className="font-semibold">{formatCurrency(grossMargin.cogs)}</span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-dashed" style={{ borderColor: 'var(--border-default)' }}>
                                    <span className="font-bold text-purple-600 dark:text-purple-400">{isRTL ? 'الربح الإجمالي:' : 'Gross Profit:'}</span>
                                    <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(grossMargin.gross_margin_amount)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4 text-muted">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    )}
                </div>

                {/* 3. Top Sales Reps */}
                <div className="glass-card p-6" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl">🏆</span>
                        <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                            {isRTL ? 'أفضل البائعين هذا الشهر' : 'Top Sales Reps'}
                        </h3>
                    </div>
                    {salesReps && salesReps.length > 0 ? (
                        <div className="space-y-3">
                            {salesReps.map((rep: any, i: number) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-xs">
                                            #{i + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">{rep.name}</h4>
                                            <p className="text-xs text-amber-600 dark:text-amber-400">{rep.invoices_count} {isRTL ? 'فاتورة' : 'invoices'}</p>
                                        </div>
                                    </div>
                                    <div className="text-end font-bold text-amber-700 dark:text-amber-300">
                                        {formatCurrency(rep.total_sales)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4 text-muted">{isRTL ? 'لا توجد بيانات بائعين' : 'No sales rep data'}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* 4. Live Audit Trail */}
                <div className="glass-card p-6" style={{ borderColor: 'rgba(56,189,248,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl">⏱️</span>
                        <h3 className="text-lg font-semibold text-sky-600 dark:text-sky-400">
                            {isRTL ? 'سجل النشاطات الحية' : 'Live Audit Trail'}
                        </h3>
                    </div>
                    {liveAuditTrail && liveAuditTrail.length > 0 ? (
                        <div className="relative pl-4 border-l-2 border-sky-200 dark:border-sky-800 space-y-6">
                            {liveAuditTrail.map((log: any, i: number) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-5 w-2 h-2 bg-sky-500 rounded-full mt-1.5 ring-4 ring-white dark:ring-slate-900"></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">{log.user_name}</span>
                                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                            {isRTL ? 'قام بـ' : 'Performed'} <strong className="text-sky-700 dark:text-sky-300">{log.action}</strong> {isRTL ? 'على' : 'on'} {log.model_type?.split('\\').pop() || 'System'}
                                        </span>
                                        <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(log.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4 text-muted">{isRTL ? 'لا توجد نشاطات مسجلة' : 'No recent activity'}</p>
                    )}
                </div>

                {/* 5. Expenses Breakdown */}
                <div className="glass-card p-6" style={{ borderColor: 'rgba(236,72,153,0.2)' }}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <span className="text-xl">💸</span>
                        <h3 className="text-lg font-semibold text-pink-600 dark:text-pink-400">
                            {isRTL ? 'تحليل المصروفات (Expenses)' : 'Expenses Breakdown'}
                        </h3>
                    </div>
                    {expensesBreakdown && expensesBreakdown.length > 0 ? (
                        <div className="flex flex-col h-full">
                            <div className="h-64 mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={expensesBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="total_amount"
                                        >
                                            {expensesBreakdown.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value: any) => formatCurrency(value)}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                {expensesBreakdown.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                                        <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{isRTL ? item.name_ar : item.name}</span>
                                        <span className="ml-auto font-bold">{formatCurrency(item.total_amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-center py-4 text-muted">{isRTL ? 'لا توجد مصروفات مسجلة' : 'No expenses recorded'}</p>
                    )}
                </div>
            </div>

        </div>
        </>
    );
}
