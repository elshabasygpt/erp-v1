'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { inventoryApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { RefreshCw, TrendingUp, Package, DollarSign, BarChart3, Download } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import Skeleton from '@/components/ui/Skeleton';

interface ValuationItem {
    product_id: string;
    product_name: string;
    sku: string | null;
    warehouse?: string;
    quantity: number;
    unit_cost: number;
    total_value: number;
    valuation_method?: string;
}

interface ValuationReport {
    items?: ValuationItem[];
    products?: ValuationItem[];
    total_value?: number;
    total_quantity?: number;
    currency?: string;
    generated_at?: string;
    summary?: any;
}

export default function InventoryValuationPage() {
    const { isRTL } = useLanguage();
    const { currency } = useCurrencyFormatter();
    const [report, setReport] = useState<ValuationReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [search, setSearch] = useState('');

    const fetchReport = async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const res = await inventoryApi.getInventoryValuation();
            const data = res.data?.data ?? res.data ?? {};
            setReport(data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشل تحميل تقرير التقييم' : 'Failed to load valuation report'));
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, []);

    const items: ValuationItem[] = report?.items ?? report?.products ?? [];
    const filtered = items.filter(i =>
        i.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        (i.sku ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const totalValue = report?.total_value ?? items.reduce((sum, i) => sum + (i.total_value ?? 0), 0);
    const totalQty = report?.total_quantity ?? items.reduce((sum, i) => sum + (i.quantity ?? 0), 0);

    const formatCurrency = (n: number) => n?.toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00';

    const handleExport = () => {
        if (!items.length) return;
        const headers = isRTL ? ['المنتج', 'SKU', 'الكمية', 'تكلفة الوحدة', 'القيمة الإجمالية'] : ['Product', 'SKU', 'Quantity', 'Unit Cost', 'Total Value'];
        const rows = items.map(i => [i.product_name, i.sku ?? '', i.quantity, i.unit_cost, i.total_value]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `inventory-valuation-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isRTL ? 'تقييم المخزون' : 'Inventory Valuation'}</h1>
                    <p className="text-gray-500 mt-1">{isRTL ? 'القيمة الإجمالية للمخزون المتاح حسب التكلفة' : 'Total value of available stock by cost'}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport} disabled={!items.length} className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> {isRTL ? 'تصدير CSV' : 'Export CSV'}
                    </Button>
                    <Button onClick={fetchReport} disabled={loading} className="flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? (isRTL ? 'جاري التحميل...' : 'Loading...') : (isRTL ? 'تحديث' : 'Refresh')}
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{isRTL ? 'القيمة الإجمالية' : 'Total Value'}</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
                            <p className="text-xs text-gray-400">{report?.currency ?? currency}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{isRTL ? 'إجمالي الكميات' : 'Total Quantity'}</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{totalQty.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">{isRTL ? 'وحدة' : 'units'}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{isRTL ? 'عدد المنتجات' : 'Number of Products'}</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">
                                {report?.generated_at ? `${isRTL ? 'آخر تحديث' : 'Last updated'}: ${new Date(report.generated_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}` : ''}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Items Table */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700">
                    <input
                        className="border rounded px-3 py-2 w-full max-w-sm bg-white dark:bg-gray-800"
                        placeholder={isRTL ? 'بحث بالمنتج أو SKU...' : 'Search by product or SKU...'}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                {(
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500">#</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'المنتج' : 'Product'}</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">SKU</th>
                                    {items[0]?.warehouse && <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'المستودع' : 'Warehouse'}</th>}
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">{isRTL ? 'الكمية' : 'Quantity'}</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">{isRTL ? 'تكلفة الوحدة' : 'Unit Cost'}</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">{isRTL ? 'القيمة الإجمالية' : 'Total Value'}</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">{isRTL ? '% من الإجمالي' : '% of Total'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={`sk-${i}`}>
                                            {Array.from({ length: 8 }).map((__, j) => (
                                                <td key={j} className="p-3"><Skeleton className="w-3/4 h-4" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : loadError ? (
                                    <tr><td colSpan={8} className="p-8 text-center">
                                        <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>{isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}</p>
                                        <button onClick={() => fetchReport()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                                    </td></tr>
                                ) : filtered.map((item, idx) => (
                                    <tr key={item.product_id + (item.warehouse ?? '')} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-gray-500 text-sm">{idx + 1}</td>
                                        <td className="px-4 py-3 font-medium">{item.product_name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.sku ?? '—'}</td>
                                        {items[0]?.warehouse && <td className="px-4 py-3 text-sm">{item.warehouse}</td>}
                                        <td className="px-4 py-3 text-right tabular-nums">{item.quantity?.toLocaleString() ?? 0}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(item.unit_cost)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-700 dark:text-green-400">
                                            {formatCurrency(item.total_value)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs text-gray-500">
                                                {totalValue > 0 ? ((item.total_value / totalValue) * 100).toFixed(1) : 0}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && !loadError && filtered.length === 0 && (
                                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">{isRTL ? 'لا توجد بيانات' : 'No data'}</td></tr>
                                )}
                            </tbody>
                            {!loading && !loadError && filtered.length > 0 && (
                                <tfoot className="bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700">
                                    <tr>
                                        <td colSpan={items[0]?.warehouse ? 6 : 5} className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300 text-right">{isRTL ? 'الإجمالي' : 'Total'}</td>
                                        <td className="px-4 py-3 font-bold text-green-700 dark:text-green-400 text-right tabular-nums">
                                            {formatCurrency(filtered.reduce((s, i) => s + i.total_value, 0))}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
