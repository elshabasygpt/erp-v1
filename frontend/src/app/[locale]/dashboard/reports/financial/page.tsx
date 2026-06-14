"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import api from '@/lib/api';

type ReportTab = 'pl' | 'inventory' | 'accounts' | 'kpis';

export default function FinancialReportsPage() {
    const { isRTL } = useLanguage();
    const [tab, setTab] = useState<ReportTab>('kpis');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    // P&L params
    const [plFrom, setPlFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [plTo, setPlTo] = useState(new Date().toISOString().split('T')[0]);

    const fetchReport = useCallback(async (reportTab: ReportTab) => {
        setLoading(true);
        setData(null);
        try {
            let res;
            if (reportTab === 'pl') {
                res = await api.get('/reports/pl', { params: { start_date: plFrom, end_date: plTo } });
                setData({ type: 'pl', ...res.data?.data });
            } else if (reportTab === 'inventory') {
                res = await api.get('/reports/inventory');
                setData({ type: 'inventory', ...res.data?.data });
            } else if (reportTab === 'accounts') {
                res = await api.get('/reports/accounts');
                setData({ type: 'accounts', ...res.data?.data });
            } else if (reportTab === 'kpis') {
                res = await api.get('/reports/kpis');
                setData({ type: 'kpis', ...res.data?.data });
            }
        } catch { setData(null); } finally { setLoading(false); }
    }, [plFrom, plTo]);

    useEffect(() => { fetchReport('kpis'); }, []);

    const tabs = [
        { key: 'kpis', ar: 'لوحة المؤشرات', en: 'KPI Dashboard', icon: '📊' },
        { key: 'pl', ar: 'الأرباح والخسائر', en: 'Profit & Loss', icon: '📈' },
        { key: 'inventory', ar: 'تقييم المخزون', en: 'Inventory Valuation', icon: '📦' },
        { key: 'accounts', ar: 'الخزينة والسيولة', en: 'Treasury & Liquidity', icon: '💵' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                    📊 {isRTL ? 'التقارير المالية الشاملة' : 'Financial Reports Hub'}
                </h1>
                <p className="text-slate-500 mt-1 text-sm">{isRTL ? 'تقارير مالية لحظية مرتبطة ببيانات النظام' : 'Live financial reports connected to system data'}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => { setTab(t.key as ReportTab); fetchReport(t.key as ReportTab); }}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${tab === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:border-indigo-300'}`}>
                        <span>{t.icon}</span>
                        {isRTL ? t.ar : t.en}
                    </button>
                ))}
            </div>

            {/* P&L Date Picker */}
            {tab === 'pl' && (
                <div className="flex gap-3 items-end flex-wrap bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                        <label className="block text-xs font-medium mb-1 text-slate-500">{isRTL ? 'من تاريخ' : 'From'}</label>
                        <input type="date" value={plFrom} onChange={e => setPlFrom(e.target.value)} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1 text-slate-500">{isRTL ? 'إلى تاريخ' : 'To'}</label>
                        <input type="date" value={plTo} onChange={e => setPlTo(e.target.value)} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                    </div>
                    <button onClick={() => fetchReport('pl')} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                        ▶ {isRTL ? 'تشغيل' : 'Run'}
                    </button>
                </div>
            )}

            {/* Report Content */}
            <div className="space-y-4">
                {loading && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-20 flex items-center justify-center gap-3 text-slate-400">
                        <svg className="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        {isRTL ? 'جاري تحميل التقرير...' : 'Loading report...'}
                    </div>
                )}

                {/* ── KPIs ── */}
                {!loading && data?.type === 'kpis' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label_ar: 'إجمالي المبيعات', label_en: 'Total Sales', val: data.summary?.total_sales, icon: '💰', color: 'from-green-500 to-emerald-600' },
                                { label_ar: 'إجمالي المشتريات', label_en: 'Total Purchases', val: data.summary?.total_purchases, icon: '🛒', color: 'from-blue-500 to-indigo-600' },
                                { label_ar: 'إجمالي المصروفات', label_en: 'Expenses', val: data.summary?.expenses, icon: '💸', color: 'from-red-500 to-rose-600' },
                                { label_ar: 'صافي الدخل', label_en: 'Net Income', val: data.summary?.net_income, icon: '📈', color: data.summary?.net_income >= 0 ? 'from-purple-500 to-indigo-600' : 'from-red-500 to-rose-600' },
                            ].map(k => (
                                <div key={k.label_en} className={`bg-gradient-to-br ${k.color} p-5 rounded-2xl text-white shadow-sm`}>
                                    <span className="text-2xl">{k.icon}</span>
                                    <p className="text-xs opacity-80 mt-2">{isRTL ? k.label_ar : k.label_en}</p>
                                    <p className="text-2xl font-bold mt-1">{((k.val || 0) as number).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>

                        {/* Top Products */}
                        {data.top_products?.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                                <h3 className="font-bold mb-4">{isRTL ? '🏆 أكثر المنتجات مبيعاً' : '🏆 Top Selling Products'}</h3>
                                <div className="space-y-3">
                                    {data.top_products.map((p: any, i: number) => (
                                        <div key={p.product_id} className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                            <span className="flex-1 font-medium text-sm">{isRTL ? p.name_ar || p.name : p.name}</span>
                                            <span className="text-slate-500 text-sm">{parseFloat(p.total_sold || 0).toFixed(0)} {isRTL ? 'وحدة' : 'units'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Customers */}
                        {data.top_customers?.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                                <h3 className="font-bold mb-4">{isRTL ? '👥 أفضل العملاء' : '👥 Top Customers'}</h3>
                                <div className="space-y-3">
                                    {data.top_customers.map((c: any, i: number) => (
                                        <div key={c.customer_id} className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                            <span className="flex-1 font-medium text-sm">{isRTL ? c.name_ar || c.name : c.name}</span>
                                            <span className="font-bold text-emerald-600">{parseFloat(c.total_spent || 0).toFixed(2)}</span>
                                            <span className="text-slate-400 text-xs">{c.orders_count} {isRTL ? 'طلب' : 'orders'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Financial Distribution */}
                        {data.accounts_distribution && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                                <h3 className="font-bold mb-4">{isRTL ? '⚖️ التوزيع المالي' : '⚖️ Financial Distribution'}</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label_ar: 'الأصول', label_en: 'Assets', val: data.accounts_distribution.assets, color: 'text-green-600' },
                                        { label_ar: 'الالتزامات', label_en: 'Liabilities', val: data.accounts_distribution.liabilities, color: 'text-red-500' },
                                        { label_ar: 'حقوق الملكية', label_en: "Owner's Equity", val: data.accounts_distribution.equity, color: 'text-blue-600' },
                                    ].map(item => (
                                        <div key={item.label_en} className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                            <p className="text-xs text-slate-500 mb-1">{isRTL ? item.label_ar : item.label_en}</p>
                                            <p className={`text-xl font-bold ${item.color}`}>{parseFloat(item.val || 0).toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── P&L Statement ── */}
                {!loading && data?.type === 'pl' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg">{isRTL ? 'قائمة الأرباح والخسائر' : 'Profit & Loss Statement'}</h3>
                            <span className="text-sm text-slate-500">{data.period?.start} → {data.period?.end}</span>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Revenue */}
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-3">📈 {isRTL ? 'الإيرادات' : 'Revenue'}</h4>
                                {Object.entries(data.revenues || {}).map(([k, v]) => (
                                    <div key={k} className="flex justify-between text-sm py-1">
                                        <span className="text-slate-600 capitalize">{isRTL ? (k === 'sales' ? 'مبيعات' : k) : k.replace('_', ' ')}</span>
                                        <strong className="text-green-700">{parseFloat(v as string).toFixed(2)}</strong>
                                    </div>
                                ))}
                                <div className="border-t border-green-200 mt-2 pt-2 flex justify-between font-bold">
                                    <span>{isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}</span>
                                    <span className="text-green-700">{parseFloat(data.revenues?.sales || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Expenses */}
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3">💸 {isRTL ? 'التكاليف والمصروفات' : 'Costs & Expenses'}</h4>
                                {Object.entries(data.expenses || {}).map(([k, v]) => (
                                    <div key={k} className="flex justify-between text-sm py-1">
                                        <span className="text-slate-600 capitalize">{isRTL ? (k === 'purchases' ? 'مشتريات' : k === 'operating_expenses' ? 'مصروفات تشغيل' : k) : k.replace('_', ' ')}</span>
                                        <strong className="text-red-600">{parseFloat(v as string).toFixed(2)}</strong>
                                    </div>
                                ))}
                                <div className="border-t border-red-200 mt-2 pt-2 flex justify-between font-bold">
                                    <span>{isRTL ? 'إجمالي التكاليف' : 'Total Costs'}</span>
                                    <span className="text-red-700">{Object.values(data.expenses || {}).reduce((s: number, v) => s + parseFloat(v as string), 0).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Net Income */}
                            <div className={`p-5 rounded-xl border-2 ${data.net_income >= 0 ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-600' : 'bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-600'}`}>
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-lg">{isRTL ? '📊 صافي الدخل' : '📊 Net Income'}</h4>
                                    <span className={`text-3xl font-bold ${data.net_income >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {data.net_income >= 0 ? '+' : ''}{parseFloat(data.net_income).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Inventory Valuation ── */}
                {!loading && data?.type === 'inventory' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label_ar: 'إجمالي الأصناف', label_en: 'Total Products', val: data.total_items, icon: '🏷️', color: 'bg-blue-50 text-blue-700' },
                                { label_ar: 'القيمة التقديرية للمخزون', label_en: 'Inventory Value', val: parseFloat(data.estimated_inventory_value || 0).toFixed(2), icon: '💰', color: 'bg-green-50 text-green-700' },
                            ].map(k => (
                                <div key={k.label_en} className={`p-5 rounded-2xl ${k.color} border border-current/20`}>
                                    <span className="text-2xl">{k.icon}</span>
                                    <p className="text-xs opacity-70 mt-2">{isRTL ? k.label_ar : k.label_en}</p>
                                    <p className="text-3xl font-bold mt-1">{k.val}</p>
                                </div>
                            ))}
                        </div>
                        {data.low_stock_alerts?.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-orange-200 dark:border-orange-800 overflow-hidden">
                                <div className="px-5 py-4 border-b border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                                    <h3 className="font-bold text-orange-700 dark:text-orange-400">⚠️ {isRTL ? `أصناف ذات مخزون منخفض (${data.low_stock_alerts.length})` : `Low Stock Alerts (${data.low_stock_alerts.length})`}</h3>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900">
                                        <tr>
                                            {[isRTL ? 'اسم الصنف' : 'Product', isRTL ? 'المخزون الحالي' : 'Current Stock', isRTL ? 'القيمة' : 'Value'].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-left border-b border-slate-200 dark:border-slate-700">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.low_stock_alerts.map((p: any) => (
                                            <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700">
                                                <td className="px-4 py-2.5 font-medium">{p.name}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold text-xs">{p.stock_quantity}</span>
                                                </td>
                                                <td className="px-4 py-2.5">{parseFloat(p.price || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Accounts / Liquidity ── */}
                {!loading && data?.type === 'accounts' && (
                    <div className="space-y-4">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-lg">
                            <p className="text-sm opacity-80">{isRTL ? 'إجمالي السيولة' : 'Total Liquidity'}</p>
                            <h2 className="text-4xl font-bold mt-1">{parseFloat(data.total_liquidity || 0).toFixed(2)}</h2>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <h3 className="font-bold px-5 py-4 border-b border-slate-200 dark:border-slate-700">{isRTL ? 'الخزائن والحسابات' : 'Safes & Accounts'}</h3>
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {(data.safes || []).map((safe: any) => (
                                    <div key={safe.id} className="flex items-center justify-between px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <span>{safe.type === 'bank' ? '🏦' : '💵'}</span>
                                            <span className="font-medium">{safe.name}</span>
                                        </div>
                                        <span className="font-bold text-emerald-600">{parseFloat(safe.balance).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {data.recent_transactions?.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <h3 className="font-bold px-5 py-4 border-b border-slate-200 dark:border-slate-700">{isRTL ? 'آخر الحركات' : 'Recent Transactions'}</h3>
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {data.recent_transactions.slice(0, 10).map((t: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                                            <span className="text-slate-500">{t.transaction_date?.split('T')[0]}</span>
                                            <span className="flex-1 px-3">{t.description || '-'}</span>
                                            <span className={`font-bold ${t.type === 'deposit' ? 'text-green-600' : 'text-red-500'}`}>
                                                {t.type === 'deposit' ? '+' : '-'}{parseFloat(t.amount).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
