"use client";

import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { crmApi, productsApi, reportsApi } from '@/lib/api';
import api from '@/lib/api';

type ReportType = 'aging' | 'product-ledger' | 'cash-flow';

export default function AdvancedReportsPage() {
    const { isRTL } = useLanguage();
    const [activeReport, setActiveReport] = useState<ReportType>('aging');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    // Aging params
    const [agingType, setAgingType] = useState<'customer' | 'supplier'>('customer');
    const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);

    // Product Ledger params
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [plFrom, setPlFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [plTo, setPlTo] = useState(new Date().toISOString().split('T')[0]);

    // Load products
    React.useEffect(() => {
        productsApi.getProducts({ limit: 200 }).then(r => setProducts(r.data?.data || r.data || [])).catch(() => {});
    }, []);

    const runAgingReport = async () => {
        setLoading(true);
        try {
            const res = await reportsApi.getAgingReport(agingType === 'customer' ? 'receivable' : 'payable');
            const { data: rows, totals } = res.data?.data || res.data || { data: [], totals: {} };
            
            // Format API response to match UI expected structure
            const aged = rows.map((r: any) => ({
                id: r.id, 
                name: isRTL && r.name_ar ? r.name_ar : r.name,
                current: r.total_balance - r.buckets['0_30'] - r.buckets['31_60'] - r.buckets['61_90'] - r.buckets['over_90'], // Assuming 'current' is what's not aged, actually API buckets everything. Let's just map it.
                days30: r.buckets['0_30'],
                days60: r.buckets['31_60'],
                days90: r.buckets['61_90'],
                over90: r.buckets['over_90'],
                total: r.total_balance,
            }));

            setData({ type: 'aging', rows: aged, asOf });
        } catch { setData(null); } finally { setLoading(false); }
    };

    const runProductLedger = async () => {
        if (!selectedProduct) return;
        setLoading(true);
        try {
            const res = await api.get('/inventory/movements', { params: { product_id: selectedProduct, from: plFrom, to: plTo, limit: 100 } });
            const movements = res.data?.data || [];
            const prod = products.find((p: any) => p.id === selectedProduct);
            setData({ type: 'product-ledger', movements, product: prod, from: plFrom, to: plTo });
        } catch { setData(null); } finally { setLoading(false); }
    };

    const runCashFlow = async () => {
        setLoading(true);
        try {
            const [safesRes] = await Promise.all([api.get('/treasury/safes')]);
            const safes = safesRes.data?.data || safesRes.data || [];
            const totalBalance = safes.reduce((s: number, safe: any) => s + parseFloat(safe.balance || 0), 0);
            setData({ type: 'cash-flow', safes, totalBalance });
        } catch { setData(null); } finally { setLoading(false); }
    };

    const reports = [
        { key: 'aging', ar: 'تقرير أعمار الديون', en: 'Aging Report', icon: '⏳', desc: isRTL ? 'تحليل ديون العملاء والموردين حسب الفترة الزمنية' : 'Analyze receivables/payables by age bucket' },
        { key: 'product-ledger', ar: 'حركة صنف محددة', en: 'Product Ledger', icon: '📦', desc: isRTL ? 'تفصيل كامل لجميع حركات صنف معين في فترة زمنية' : 'Full movement detail for a specific product' },
        { key: 'cash-flow', ar: 'التدفق النقدي', en: 'Cash Flow', icon: '💰', desc: isRTL ? 'ملخص الخزائن والسيولة الحالية' : 'Current liquidity and treasury summary' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600">
                    {isRTL ? 'التقارير المتقدمة' : 'Advanced Reports'}
                </h1>
                <p className="text-slate-500 mt-1 text-sm">{isRTL ? 'تقارير تحليلية عميقة لمساعدتك في اتخاذ القرار' : 'Deep analytical reports to support decision making'}</p>
            </div>

            {/* Report Picker */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reports.map(r => (
                    <button key={r.key} onClick={() => { setActiveReport(r.key as ReportType); setData(null); }}
                        className={`p-5 rounded-2xl border text-left transition ${activeReport === r.key ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-200'}`}>
                        <span className="text-3xl">{r.icon}</span>
                        <h3 className="font-bold mt-2">{isRTL ? r.ar : r.en}</h3>
                        <p className="text-xs text-slate-500 mt-1">{r.desc}</p>
                    </button>
                ))}
            </div>

            {/* Report Controls + Output */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">

                {/* ── Aging ── */}
                {activeReport === 'aging' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-3 items-end">
                            <div>
                                <label className="block text-xs font-medium mb-1">{isRTL ? 'النوع' : 'Type'}</label>
                                <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                                    {[['customer', isRTL ? 'العملاء' : 'Customers'], ['supplier', isRTL ? 'الموردين' : 'Suppliers']].map(([v, l]) => (
                                        <button key={v} onClick={() => setAgingType(v as 'customer' | 'supplier')}
                                            className={`px-4 py-2 text-sm font-medium transition ${agingType === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600'}`}>{l}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">{isRTL ? 'بتاريخ' : 'As of Date'}</label>
                                <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                            </div>
                            <button onClick={runAgingReport} disabled={loading} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                {loading ? '...' : (isRTL ? '▶ تشغيل' : '▶ Run')}
                            </button>
                        </div>

                        {data?.type === 'aging' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900">
                                        <tr>
                                            {[isRTL ? 'الاسم' : 'Name', isRTL ? 'الجاري' : 'Current', '1-30', '31-60', '61-90', '+90', isRTL ? 'الإجمالي' : 'Total'].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-xs font-semibold text-slate-500 text-left border-b border-slate-200 dark:border-slate-700">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.rows.map((row: any) => (
                                            <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                <td className="px-3 py-2.5 font-medium">{row.name}</td>
                                                <td className="px-3 py-2.5 text-green-600">{Math.max(0, row.current).toFixed(2)}</td>
                                                <td className="px-3 py-2.5 text-yellow-600">{row.days30.toFixed(2)}</td>
                                                <td className="px-3 py-2.5 text-orange-600">{row.days60.toFixed(2)}</td>
                                                <td className="px-3 py-2.5 text-red-500">{row.days90.toFixed(2)}</td>
                                                <td className="px-3 py-2.5 text-red-700 font-bold">{row.over90.toFixed(2)}</td>
                                                <td className="px-3 py-2.5 font-bold">{row.total.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {data.rows.length === 0 && (
                                            <tr><td colSpan={7} className="text-center py-8 text-slate-400">{isRTL ? 'لا توجد بيانات' : 'No data'}</td></tr>
                                        )}
                                    </tbody>
                                    <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold">
                                        <tr>
                                            <td className="px-3 py-2.5 text-xs uppercase">{isRTL ? 'الإجمالي' : 'Total'}</td>
                                            {['current','days30','days60','days90','over90','total'].map(k => (
                                                <td key={k} className="px-3 py-2.5">{data.rows.reduce((s: number, r: any) => s + r[k], 0).toFixed(2)}</td>
                                            ))}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Product Ledger ── */}
                {activeReport === 'product-ledger' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium mb-1">{isRTL ? 'الصنف' : 'Product'}</label>
                                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                    <option value="">{isRTL ? '-- اختر صنف --' : '-- Select Product --'}</option>
                                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">{isRTL ? 'من' : 'From'}</label>
                                <input type="date" value={plFrom} onChange={e => setPlFrom(e.target.value)} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">{isRTL ? 'إلى' : 'To'}</label>
                                <input type="date" value={plTo} onChange={e => setPlTo(e.target.value)} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                            </div>
                            <button onClick={runProductLedger} disabled={loading || !selectedProduct} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                {loading ? '...' : (isRTL ? '▶ تشغيل' : '▶ Run')}
                            </button>
                        </div>

                        {data?.type === 'product-ledger' && (
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-lg font-bold">{data.product?.name}</span>
                                    <span className="text-sm text-slate-500">— {data.movements.length} {isRTL ? 'حركة' : 'movement(s)'}</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-900">
                                            <tr>
                                                {[isRTL ? 'التاريخ' : 'Date', isRTL ? 'النوع' : 'Type', isRTL ? 'المرجع' : 'Reference', isRTL ? 'وارد' : 'In', isRTL ? 'صادر' : 'Out', isRTL ? 'الرصيد' : 'Balance'].map(h => (
                                                    <th key={h} className="px-3 py-2.5 text-xs font-semibold text-slate-500 text-left border-b border-slate-200 dark:border-slate-700">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.movements.map((m: any, i: number) => (
                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                    <td className="px-3 py-2.5 text-slate-500">{new Date(m.created_at || m.date).toLocaleDateString()}</td>
                                                    <td className="px-3 py-2.5">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.type?.toUpperCase()}</span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-slate-500 text-xs">{m.reference || '-'}</td>
                                                    <td className="px-3 py-2.5 text-green-600 font-medium">{m.type === 'in' ? m.quantity : '-'}</td>
                                                    <td className="px-3 py-2.5 text-red-500 font-medium">{m.type !== 'in' ? m.quantity : '-'}</td>
                                                    <td className="px-3 py-2.5 font-bold">{m.quantity_after ?? m.balance ?? '-'}</td>
                                                </tr>
                                            ))}
                                            {data.movements.length === 0 && (
                                                <tr><td colSpan={6} className="text-center py-8 text-slate-400">{isRTL ? 'لا توجد حركات في هذه الفترة' : 'No movements in this period'}</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Cash Flow ── */}
                {activeReport === 'cash-flow' && (
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <button onClick={runCashFlow} disabled={loading} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                {loading ? '...' : (isRTL ? '▶ عرض الوضع النقدي' : '▶ Show Cash Position')}
                            </button>
                        </div>

                        {data?.type === 'cash-flow' && (
                            <div className="space-y-4">
                                <div className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white">
                                    <p className="text-sm opacity-80">{isRTL ? 'إجمالي السيولة المتاحة' : 'Total Available Liquidity'}</p>
                                    <h2 className="text-4xl font-bold mt-1">{data.totalBalance.toFixed(2)}</h2>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-3">
                                    {data.safes.map((safe: any) => (
                                        <div key={safe.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{safe.type === 'bank' ? '🏦' : '💵'}</span>
                                                <div>
                                                    <p className="font-medium text-sm">{safe.name}</p>
                                                    <p className="text-xs capitalize text-slate-500">{safe.type}</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-emerald-600 text-lg">{parseFloat(safe.balance).toFixed(2)}</span>
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
