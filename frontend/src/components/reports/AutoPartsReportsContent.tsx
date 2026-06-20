'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, inventoryApi } from '@/lib/api';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

export default function AutoPartsReportsContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const [activeTab, setActiveTab] = useState<'slow' | 'top-make' | 'missing' | 'profit'>('slow');

    // Slow Moving State
    const [slowDays, setSlowDays] = useState(90);

    // Top By Make State
    const [topDateFrom, setTopDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [topDateTo, setTopDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [topMakeFilter, setTopMakeFilter] = useState('');
    const [selectedMake, setSelectedMake] = useState<number | null>(null);

    // Profit By Brand State
    const [profitGroupBy, setProfitGroupBy] = useState<'brand' | 'quality_grade'>('brand');
    const [profitFrom, setProfitFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [profitTo, setProfitTo] = useState(new Date().toISOString().split('T')[0]);

    // Load makes for filter
    const { data: makes = [] } = useQuery<any[]>({
        queryKey: ['vehicle-makes'],
        queryFn: async () => {
            const res = await inventoryApi.getVehicleMakes();
            return res.data?.data || [];
        },
    });

    const { data: slowData, isLoading: loadingSlow } = useQuery({
        queryKey: ['auto-parts-reports', 'slow-moving', slowDays],
        queryFn: async () => (await reportsApi.getSlowMovingParts({ days: slowDays })).data?.data,
        enabled: activeTab === 'slow',
    });

    const { data: topData, isLoading: loadingTop } = useQuery({
        queryKey: ['auto-parts-reports', 'top-by-make', topDateFrom, topDateTo, topMakeFilter],
        queryFn: async () => {
            const res = await reportsApi.getTopPartsByMake({
                date_from: topDateFrom, date_to: topDateTo,
                make_id: topMakeFilter || undefined
            });
            const data = res.data?.data;
            if (data?.by_make?.length > 0 && !selectedMake) {
                setSelectedMake(data.by_make[0].make_id);
            }
            return data;
        },
        enabled: activeTab === 'top-make',
    });

    const { data: missingData, isLoading: loadingMissing } = useQuery({
        queryKey: ['auto-parts-reports', 'missing-parts'],
        queryFn: async () => (await reportsApi.getMissingParts({})).data?.data,
        enabled: activeTab === 'missing',
    });

    const { data: profitData, isLoading: loadingProfit } = useQuery({
        queryKey: ['auto-parts-reports', 'profit-by-brand', profitFrom, profitTo, profitGroupBy],
        queryFn: async () => (await reportsApi.getProfitByBrand({
            date_from: profitFrom, date_to: profitTo, group_by: profitGroupBy
        })).data?.data,
        enabled: activeTab === 'profit',
    });

    const loading = activeTab === 'slow' ? loadingSlow : activeTab === 'top-make' ? loadingTop : activeTab === 'missing' ? loadingMissing : loadingProfit;

    const fmt = (n: number) => new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US').format(Math.round(n || 0));
    const fmtCur = (n: number) => fmt(n) + (isRTL ? ' ر.س' : ' SAR');

    const getDaysColor = (days: number) => {
        if (days >= 9999) return 'text-red-700 font-bold bg-red-50 dark:bg-red-900/20';
        if (days >= 180)  return 'text-red-600 font-bold';
        if (days >= 90)   return 'text-orange-600 font-bold';
        return 'text-yellow-600';
    };
    const getDaysLabel = (days: number, isRTL: boolean) => {
        if (days >= 9999) return isRTL ? 'لم يُباع' : 'Never sold';
        if (days >= 365)  return isRTL ? `${Math.round(days/30)} شهر` : `${Math.round(days/30)}mo`;
        return isRTL ? `${days} يوم` : `${days}d`;
    };

    const PIE_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

    const urgencyBadge: Record<string, { label: string, className: string }> = {
        critical: { label: isRTL ? '🔴 حرج'  : '🔴 Critical', className: 'bg-red-100 text-red-700' },
        high:     { label: isRTL ? '🟠 عالي'  : '🟠 High',     className: 'bg-orange-100 text-orange-700' },
        medium:   { label: isRTL ? '🟡 متوسط' : '🟡 Medium',   className: 'bg-yellow-100 text-yellow-700' },
    };

    const rowBg = (urgency: string) => ({
        critical: 'bg-red-50/50 dark:bg-red-900/10',
        high:     'bg-orange-50/50 dark:bg-orange-900/10',
        medium:   '',
    })[urgency] || '';

    const marginColor = (pct: number) =>
        pct >= 30 ? 'text-green-600 font-bold' :
        pct >= 15 ? 'text-yellow-600 font-bold' : 'text-red-600 font-bold';

    const qualityLabel: Record<string, string> = {
        original:    isRTL ? 'أصلي'   : 'Original',
        oem:         'OEM',
        aftermarket: isRTL ? 'بديل'   : 'Aftermarket',
        used:        isRTL ? 'مستعمل' : 'Used',
    };

    const exportToCSV = (data: any[], filename: string) => {
        if (!data?.length) return;
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row =>
            Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
        );
        const csv = '\uFEFF' + [headers, ...rows].join('\n'); // BOM للعربي
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const urgencyCards = [
        { label: isRTL ? 'حرج' : 'Critical', value: missingData?.summary?.critical_count, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200' },
        { label: isRTL ? 'عالي' : 'High',     value: missingData?.summary?.high_count,     color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200' },
        { label: isRTL ? 'متوسط' : 'Medium',  value: missingData?.summary?.medium_count,  color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200' },
        { label: isRTL ? 'نفد تماماً' : 'Out of Stock', value: missingData?.summary?.total_out, color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300' },
    ];

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>📊</span> {isRTL ? 'تقارير قطع الغيار' : 'Auto Parts Reports'}
                </h1>
                <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    {[
                        { id: 'slow', label: isRTL ? 'الراكدة' : 'Slow Moving' },
                        { id: 'top-make', label: isRTL ? 'الماركات' : 'Top By Make' },
                        { id: 'missing', label: isRTL ? 'النواقص' : 'Missing Parts' },
                        { id: 'profit', label: isRTL ? 'الربحية' : 'Profitability' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Slow Moving Tab */}
            {activeTab === 'slow' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-2 items-center">
                            <span className="text-sm text-gray-500">{isRTL ? 'فترة الركود:' : 'Slow Period:'}</span>
                            {[30, 60, 90, 180, 365].map(d => (
                                <button key={d}
                                    onClick={() => setSlowDays(d)}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all
                                        ${slowDays === d
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-400'}`}>
                                    {d} {isRTL ? 'يوم' : 'd'}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => exportToCSV(slowData?.items, 'slow-moving-parts')}
                            className="btn-secondary flex items-center gap-2 text-sm">
                            <i className="ti ti-download" aria-hidden="true" />
                            {isRTL ? 'تصدير CSV' : 'Export CSV'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="text-sm text-gray-500 mb-1">{isRTL ? 'إجمالي القطع البطيئة' : 'Total Slow Items'}</div>
                            <div className="text-2xl font-bold">{fmt(slowData?.summary?.total_items)}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="text-sm text-gray-500 mb-1">{isRTL ? 'قيمة المخزون الراكد' : 'Stale Stock Value'}</div>
                            <div className="text-2xl font-bold text-red-600">{fmtCur(slowData?.summary?.total_stock_value)}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="text-sm text-gray-500 mb-1">{isRTL ? 'لم تُباع أبداً' : 'Never Sold'}</div>
                            <div className="text-2xl font-bold text-orange-600">{fmt(slowData?.summary?.never_sold_count)}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="text-sm text-gray-500 mb-1">{isRTL ? 'متوسط الأيام بدون بيع' : 'Avg Days No Sale'}</div>
                            <div className="text-2xl font-bold text-yellow-600">{fmt(slowData?.summary?.avg_days_no_sale)}</div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left rtl:text-right">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-4">{isRTL ? 'المنتج' : 'Product'}</th>
                                        <th className="px-6 py-4">SKU</th>
                                        <th className="px-6 py-4">{isRTL ? 'الماركة / الجودة' : 'Brand / Quality'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'المخزون' : 'Stock'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'قيمة المخزون' : 'Stock Value'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'آخر بيع' : 'Last Sale'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'أيام بدون بيع' : 'Days No Sale'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center">{isRTL ? 'جاري التحميل...' : 'Loading...'}</td></tr>
                                    ) : slowData?.items?.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center">{isRTL ? 'لا توجد بيانات' : 'No data'}</td></tr>
                                    ) : (
                                        slowData?.items?.map((item: any) => (
                                            <tr key={item.id} className="border-b dark:border-gray-700">
                                                <td className="px-6 py-4 font-medium">{isRTL ? item.name_ar || item.name : item.name}</td>
                                                <td className="px-6 py-4 text-gray-500">{item.sku}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium">{item.brand}</div>
                                                    <div className="text-xs text-gray-500">{qualityLabel[item.quality_grade] || item.quality_grade}</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold">{item.stock_quantity}</td>
                                                <td className="px-6 py-4 font-bold">{fmtCur(item.stock_value)}</td>
                                                <td className="px-6 py-4 text-gray-500">{item.last_sale_date || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-xs ${getDaysColor(item.days_since_last_sale)}`}>
                                                        {getDaysLabel(item.days_since_last_sale, isRTL)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Top By Make Tab */}
            {activeTab === 'top-make' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-4 items-center flex-wrap">
                            <input type="date" value={topDateFrom} onChange={e => setTopDateFrom(e.target.value)} className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            <input type="date" value={topDateTo} onChange={e => setTopDateTo(e.target.value)} className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            <select value={topMakeFilter} onChange={e => setTopMakeFilter(e.target.value)} className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-w-[150px]">
                                <option value="">{isRTL ? 'كل الماركات' : 'All Makes'}</option>
                                {makes.map(m => <option key={m.id} value={m.id}>{isRTL ? m.name_ar || m.name : m.name}</option>)}
                            </select>
                        </div>
                        <button onClick={() => exportToCSV(topData?.all_items, 'top-parts-by-make')}
                            className="btn-secondary flex items-center gap-2 text-sm">
                            <i className="ti ti-download" aria-hidden="true" />
                            {isRTL ? 'تصدير CSV' : 'Export CSV'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                            <h3 className="font-bold mb-4">{isRTL ? 'حصة الماركات من الإيرادات' : 'Revenue Share by Make'}</h3>
                            {topData?.by_make?.length > 0 ? (
                                <PieChart width={200} height={200}>
                                    <Pie data={topData.by_make.slice(0, 6)} dataKey="total_revenue" nameKey={isRTL ? 'make_name_ar' : 'make_name'} cx={100} cy={100} outerRadius={80}>
                                        {topData.by_make.slice(0, 6).map((_: any, i: number) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => fmtCur(v)} />
                                </PieChart>
                            ) : (
                                <div className="h-[200px] flex items-center justify-center text-gray-500">{isRTL ? 'لا توجد بيانات' : 'No data'}</div>
                            )}
                        </div>
                        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex flex-wrap gap-2 mb-6">
                                {topData?.by_make?.map((make: any, i: number) => (
                                    <button key={make.make_id}
                                        onClick={() => setSelectedMake(make.make_id)}
                                        className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all
                                            ${selectedMake === make.make_id ? 'text-white shadow-md transform scale-105' : 'hover:opacity-80'}`}
                                        style={selectedMake === make.make_id
                                            ? { background: PIE_COLORS[i % PIE_COLORS.length], borderColor: 'transparent' }
                                            : { borderColor: PIE_COLORS[i % PIE_COLORS.length], color: PIE_COLORS[i % PIE_COLORS.length] }}>
                                        {isRTL ? make.make_name_ar || make.make_name : make.make_name} ({make.revenue_share}%)
                                    </button>
                                ))}
                            </div>
                            
                            {selectedMake && topData?.by_make?.find((m: any) => m.make_id === selectedMake) && (
                                <div className="overflow-x-auto">
                                    <h4 className="font-bold mb-3">{isRTL ? 'أعلى 5 قطع لهذه الماركة' : 'Top 5 parts for this make'}</h4>
                                    <table className="w-full text-sm text-left rtl:text-right">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-4 py-2">{isRTL ? 'المنتج' : 'Product'}</th>
                                                <th className="px-4 py-2">SKU</th>
                                                <th className="px-4 py-2">{isRTL ? 'الكمية' : 'Qty'}</th>
                                                <th className="px-4 py-2">{isRTL ? 'الإيراد' : 'Revenue'}</th>
                                                <th className="px-4 py-2">{isRTL ? 'الربح' : 'Profit'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topData.by_make.find((m: any) => m.make_id === selectedMake).top_parts.map((item: any) => (
                                                <tr key={item.product_id} className="border-b dark:border-gray-700">
                                                    <td className="px-4 py-2 font-medium">{isRTL ? item.product_name_ar || item.product_name : item.product_name}</td>
                                                    <td className="px-4 py-2 text-gray-500">{item.sku}</td>
                                                    <td className="px-4 py-2 font-bold text-blue-600">{item.total_qty}</td>
                                                    <td className="px-4 py-2 font-bold text-green-600">{fmtCur(item.revenue)}</td>
                                                    <td className="px-4 py-2 font-bold text-purple-600">{fmtCur(item.gross_profit)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Missing Parts Tab */}
            {activeTab === 'missing' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-end">
                        <button onClick={() => exportToCSV(missingData?.items, 'missing-parts')}
                            className="btn-secondary flex items-center gap-2 text-sm">
                            <i className="ti ti-download" aria-hidden="true" />
                            {isRTL ? 'تصدير CSV' : 'Export CSV'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {urgencyCards.map((card, i) => (
                            <div key={i} className={`p-4 rounded-2xl shadow-sm border ${card.bg} ${card.border}`}>
                                <div className={`text-sm mb-1 ${card.color}`}>{card.label}</div>
                                <div className={`text-2xl font-bold ${card.color}`}>{fmt(card.value)}</div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left rtl:text-right">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-4">{isRTL ? 'الإلحاح' : 'Urgency'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'المنتج' : 'Product'}</th>
                                        <th className="px-6 py-4">SKU</th>
                                        <th className="px-6 py-4">{isRTL ? 'المخزون الحالي' : 'Current Stock'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'الحد الأدنى' : 'Min Stock'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'بيعت (30 يوم)' : 'Sold (30d)'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'السيارات المتوافقة' : 'Compatible Makes'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center">{isRTL ? 'جاري التحميل...' : 'Loading...'}</td></tr>
                                    ) : missingData?.items?.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center">{isRTL ? 'لا توجد نواقص' : 'No missing parts'}</td></tr>
                                    ) : (
                                        missingData?.items?.map((item: any) => (
                                            <tr key={item.id} className={`border-b dark:border-gray-700 ${rowBg(item.urgency)}`}>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${urgencyBadge[item.urgency]?.className}`}>
                                                        {urgencyBadge[item.urgency]?.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium">{isRTL ? item.name_ar || item.name : item.name}</td>
                                                <td className="px-6 py-4 text-gray-500">{item.sku}</td>
                                                <td className="px-6 py-4 font-bold text-red-600">{item.current_stock}</td>
                                                <td className="px-6 py-4 font-bold">{item.min_stock}</td>
                                                <td className="px-6 py-4 font-bold text-blue-600">{item.sold_last_30_days}</td>
                                                <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate" title={isRTL ? item.compatible_makes_ar : item.compatible_makes}>
                                                    {isRTL ? item.compatible_makes_ar || '-' : item.compatible_makes || '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Profit Tab */}
            {activeTab === 'profit' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-4 items-center flex-wrap">
                            <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                {(['brand', 'quality_grade'] as const).map(g => (
                                    <button key={g}
                                        onClick={() => setProfitGroupBy(g)}
                                        className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium
                                            ${profitGroupBy === g
                                                ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-400'
                                                : 'text-gray-600 dark:text-gray-300'}`}>
                                        {g === 'brand' ? (isRTL ? 'حسب الماركة' : 'By Brand') : (isRTL ? 'حسب الجودة' : 'By Quality')}
                                    </button>
                                ))}
                            </div>
                            <input type="date" value={profitFrom} onChange={e => setProfitFrom(e.target.value)} className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            <input type="date" value={profitTo} onChange={e => setProfitTo(e.target.value)} className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <button onClick={() => exportToCSV(profitData?.items, 'profitability-report')}
                            className="btn-secondary flex items-center gap-2 text-sm">
                            <i className="ti ti-download" aria-hidden="true" />
                            {isRTL ? 'تصدير CSV' : 'Export CSV'}
                        </button>
                    </div>

                    {profitData?.totals && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="text-sm text-gray-500 mb-1">{isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}</div>
                                <div className="text-2xl font-bold text-blue-600">{fmtCur(profitData.totals.total_revenue)}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="text-sm text-gray-500 mb-1">{isRTL ? 'إجمالي التكلفة' : 'Total COGS'}</div>
                                <div className="text-2xl font-bold text-red-500">{fmtCur(profitData.totals.total_cogs)}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="text-sm text-gray-500 mb-1">{isRTL ? 'إجمالي الربح' : 'Gross Profit'}</div>
                                <div className="text-2xl font-bold text-green-600">{fmtCur(profitData.totals.total_gross_profit)}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="text-sm text-gray-500 mb-1">{isRTL ? 'متوسط هامش الربح' : 'Avg Margin'}</div>
                                <div className={`text-2xl ${marginColor(profitData.totals.avg_margin)}`}>{profitData.totals.avg_margin}%</div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="h-[300px] w-full mb-6">
                            {profitData?.items?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={profitData.items.slice(0, 15)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <XAxis dataKey="group_key" stroke="#8884d8" />
                                        <YAxis stroke="#8884d8" />
                                        <Tooltip cursor={{ fill: 'transparent' }} formatter={(v: any) => fmtCur(v)} />
                                        <Legend />
                                        <Bar dataKey="revenue" name={isRTL ? 'الإيراد' : 'Revenue'} fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="gross_profit" name={isRTL ? 'الربح' : 'Profit'} fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500">{isRTL ? 'لا توجد بيانات' : 'No data'}</div>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left rtl:text-right">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-4">{profitGroupBy === 'brand' ? (isRTL ? 'الماركة' : 'Brand') : (isRTL ? 'الجودة' : 'Quality')}</th>
                                        <th className="px-6 py-4">{isRTL ? 'الإيراد' : 'Revenue'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'التكلفة' : 'COGS'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'الربح' : 'Profit'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'هامش %' : 'Margin %'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'حصة الإيراد' : 'Revenue Share'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profitData?.items?.map((item: any) => (
                                        <tr key={item.group_key} className="border-b dark:border-gray-700">
                                            <td className="px-6 py-4 font-bold">{profitGroupBy === 'quality_grade' ? (qualityLabel[item.group_key] || item.group_key) : item.group_key}</td>
                                            <td className="px-6 py-4 font-medium text-blue-600">{fmtCur(item.revenue)}</td>
                                            <td className="px-6 py-4 font-medium text-red-500">{fmtCur(item.cogs)}</td>
                                            <td className="px-6 py-4 font-bold text-green-600">{fmtCur(item.gross_profit)}</td>
                                            <td className="px-6 py-4">
                                                <span className={marginColor(item.profit_margin_pct)}>{item.profit_margin_pct}%</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">{item.revenue_share_pct}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
