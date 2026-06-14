"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import api from '@/lib/api';
import { inventoryApi } from '@/lib/api';

export default function AIAnalyticsPage() {
    const { isRTL } = useLanguage();
    const [forecastData, setForecastData] = useState<any>(null);
    const [partnerForecast, setPartnerForecast] = useState<any>(null);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [autoPO, setAutoPO] = useState<any>(null);
    const [loading, setLoading] = useState({ forecast: false, partnerForecast: false, autoPO: false });
    const [threshold, setThreshold] = useState(10);

    useEffect(() => {
        inventoryApi.getWarehouses({}).then(r => {
            const wh = r.data?.data || r.data || [];
            setWarehouses(wh);
            if (wh.length > 0) setSelectedWarehouse(wh[0].id);
        }).catch(() => {});
        runInventoryForecast();
        runPartnerForecast();
    }, []);

    const runInventoryForecast = async () => {
        setLoading(l => ({ ...l, forecast: true }));
        try {
            const res = await api.get('/analytics/inventory-forecast', { params: { threshold } });
            setForecastData(res.data?.data);
        } catch { setForecastData(null); } finally { setLoading(l => ({ ...l, forecast: false })); }
    };

    const runPartnerForecast = async () => {
        setLoading(l => ({ ...l, partnerForecast: true }));
        try {
            const res = await api.get('/analytics/partner-forecast');
            setPartnerForecast(res.data?.data);
        } catch { setPartnerForecast(null); } finally { setLoading(l => ({ ...l, partnerForecast: false })); }
    };

    const runAutoPO = async () => {
        if (!selectedWarehouse) return;
        setLoading(l => ({ ...l, autoPO: true }));
        setAutoPO(null);
        try {
            const res = await api.post('/analytics/auto-draft-po', { warehouse_id: selectedWarehouse });
            setAutoPO(res.data?.data);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error generating purchase order');
        } finally { setLoading(l => ({ ...l, autoPO: false })); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-8 rounded-2xl text-white shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">🤖</span>
                    <div>
                        <h1 className="text-2xl font-bold">{isRTL ? 'الذكاء الاصطناعي والتحليلات' : 'AI Analytics & Forecasting'}</h1>
                        <p className="text-violet-200 text-sm mt-1">{isRTL ? 'توقعات ذكية لمساعدتك في اتخاذ القرارات الصحيحة' : 'Smart predictions to help you make better decisions'}</p>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {[isRTL ? '⚡ توقع نفاد المخزون' : '⚡ Inventory Forecasting', isRTL ? '🛒 شراء تلقائي' : '🛒 Auto Purchase Orders', isRTL ? '💹 توقع أرباح الشركاء' : '💹 Partner Profit Forecasting'].map(badge => (
                        <span key={badge} className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">{badge}</span>
                    ))}
                </div>
            </div>

            {/* Inventory Forecast Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <h2 className="font-bold text-lg">⚡ {isRTL ? 'توقع نفاد المخزون' : 'Inventory Depletion Forecast'}</h2>
                        <p className="text-sm text-slate-500 mt-0.5">{isRTL ? 'الأصناف التي ستنفد قريباً بناءً على معدل المبيعات' : 'Items predicted to run out based on sales velocity'}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">{isRTL ? 'حد التنبيه' : 'Alert Threshold'}</label>
                            <input type="number" min="1" max="100" value={threshold} onChange={e => setThreshold(parseInt(e.target.value))}
                                className="w-20 p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                        </div>
                        <button onClick={runInventoryForecast} disabled={loading.forecast}
                            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 mt-4">
                            {loading.forecast ? '...' : `▶ ${isRTL ? 'تشغيل' : 'Run'}`}
                        </button>
                    </div>
                </div>

                {forecastData && (
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`text-4xl font-bold ${forecastData.alerts_count > 0 ? 'text-red-500' : 'text-green-500'}`}>{forecastData.alerts_count}</span>
                            <div>
                                <p className="font-semibold">{isRTL ? 'صنف بحاجة للتزويد' : 'item(s) need restocking'}</p>
                                <p className="text-xs text-slate-500">{isRTL ? 'بناءً على معدل المبيعات الحالي' : 'Based on current sales velocity'}</p>
                            </div>
                        </div>
                        {forecastData.forecasts?.length > 0 ? (
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {forecastData.forecasts.map((f: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                        <div>
                                            <p className="font-medium text-sm">{f.product_name || f.name || 'Product'}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{isRTL ? 'المخزون الحالي:' : 'Stock:'} <strong>{f.current_stock || f.quantity}</strong> | {isRTL ? 'متوسط المبيعات:' : 'Avg. Sales:'} <strong>{parseFloat(f.avg_daily_sales || 0).toFixed(1)}/day</strong></p>
                                        </div>
                                        <div className="text-right">
                                            {f.days_until_empty !== undefined && (
                                                <p className={`text-lg font-bold ${f.days_until_empty <= 3 ? 'text-red-600' : f.days_until_empty <= 7 ? 'text-orange-500' : 'text-yellow-500'}`}>
                                                    {f.days_until_empty === 0 ? (isRTL ? 'نفد!' : 'OUT!') : `${f.days_until_empty}d`}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-500">{isRTL ? 'حتى النفاد' : 'until empty'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <span className="text-4xl">✅</span>
                                <p className="mt-2">{isRTL ? 'جميع الأصناف بمستوى آمن' : 'All items are at safe levels'}</p>
                            </div>
                        )}
                    </div>
                )}

                {loading.forecast && (
                    <div className="p-10 text-center text-slate-400">
                        <svg className="animate-spin w-8 h-8 mx-auto mb-2 text-violet-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        {isRTL ? 'يقوم الذكاء الاصطناعي بالتحليل...' : 'AI is analyzing...'}
                    </div>
                )}
            </div>

            {/* Auto Purchase Order */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-bold text-lg">🛒 {isRTL ? 'إنشاء أمر شراء تلقائي بالذكاء الاصطناعي' : 'Auto-Generate Purchase Order (AI)'}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{isRTL ? 'يقوم النظام بإنشاء مسودة أمر شراء تلقائياً للأصناف الناقصة' : 'System auto-generates a purchase order draft for depleted items'}</p>
                </div>
                <div className="p-6">
                    <div className="flex gap-3 items-end mb-5">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1.5">{isRTL ? 'المستودع' : 'Warehouse'}</label>
                            <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}
                                className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                {(Array.isArray(warehouses) ? warehouses : []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                {(!warehouses || !Array.isArray(warehouses) || warehouses.length === 0) && <option value="">{isRTL ? 'لا توجد مستودعات' : 'No warehouses'}</option>}
                            </select>
                        </div>
                        <button onClick={runAutoPO} disabled={loading.autoPO || !selectedWarehouse}
                            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                            {loading.autoPO ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{isRTL ? 'يُنشئ...' : 'Generating...'}</> : `🤖 ${isRTL ? 'إنشاء تلقائي' : 'Auto Generate'}`}
                        </button>
                    </div>

                    {autoPO && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                                <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                                    {isRTL ? `تم إنشاء مسودة أمر شراء يحتوي على ${autoPO.items?.length || 0} صنف` : `Draft PO created with ${autoPO.items?.length || 0} item(s)`}
                                </span>
                                <span className="text-xs text-violet-500 font-mono">{autoPO.invoice_number || autoPO.number || 'DRAFT'}</span>
                            </div>
                            {autoPO.items?.length > 0 && (
                                <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                    <thead className="bg-slate-50 dark:bg-slate-900">
                                        <tr>
                                            {[isRTL ? 'الصنف' : 'Item', isRTL ? 'الكمية' : 'Qty', isRTL ? 'السعر' : 'Price'].map(h => (
                                                <th key={h} className="px-4 py-2 text-xs font-semibold text-slate-500 text-left border-b border-slate-200 dark:border-slate-700">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {autoPO.items.map((item: any, i: number) => (
                                            <tr key={i} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                <td className="px-4 py-2 font-medium">{item.product?.name || item.name || 'Product'}</td>
                                                <td className="px-4 py-2">{item.quantity}</td>
                                                <td className="px-4 py-2">{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Partner Forecast */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-lg">💹 {isRTL ? 'توقع أرباح الشركاء - نهاية السنة' : 'Partner Profit Forecast — Year End'}</h2>
                        <p className="text-sm text-slate-500 mt-0.5">{isRTL ? 'توقع ذكي بأرباح كل شريك بحلول نهاية السنة المالية' : 'AI projection of each partner\'s profits by year end'}</p>
                    </div>
                    <button onClick={runPartnerForecast} disabled={loading.partnerForecast}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
                        {loading.partnerForecast ? '...' : `↻ ${isRTL ? 'تحديث' : 'Refresh'}`}
                    </button>
                </div>

                {loading.partnerForecast && (
                    <div className="p-10 text-center text-slate-400">
                        <svg className="animate-spin w-6 h-6 mx-auto mb-2 text-purple-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    </div>
                )}

                {partnerForecast && (
                    <div className="p-6 space-y-4">
                        {partnerForecast.metrics && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                {[
                                    { label_ar: 'معدل النمو', label_en: 'Growth Rate', val: `${partnerForecast.metrics.growth_rate_pct?.toFixed(1) || 0}%` },
                                    { label_ar: 'ربح نهاية السنة المتوقع', label_en: 'Projected Year-End Profit', val: parseFloat(partnerForecast.metrics.projected_year_end_profit || 0).toFixed(2) },
                                    { label_ar: 'الربح الحالي', label_en: 'Current Profit', val: parseFloat(partnerForecast.metrics.current_year_profit || 0).toFixed(2) },
                                ].map(m => (
                                    <div key={m.label_en} className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                        <p className="text-xs text-slate-500">{isRTL ? m.label_ar : m.label_en}</p>
                                        <p className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-1">{m.val}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {partnerForecast.partner_projections?.length > 0 ? (
                            <div className="space-y-3">
                                {partnerForecast.partner_projections.map((p: any) => (
                                    <div key={p.partner_id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div>
                                            <p className="font-medium">{p.partner_name || 'Partner'}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{p.profit_share_pct}% {isRTL ? 'حصة' : 'share'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-purple-700">{parseFloat(p.projected_profit || 0).toFixed(2)}</p>
                                            <p className="text-xs text-slate-400">{isRTL ? 'توقع نهاية السنة' : 'year-end projection'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-400 py-4">{isRTL ? 'لا توجد بيانات شركاء' : 'No partner data available'}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
