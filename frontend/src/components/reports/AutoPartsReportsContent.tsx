'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, inventoryApi } from '@/lib/api';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { CHART_COLORS } from '@/lib/chart-colors';
import Skeleton from '@/components/ui/Skeleton';

export default function AutoPartsReportsContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const [activeTab, setActiveTab] = useState<'slow' | 'dead-months' | 'top-make' | 'turnover' | 'top-model' | 'missing' | 'profit'>('slow');

    // Slow Moving State
    const [slowDays, setSlowDays] = useState(90);

    // Dead Stock By Months State
    const [deadStockBucket, setDeadStockBucket] = useState<string | null>(null);

    // Top By Make State
    const [topDateFrom, setTopDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [topDateTo, setTopDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [topMakeFilter, setTopMakeFilter] = useState('');
    const [selectedMake, setSelectedMake] = useState<number | null>(null);

    // Turnover State
    const [turnoverFrom, setTurnoverFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [turnoverTo, setTurnoverTo] = useState(new Date().toISOString().split('T')[0]);

    // Top By Model State
    const [modelDateFrom, setModelDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [modelDateTo, setModelDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [modelMakeFilter, setModelMakeFilter] = useState('');
    const [modelFilter, setModelFilter] = useState('');
    const [selectedModel, setSelectedModel] = useState<number | null>(null);

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

    // Load models for selected make
    const { data: models = [] } = useQuery<any[]>({
        queryKey: ['vehicle-models', modelMakeFilter],
        queryFn: async () => {
            if (!modelMakeFilter) return [];
            const res = await inventoryApi.getVehicleModels(modelMakeFilter);
            return res.data?.data || [];
        },
        enabled: !!modelMakeFilter,
    });

    const { data: slowData, isLoading: loadingSlow, isError: errorSlow, refetch: refetchSlow } = useQuery({
        queryKey: ['auto-parts-reports', 'slow-moving', slowDays],
        queryFn: async () => (await reportsApi.getSlowMovingParts({ days: slowDays })).data?.data,
        enabled: activeTab === 'slow',
    });

    const { data: deadStockData, isLoading: loadingDeadStock, isError: errorDeadStock, refetch: refetchDeadStock } = useQuery({
        queryKey: ['auto-parts-reports', 'dead-stock-months'],
        queryFn: async () => (await reportsApi.getDeadStockByMonths({})).data?.data,
        enabled: activeTab === 'dead-months',
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

    const { data: turnoverData, isLoading: loadingTurnover, isError: errorTurnover, refetch: refetchTurnover } = useQuery({
        queryKey: ['auto-parts-reports', 'turnover-by-make', turnoverFrom, turnoverTo],
        queryFn: async () => (await reportsApi.getTurnoverByMake({ date_from: turnoverFrom, date_to: turnoverTo })).data?.data,
        enabled: activeTab === 'turnover',
    });

    const { data: topModelData, isLoading: loadingTopModel } = useQuery({
        queryKey: ['auto-parts-reports', 'top-by-model', modelDateFrom, modelDateTo, modelMakeFilter, modelFilter],
        queryFn: async () => {
            const res = await reportsApi.getTopPartsByModel({
                date_from: modelDateFrom, date_to: modelDateTo,
                make_id: modelMakeFilter || undefined,
                model_id: modelFilter || undefined,
            });
            const data = res.data?.data;
            if (data?.by_model?.length > 0 && !selectedModel) {
                setSelectedModel(data.by_model[0].model_id);
            }
            return data;
        },
        enabled: activeTab === 'top-model',
    });

    const { data: missingData, isLoading: loadingMissing, isError: errorMissing, refetch: refetchMissing } = useQuery({
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

    const loading =
        activeTab === 'slow'        ? loadingSlow :
        activeTab === 'dead-months' ? loadingDeadStock :
        activeTab === 'top-make'    ? loadingTop :
        activeTab === 'turnover'    ? loadingTurnover :
        activeTab === 'top-model'   ? loadingTopModel :
        activeTab === 'missing'     ? loadingMissing : loadingProfit;

    const fmt = (n: number) => new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US').format(Math.round(n || 0));
    const fmtCur = (n: number) => fmt(n) + (isRTL ? ' ر.س' : ' SAR');
    const fmtDec = (n: number) => new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(n || 0);

    const getDaysColor = (days: number) => {
        if (days >= 9999) return 'text-red-700 font-bold bg-red-50 dark:bg-red-900/20';
        if (days >= 180)  return 'text-red-600 font-bold';
        if (days >= 90)   return 'text-orange-600 font-bold';
        return 'text-yellow-600';
    };
    const getDaysLabel = (days: number) => {
        if (days >= 9999) return isRTL ? 'لم يُباع' : 'Never sold';
        if (days >= 365)  return isRTL ? `${Math.round(days/30)} شهر` : `${Math.round(days/30)}mo`;
        return isRTL ? `${days} يوم` : `${days}d`;
    };

    const PIE_COLORS = CHART_COLORS;

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

    const performanceBadge: Record<string, { label: string; className: string }> = {
        excellent: { label: isRTL ? 'ممتاز'   : 'Excellent',  className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        good:      { label: isRTL ? 'جيد'     : 'Good',       className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        average:   { label: isRTL ? 'متوسط'   : 'Average',    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
        slow:      { label: isRTL ? 'بطيء'    : 'Slow',       className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
        no_sales:  { label: isRTL ? 'لا مبيعات' : 'No Sales', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };

    const bucketMeta: Record<string, { label: string; color: string; bg: string; border: string }> = {
        never:    { label: isRTL ? 'لم تُباع أبداً' : 'Never Sold',  color: 'text-red-700',    bg: 'bg-red-100 dark:bg-red-900/30',    border: 'border-red-300' },
        '12m_plus':{ label: isRTL ? 'أكثر من 12 شهر' : '12+ Months', color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200' },
        '6_12m':  { label: isRTL ? '6 - 12 شهر'    : '6–12 Months', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20',border: 'border-orange-200' },
        '3_6m':   { label: isRTL ? '3 - 6 أشهر'    : '3–6 Months',  color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20',border: 'border-yellow-200' },
        '1_3m':   { label: isRTL ? '1 - 3 أشهر'    : '1–3 Months',  color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200' },
    };

    const exportToCSV = (data: any[], filename: string) => {
        if (!data?.length) return;
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row =>
            Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
        );
        const csv = '﻿' + [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const urgencyCards = [
        { label: isRTL ? 'حرج' : 'Critical',       value: missingData?.summary?.critical_count, color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200' },
        { label: isRTL ? 'عالي' : 'High',           value: missingData?.summary?.high_count,     color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20',border: 'border-orange-200' },
        { label: isRTL ? 'متوسط' : 'Medium',        value: missingData?.summary?.medium_count,   color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20',border: 'border-yellow-200' },
        { label: isRTL ? 'نفد تماماً' : 'Out of Stock', value: missingData?.summary?.total_out, color: 'text-red-700',    bg: 'bg-red-100 dark:bg-red-900/30',    border: 'border-red-300' },
    ];

    const tabs = [
        { id: 'slow',        label: isRTL ? 'الراكدة'      : 'Slow Moving' },
        { id: 'dead-months', label: isRTL ? 'راكد بالأشهر' : 'Dead Stock' },
        { id: 'top-make',    label: isRTL ? 'الماركات'     : 'Top By Make' },
        { id: 'turnover',    label: isRTL ? 'معدل الدوران' : 'Turnover' },
        { id: 'top-model',   label: isRTL ? 'الموديلات'    : 'By Model' },
        { id: 'missing',     label: isRTL ? 'النواقص'      : 'Missing Parts' },
        { id: 'profit',      label: isRTL ? 'الربحية'      : 'Profitability' },
    ];

    const activeBucketItems = deadStockBucket
        ? (deadStockData?.buckets?.[deadStockBucket]?.items ?? [])
        : Object.values(deadStockData?.buckets ?? {}).flatMap((b: any) => b.items ?? []);

    const deadStockChartData = Object.entries(deadStockData?.buckets ?? {}).map(([key, b]: [string, any]) => ({
        name: isRTL ? b.label : b.label_en,
        value: b.total_value,
        count: b.count,
        key,
    }));

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>📊</span> {isRTL ? 'تقارير قطع الغيار' : 'Auto Parts Reports'}
                </h1>
                <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
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

            {/* ── Slow Moving Tab ── */}
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
                        {[
                            { label: isRTL ? 'إجمالي القطع البطيئة' : 'Total Slow Items',    value: fmt(slowData?.summary?.total_items),       color: '' },
                            { label: isRTL ? 'قيمة المخزون الراكد'  : 'Stale Stock Value',   value: fmtCur(slowData?.summary?.total_stock_value), color: 'text-red-600' },
                            { label: isRTL ? 'لم تُباع أبداً'       : 'Never Sold',          value: fmt(slowData?.summary?.never_sold_count),   color: 'text-orange-600' },
                            { label: isRTL ? 'متوسط الأيام بدون بيع': 'Avg Days No Sale',    value: fmt(slowData?.summary?.avg_days_no_sale),   color: 'text-yellow-600' },
                        ].map((card, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="text-sm text-gray-500 mb-1">{card.label}</div>
                                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                            </div>
                        ))}
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
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <tr key={`sk-${i}`} className="border-b dark:border-gray-700">
                                                {Array.from({ length: 7 }).map((__, j) => (
                                                    <td key={j} className="px-6 py-4"><Skeleton className="w-3/4 h-4" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : errorSlow ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center">
                                                <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>{isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}</p>
                                                <button onClick={() => refetchSlow()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                                            </td>
                                        </tr>
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
                                                        {getDaysLabel(item.days_since_last_sale)}
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

            {/* ── Dead Stock By Months Tab ── */}
            {activeTab === 'dead-months' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
                        <h2 className="font-semibold text-gray-700 dark:text-gray-200">
                            {isRTL ? 'تصنيف المخزون الراكد حسب مدة الركود' : 'Dead Stock Classified by Inactivity Period'}
                        </h2>
                        <button onClick={() => exportToCSV(activeBucketItems, 'dead-stock-by-months')}
                            className="btn-secondary flex items-center gap-2 text-sm">
                            <i className="ti ti-download" aria-hidden="true" />
                            {isRTL ? 'تصدير CSV' : 'Export CSV'}
                        </button>
                    </div>

                    {/* KPI Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {Object.entries(bucketMeta).map(([key, meta]) => {
                            const bucket = deadStockData?.buckets?.[key];
                            return (
                                <button key={key}
                                    onClick={() => setDeadStockBucket(deadStockBucket === key ? null : key)}
                                    className={`p-4 rounded-2xl border text-start transition-all ${meta.bg} ${meta.border}
                                        ${deadStockBucket === key ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm'}`}>
                                    <div className={`text-xs font-medium mb-1 ${meta.color}`}>{meta.label}</div>
                                    <div className={`text-xl font-bold ${meta.color}`}>{fmt(bucket?.count ?? 0)}</div>
                                    <div className="text-xs text-gray-500 mt-1">{fmtCur(bucket?.total_value ?? 0)}</div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Summary totals */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="text-sm text-gray-500 mb-1">{isRTL ? 'إجمالي القطع الراكدة' : 'Total Dead Stock Items'}</div>
                            <div className="text-2xl font-bold">{fmt(deadStockData?.summary?.total_items)}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="text-sm text-gray-500 mb-1">{isRTL ? 'إجمالي قيمة المخزون الراكد' : 'Total Dead Stock Value'}</div>
                            <div className="text-2xl font-bold text-red-600">{fmtCur(deadStockData?.summary?.total_stock_value)}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="text-sm text-gray-500 mb-1">{isRTL ? 'راكد أكثر من 6 أشهر' : 'Dead > 6 Months'}</div>
                            <div className="text-2xl font-bold text-orange-600">{fmt(deadStockData?.summary?.over_6m_count)}</div>
                        </div>
                    </div>

                    {/* Chart */}
                    {deadStockChartData.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-semibold mb-4 text-gray-700 dark:text-gray-200">
                                {isRTL ? 'توزيع قيمة المخزون الراكد' : 'Dead Stock Value Distribution'}
                            </h3>
                            <div className="h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deadStockChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                        <XAxis dataKey="name" stroke="#8884d8" tick={{ fontSize: 11 }} />
                                        <YAxis stroke="#8884d8" />
                                        <Tooltip formatter={(v: any) => fmtCur(v)} />
                                        <Bar dataKey="value" name={isRTL ? 'قيمة المخزون' : 'Stock Value'} radius={[4,4,0,0]}>
                                            {deadStockChartData.map((entry, i) => (
                                                <Cell key={i} fill={
                                                    entry.key === 'never'    ? '#ef4444' :
                                                    entry.key === '12m_plus' ? '#f97316' :
                                                    entry.key === '6_12m'    ? '#f59e0b' :
                                                    entry.key === '3_6m'     ? '#eab308' : '#3b82f6'
                                                } />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Items Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {deadStockBucket && (
                            <div className={`px-6 py-3 flex items-center justify-between ${bucketMeta[deadStockBucket]?.bg} border-b ${bucketMeta[deadStockBucket]?.border}`}>
                                <span className={`font-semibold ${bucketMeta[deadStockBucket]?.color}`}>
                                    {isRTL ? 'تصفية: ' : 'Filter: '}{bucketMeta[deadStockBucket]?.label}
                                </span>
                                <button onClick={() => setDeadStockBucket(null)} className="text-xs text-gray-500 hover:text-gray-800 underline">
                                    {isRTL ? 'إلغاء التصفية' : 'Clear filter'}
                                </button>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left rtl:text-right">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-4">{isRTL ? 'فئة الركود' : 'Bucket'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'المنتج' : 'Product'}</th>
                                        <th className="px-6 py-4">SKU</th>
                                        <th className="px-6 py-4">{isRTL ? 'الماركة' : 'Brand'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'المخزون' : 'Stock'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'قيمة المخزون' : 'Stock Value'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'آخر بيع' : 'Last Sale'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'الأيام' : 'Days'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <tr key={`sk-${i}`} className="border-b dark:border-gray-700">
                                                {Array.from({ length: 8 }).map((__, j) => (
                                                    <td key={j} className="px-6 py-4"><Skeleton className="w-3/4 h-4" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : errorDeadStock ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-8 text-center">
                                                <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>{isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}</p>
                                                <button onClick={() => refetchDeadStock()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                                            </td>
                                        </tr>
                                    ) : activeBucketItems.length === 0 ? (
                                        <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">{isRTL ? 'لا توجد بيانات' : 'No data'}</td></tr>
                                    ) : (
                                        activeBucketItems.map((item: any) => {
                                            const bm = bucketMeta[item.bucket];
                                            return (
                                                <tr key={`${item.id}-${item.bucket}`} className="border-b dark:border-gray-700">
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${bm?.bg} ${bm?.color}`}>
                                                            {bm?.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">{isRTL ? item.name_ar || item.name : item.name}</td>
                                                    <td className="px-6 py-4 text-gray-500">{item.sku}</td>
                                                    <td className="px-6 py-4">{item.brand || '-'}</td>
                                                    <td className="px-6 py-4 font-bold">{item.stock_quantity}</td>
                                                    <td className="px-6 py-4 font-bold text-red-600">{fmtCur(item.stock_value)}</td>
                                                    <td className="px-6 py-4 text-gray-500">{item.last_sale_date || '-'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-xs ${getDaysColor(item.days_since_last_sale)}`}>
                                                            {getDaysLabel(item.days_since_last_sale)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Top By Make Tab ── */}
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

            {/* ── Turnover By Make Tab ── */}
            {activeTab === 'turnover' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-4 items-center flex-wrap">
                            <label className="text-sm text-gray-500">{isRTL ? 'من:' : 'From:'}</label>
                            <input type="date" value={turnoverFrom} onChange={e => setTurnoverFrom(e.target.value)} className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            <label className="text-sm text-gray-500">{isRTL ? 'إلى:' : 'To:'}</label>
                            <input type="date" value={turnoverTo} onChange={e => setTurnoverTo(e.target.value)} className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <button onClick={() => exportToCSV(turnoverData?.items ?? [], 'turnover-by-make')}
                            className="btn-secondary flex items-center gap-2 text-sm">
                            <i className="ti ti-download" aria-hidden="true" />
                            {isRTL ? 'تصدير CSV' : 'Export CSV'}
                        </button>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: isRTL ? 'إجمالي الماركات'         : 'Total Makes',         value: fmt(turnoverData?.summary?.total_makes),           color: '' },
                            { label: isRTL ? 'قيمة المخزون الكلية'     : 'Total Inventory',     value: fmtCur(turnoverData?.summary?.total_inventory_value), color: 'text-blue-600' },
                            { label: isRTL ? 'متوسط معدل الدوران'       : 'Avg Turnover Ratio',  value: fmtDec(turnoverData?.summary?.avg_turnover_ratio) + 'x', color: 'text-green-600' },
                            { label: isRTL ? 'ماركات بطيئة / بلا مبيعات': 'Slow / No Sales',    value: fmt(turnoverData?.summary?.slow_count),            color: 'text-red-600' },
                        ].map((card, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="text-sm text-gray-500 mb-1">{card.label}</div>
                                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Chart */}
                    {(turnoverData?.items?.length ?? 0) > 0 && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-semibold mb-4">{isRTL ? 'معدل دوران المخزون لكل ماركة (مرات/سنة)' : 'Inventory Turnover per Make (times/year)'}</h3>
                            <div className="h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={turnoverData.items.slice(0, 15).map((it: any) => ({
                                        name: isRTL ? it.make_name_ar || it.make_name : it.make_name,
                                        turnover: it.turnover_ratio,
                                        dsi: it.dsi_days,
                                    }))} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                                        <XAxis dataKey="name" stroke="#8884d8" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                                        <YAxis stroke="#8884d8" />
                                        <Tooltip formatter={(v: any, name: string) =>
                                            name === 'turnover' ? [`${fmtDec(v)}x`, isRTL ? 'معدل الدوران' : 'Turnover'] :
                                            [`${fmt(v)} ${isRTL ? 'يوم' : 'd'}`, isRTL ? 'أيام المخزون' : 'DSI']
                                        } />
                                        <Legend />
                                        <Bar dataKey="turnover" name={isRTL ? 'معدل الدوران' : 'Turnover'} fill="#10b981" radius={[4,4,0,0]}>
                                            {turnoverData.items.slice(0, 15).map((it: any, i: number) => (
                                                <Cell key={i} fill={
                                                    it.performance === 'excellent' ? '#22c55e' :
                                                    it.performance === 'good'      ? '#0ea5e9' :
                                                    it.performance === 'average'   ? '#f59e0b' :
                                                    it.performance === 'slow'      ? '#f97316' : '#ef4444'
                                                } />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left rtl:text-right">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-4">{isRTL ? 'الماركة' : 'Make'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'الأداء' : 'Performance'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'المنتجات' : 'SKUs'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'قيمة المخزون' : 'Inventory Value'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'تكلفة المبيعات' : 'COGS'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'الإيراد' : 'Revenue'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'معدل الدوران' : 'Turnover'}</th>
                                        <th className="px-6 py-4">{isRTL ? 'أيام المخزون' : 'DSI (days)'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <tr key={`sk-${i}`} className="border-b dark:border-gray-700">
                                                {Array.from({ length: 8 }).map((__, j) => (
                                                    <td key={j} className="px-6 py-4"><Skeleton className="w-3/4 h-4" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : errorTurnover ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-8 text-center">
                                                <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>{isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}</p>
                                                <button onClick={() => refetchTurnover()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                                            </td>
                                        </tr>
                                    ) : (turnoverData?.items?.length ?? 0) === 0 ? (
                                        <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">{isRTL ? 'لا توجد بيانات' : 'No data'}</td></tr>
                                    ) : (
                                        turnoverData.items.map((item: any) => {
                                            const pb = performanceBadge[item.performance];
                                            return (
                                                <tr key={item.make_id} className="border-b dark:border-gray-700">
                                                    <td className="px-6 py-4 font-bold">{isRTL ? item.make_name_ar || item.make_name : item.make_name}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${pb?.className}`}>{pb?.label}</span>
                                                    </td>
                                                    <td className="px-6 py-4">{fmt(item.total_skus)}</td>
                                                    <td className="px-6 py-4 font-medium text-blue-600">{fmtCur(item.inventory_value)}</td>
                                                    <td className="px-6 py-4 font-medium text-red-500">{fmtCur(item.cogs)}</td>
                                                    <td className="px-6 py-4 font-medium text-green-600">{fmtCur(item.revenue)}</td>
                                                    <td className="px-6 py-4 font-bold">{fmtDec(item.turnover_ratio)}x</td>
                                                    <td className="px-6 py-4 text-gray-600">
                                                        {item.dsi_days != null ? `${fmt(item.dsi_days)} ${isRTL ? 'يوم' : 'd'}` : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Top Parts By Model Tab ── */}
            {activeTab === 'top-model' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-3 items-center flex-wrap">
                            <input type="date" value={modelDateFrom} onChange={e => setModelDateFrom(e.target.value)} className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            <input type="date" value={modelDateTo} onChange={e => setModelDateTo(e.target.value)} className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            <select value={modelMakeFilter} onChange={e => { setModelMakeFilter(e.target.value); setModelFilter(''); setSelectedModel(null); }}
                                className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-w-[140px]">
                                <option value="">{isRTL ? 'كل الماركات' : 'All Makes'}</option>
                                {makes.map(m => <option key={m.id} value={m.id}>{isRTL ? m.name_ar || m.name : m.name}</option>)}
                            </select>
                            {modelMakeFilter && (
                                <select value={modelFilter} onChange={e => { setModelFilter(e.target.value); setSelectedModel(null); }}
                                    className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-w-[140px]">
                                    <option value="">{isRTL ? 'كل الموديلات' : 'All Models'}</option>
                                    {models.map((m: any) => <option key={m.id} value={m.id}>{isRTL ? m.name_ar || m.name : m.name}</option>)}
                                </select>
                            )}
                        </div>
                        <button onClick={() => {
                            const flat = (topModelData?.by_model ?? []).flatMap((m: any) => m.top_parts.map((p: any) => ({ ...p, model: isRTL ? m.model_name_ar || m.model_name : m.model_name })));
                            exportToCSV(flat, 'top-parts-by-model');
                        }} className="btn-secondary flex items-center gap-2 text-sm">
                            <i className="ti ti-download" aria-hidden="true" />
                            {isRTL ? 'تصدير CSV' : 'Export CSV'}
                        </button>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: isRTL ? 'عدد الموديلات'      : 'Models',         value: fmt(topModelData?.models_count),  color: '' },
                            { label: isRTL ? 'إجمالي الكميات'     : 'Total Units',    value: fmt(topModelData?.total_qty),     color: 'text-blue-600' },
                            { label: isRTL ? 'إجمالي الإيرادات'   : 'Total Revenue',  value: fmtCur(topModelData?.total_revenue), color: 'text-green-600' },
                        ].map((card, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="text-sm text-gray-500 mb-1">{card.label}</div>
                                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Model list */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <h3 className="font-semibold text-sm">{isRTL ? 'الموديلات' : 'Models'}</h3>
                            </div>
                            <div className="divide-y dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                                {loading ? (
                                    <div className="p-6 text-center text-gray-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                                ) : (topModelData?.by_model ?? []).length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">{isRTL ? 'لا توجد بيانات' : 'No data'}</div>
                                ) : (
                                    (topModelData?.by_model ?? []).map((model: any, i: number) => (
                                        <button key={model.model_id} onClick={() => setSelectedModel(model.model_id)}
                                            className={`w-full px-4 py-3 text-start flex items-center justify-between transition-colors
                                                ${selectedModel === model.model_id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                            <div>
                                                <div className="font-medium text-sm">
                                                    <span className="text-gray-400 text-xs me-1">#{i+1}</span>
                                                    {isRTL ? model.model_name_ar || model.model_name : model.model_name}
                                                </div>
                                                <div className="text-xs text-gray-500">{isRTL ? model.make_name_ar || model.make_name : model.make_name}</div>
                                            </div>
                                            <div className="text-end">
                                                <div className="text-sm font-bold text-blue-600">{fmt(model.total_qty)}</div>
                                                <div className="text-xs text-gray-500">{fmtCur(model.total_revenue)}</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Parts table for selected model */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            {selectedModel && (() => {
                                const model = (topModelData?.by_model ?? []).find((m: any) => m.model_id === selectedModel);
                                if (!model) return null;
                                return (
                                    <>
                                        <div className="px-6 py-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
                                            <h3 className="font-bold">
                                                {isRTL ? model.make_name_ar || model.make_name : model.make_name}
                                                {' / '}
                                                {isRTL ? model.model_name_ar || model.model_name : model.model_name}
                                            </h3>
                                            <div className="text-sm text-gray-500">
                                                {model.skus_sold} {isRTL ? 'صنف' : 'SKUs'} &bull; {fmt(model.total_qty)} {isRTL ? 'وحدة' : 'units'}
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left rtl:text-right">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                                                    <tr>
                                                        <th className="px-4 py-3">#</th>
                                                        <th className="px-4 py-3">{isRTL ? 'المنتج' : 'Product'}</th>
                                                        <th className="px-4 py-3">SKU</th>
                                                        <th className="px-4 py-3">{isRTL ? 'الماركة' : 'Brand'}</th>
                                                        <th className="px-4 py-3">{isRTL ? 'الطلبات' : 'Orders'}</th>
                                                        <th className="px-4 py-3">{isRTL ? 'الكمية' : 'Qty'}</th>
                                                        <th className="px-4 py-3">{isRTL ? 'الإيراد' : 'Revenue'}</th>
                                                        <th className="px-4 py-3">{isRTL ? 'الربح' : 'Profit'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {model.top_parts.map((part: any, idx: number) => (
                                                        <tr key={part.product_id} className="border-b dark:border-gray-700">
                                                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                                                            <td className="px-4 py-3 font-medium">{isRTL ? part.product_name_ar || part.product_name : part.product_name}</td>
                                                            <td className="px-4 py-3 text-gray-500 text-xs">{part.sku}</td>
                                                            <td className="px-4 py-3 text-xs">{part.brand || '-'}</td>
                                                            <td className="px-4 py-3 text-center">{fmt(part.order_count)}</td>
                                                            <td className="px-4 py-3 font-bold text-blue-600">{fmt(part.total_qty)}</td>
                                                            <td className="px-4 py-3 font-medium text-green-600">{fmtCur(part.revenue)}</td>
                                                            <td className="px-4 py-3 font-medium text-purple-600">{fmtCur(part.gross_profit)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                );
                            })()}
                            {!selectedModel && (
                                <div className="flex items-center justify-center h-64 text-gray-400">
                                    {isRTL ? 'اختر موديلاً من القائمة' : 'Select a model from the list'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Missing Parts Tab ── */}
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
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <tr key={`sk-${i}`} className="border-b dark:border-gray-700">
                                                {Array.from({ length: 7 }).map((__, j) => (
                                                    <td key={j} className="px-6 py-4"><Skeleton className="w-3/4 h-4" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : errorMissing ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center">
                                                <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>{isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}</p>
                                                <button onClick={() => refetchMissing()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                                            </td>
                                        </tr>
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

            {/* ── Profit Tab ── */}
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
                                        <Bar dataKey="revenue" name={isRTL ? 'الإيراد' : 'Revenue'} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
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
