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
            setDisplayValue(Math.round(value * eased));
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
    const [currentTime, setCurrentTime] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // API States
    const [statsSummary, setStatsSummary] = useState({
        totalSales: 0,
        totalPurchases: 0,
        totalCustomers: 0,
        totalProducts: 0,
        todayInvoicesCount: 0,
        pendingAmount: 0,
        todayPurchasesCount: 0,
        purchaseOrdersCount: 0,
        activeProducts: 0,
        lowStockCount: 0,
        revenue: 0,
        expenses: 0,
        netIncome: 0,
        activeCustomers: 0,
        overduePaymentsCount: 0,
        newCustomersThisMonth: 0,
        pendingDelivery: 0,
        supplierPayments: 0,
    });
    const [invoices, setInvoices] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [aiForecasts, setAiForecasts] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [topCustomers, setTopCustomers] = useState<any[]>([]);
    const [accountsPie, setAccountsPie] = useState(defaultAccountsPie);
    const [dailySalesData, setDailySalesData] = useState<any[]>([]);
    const [isDraftingPO, setIsDraftingPO] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { reportsApi } = await import('@/lib/api');
                // Parallel requests to avoid waterfall load times
                const [salesRes, inventoryRes, purchasesRes, crmRes, aiRes, kpiRes] = await Promise.all([
                    salesApi.getInvoices({ limit: 5 }),
                    inventoryApi.getProducts({ limit: 5 }),
                    purchasesApi.getInvoices({ limit: 5 }),
                    crmApi.getCustomers({ limit: 5 }),
                    import('@/lib/api').then(m => m.analyticsApi.getInventoryForecast(10).catch(() => ({ data: { data: { forecasts: [] } } }))),
                    reportsApi.getGeneralKpis()
                ]);

                const salesRows = salesRes.data?.data || [];
                const invRows = inventoryRes.data?.data || [];
                const purRows = purchasesRes.data?.data || [];
                const custRows = crmRes.data?.data || [];
                const forecastsData = aiRes?.data?.data?.forecasts || [];
                
                const kpis = kpiRes.data?.data || {};

                setInvoices(salesRows);
                setProducts(invRows);
                setPurchases(purRows);
                setCustomers(custRows);
                setAiForecasts(forecastsData);
                
                const s = kpis.summary || {};
                setStatsSummary({
                    totalSales: s.total_sales || 0,
                    totalPurchases: s.total_purchases || 0,
                    totalProducts: s.total_products || 0,
                    totalCustomers: s.total_customers || 0,
                    todayInvoicesCount: s.today_invoices_count || salesRows.length,
                    pendingAmount: s.pending_amount || 0,
                    todayPurchasesCount: s.today_purchases_count || purRows.length,
                    purchaseOrdersCount: s.purchase_orders_count || purRows.length,
                    activeProducts: s.active_products || invRows.length,
                    lowStockCount: s.low_stock_count || 0,
                    revenue: s.revenue || s.total_sales || 0,
                    expenses: s.expenses || s.total_purchases || 0,
                    netIncome: s.net_income || ((s.total_sales || 0) - (s.total_purchases || 0)),
                    activeCustomers: s.active_customers || custRows.length,
                    overduePaymentsCount: s.overdue_payments_count || 0,
                    newCustomersThisMonth: s.new_customers_this_month || 0,
                    pendingDelivery: s.pending_delivery || 0,
                    supplierPayments: s.supplier_payments || 0,
                });

                setTopProducts(kpis.top_products || []);
                setTopCustomers(kpis.top_customers || []);
                setDailySalesData((kpis.daily_sales || []).map((d: any) => ({
                    ...d,
                    revenue: Number(d.revenue || 0)
                })));

                // Accounts distribution for pie chart
                if (kpis.accounts_distribution) {
                    const ad = kpis.accounts_distribution;
                    setAccountsPie([
                        { name: 'Assets', nameAr: 'الأصول', value: ad.assets || 0 },
                        { name: 'Liabilities', nameAr: 'الخصوم', value: ad.liabilities || 0 },
                        { name: 'Equity', nameAr: 'حقوق الملكية', value: ad.equity || 0 },
                    ]);
                }

            } catch (err) {
                console.error("Error fetching dashboard data", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();

        const tick = () => {
            setCurrentTime(new Date().toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [isRTL]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0,
        }).format(val);

    const handleAutoDraftPO = async () => {
        setIsDraftingPO(true);
        try {
            const { analyticsApi } = await import('@/lib/api');
            // Hardcode warehouse_id conceptually for demo, should be fetched from active warehouse context 
            const defaultWarehouse = "00000000-0000-0000-0000-000000000000"; // Assuming a master warehouse or fetched from API
            const res = await analyticsApi.autoDraftPurchaseOrder(defaultWarehouse);
            
            if (res.data.data.status === 'success') {
                alert(isRTL ? 'تم إنشاء مسودة فاتورة مشتريات ذكية بنجاح!' : 'Smart Purchase Order Drafted Successfully!');
                // We could refresh purchases here
                const purRes = await purchasesApi.getInvoices({ limit: 5 });
                setPurchases(purRes.data?.data || []);
            } else {
                alert(isRTL ? 'المخزون بوضع ممتاز، لا داعي للطلب.' : 'Inventory is healthy, no orders needed.');
            }
        } catch (err) {
            console.error(err);
            alert(isRTL ? 'حدث خطأ أثناء الإنشاء الذكي' : 'Error generating smart PO');
        } finally {
            setIsDraftingPO(false);
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
        <div className="space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>{dict.dashboard.title}</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'نظرة شاملة على أداء الأعمال' : 'Comprehensive overview of business performance'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl text-sm font-mono font-semibold tabular-nums"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--color-primary)' }}>
                        🕐 {currentTime}
                    </div>
                    <Link href={`/${locale}/dashboard/pos`}
                        className="btn-primary flex items-center gap-2 py-2.5">
                        <span>🖥️</span>
                        {isRTL ? 'نقطة البيع' : 'Open POS'}
                    </Link>
                </div>
            </div>

            {/* Quick Access Shortcuts */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                    { label: dict.common.sales, icon: '🧾', href: '/sales', hoverBorder: 'hover:border-green-500/30' },
                    { label: dict.common.inventory, icon: '📦', href: '/inventory', hoverBorder: 'hover:border-blue-500/30' },
                    { label: dict.common.purchases, icon: '🛒', href: '/purchases', hoverBorder: 'hover:border-orange-500/30' },
                    { label: dict.common.accounting, icon: '📊', href: '/accounting', hoverBorder: 'hover:border-purple-500/30' },
                    { label: dict.common.customers, icon: '👥', href: '/customers', hoverBorder: 'hover:border-pink-500/30' },
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
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
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
                                {invoices.length > 0 ? invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td className="font-medium text-sm" style={{ color: 'var(--color-primary)' }}>{inv.number || inv.id.substring(0,8)}</td>
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
                                {purchases.length > 0 ? purchases.map((po) => (
                                    <tr key={po.id}>
                                        <td className="font-medium text-sm" style={{ color: 'var(--color-primary)' }}>{po.number || po.id.substring(0,8)}</td>
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
                                <button 
                                    onClick={handleAutoDraftPO}
                                    disabled={isDraftingPO}
                                    className="btn-primary py-1 px-3 text-xs flex items-center gap-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                                >
                                    {isDraftingPO ? '⏳...' : (isRTL ? '⚡ مسودة شراء ذكية' : '⚡ Smart PO Draft')}
                                </button>
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
                            const maxSales = topProducts[0].total_sold || 1;
                            const pctVal = Math.round((p.total_sold / maxSales) * 100);
                            const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                        style={{ background: colors[i % colors.length] }}>
                                        {i + 1}
                                    </span>
                                    <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                                        {isRTL ? p.name_ar : p.name}
                                    </span>
                                    <div className="hidden sm:block w-24 h-5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-secondary)' }}>
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
        </div>
    );
}
