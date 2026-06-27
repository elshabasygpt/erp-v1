'use client';

import { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { RefreshCw, AlertTriangle, CheckCircle, Package, Download } from 'lucide-react';

interface ReconciliationItem {
    product_id: string;
    product_name: string;
    sku: string | null;
    system_quantity: number;
    actual_quantity?: number;
    variance: number;
    variance_value: number;
    status: 'matched' | 'discrepancy' | 'missing';
    warehouse?: string;
    last_movement?: string;
}

interface ReconciliationReport {
    items?: ReconciliationItem[];
    discrepancies?: ReconciliationItem[];
    total_products?: number;
    matched_count?: number;
    discrepancy_count?: number;
    total_variance_value?: number;
    generated_at?: string;
}

export default function InventoryReconciliationPage() {
    const [report, setReport] = useState<ReconciliationReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'discrepancy' | 'matched'>('all');
    const [search, setSearch] = useState('');

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await inventoryApi.getInventoryReconciliation();
            const data = res.data?.data ?? res.data ?? {};
            setReport(data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'فشل تحميل تقرير المطابقة');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, []);

    const items: ReconciliationItem[] = report?.items ?? report?.discrepancies ?? [];
    const filtered = items.filter(i => {
        const matchSearch = i.product_name?.toLowerCase().includes(search.toLowerCase()) || (i.sku ?? '').toLowerCase().includes(search.toLowerCase());
        if (!matchSearch) return false;
        if (filter === 'discrepancy') return i.status !== 'matched' || i.variance !== 0;
        if (filter === 'matched') return i.status === 'matched' && i.variance === 0;
        return true;
    });

    const matched = items.filter(i => i.status === 'matched' || i.variance === 0).length;
    const discrepancies = items.filter(i => i.status !== 'matched' || i.variance !== 0).length;
    const totalVariance = Math.abs(report?.total_variance_value ?? items.reduce((s, i) => s + Math.abs(i.variance_value ?? 0), 0));

    const handleExport = () => {
        if (!items.length) return;
        const headers = ['المنتج', 'SKU', 'الكمية بالنظام', 'الفرق', 'قيمة الفرق', 'الحالة'];
        const rows = items.map(i => [i.product_name, i.sku ?? '', i.system_quantity, i.variance, i.variance_value, i.status]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `reconciliation-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const statusBadge = (item: ReconciliationItem) => {
        if (item.status === 'matched' || item.variance === 0)
            return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">متطابق</span>;
        if (item.status === 'missing')
            return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">مفقود</span>;
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">فرق</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">مطابقة المخزون / Inventory Reconciliation</h1>
                    <p className="text-gray-500 mt-1">مقارنة أرصدة المخزون بين النظام والواقع الفعلي</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport} disabled={!items.length} className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> تصدير
                    </Button>
                    <Button onClick={fetchReport} disabled={loading} className="flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'جاري التحميل...' : 'تحديث'}
                    </Button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">متطابقة</p>
                            <p className="text-2xl font-bold text-green-600">{matched}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">بها فروقات</p>
                            <p className="text-2xl font-bold text-yellow-600">{discrepancies}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">قيمة الفروقات</p>
                            <p className="text-xl font-bold text-red-600">{totalVariance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters + Table */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-3 items-center">
                    <input
                        className="border rounded px-3 py-2 w-full max-w-xs bg-white dark:bg-gray-800"
                        placeholder="بحث..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <div className="flex gap-1">
                        {[['all', 'الكل'], ['discrepancy', 'الفروقات'], ['matched', 'متطابق']].map(([val, label]) => (
                            <button key={val}
                                onClick={() => setFilter(val as any)}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filter === val ? 'bg-blue-500 text-white border-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-500">
                        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-400" />
                        جاري تحميل التقرير...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500">#</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">المنتج</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">SKU</th>
                                    {items[0]?.warehouse && <th className="px-4 py-3 font-medium text-gray-500">المستودع</th>}
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">الكمية بالنظام</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">الفرق</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">قيمة الفرق</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filtered.map((item, idx) => (
                                    <tr key={item.product_id + (item.warehouse ?? '')}
                                        className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${item.variance !== 0 ? 'bg-yellow-50/30 dark:bg-yellow-900/5' : ''}`}>
                                        <td className="px-4 py-3 text-gray-500 text-sm">{idx + 1}</td>
                                        <td className="px-4 py-3 font-medium">{item.product_name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.sku ?? '—'}</td>
                                        {items[0]?.warehouse && <td className="px-4 py-3 text-sm">{item.warehouse}</td>}
                                        <td className="px-4 py-3 text-right tabular-nums">{item.system_quantity?.toLocaleString() ?? 0}</td>
                                        <td className={`px-4 py-3 text-right tabular-nums font-semibold ${item.variance > 0 ? 'text-green-600' : item.variance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                            {item.variance > 0 ? '+' : ''}{item.variance?.toLocaleString() ?? 0}
                                        </td>
                                        <td className={`px-4 py-3 text-right tabular-nums ${item.variance_value !== 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                            {Math.abs(item.variance_value ?? 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3">{statusBadge(item)}</td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">لا توجد بيانات</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
