'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import Skeleton from '@/components/ui/Skeleton';

export default function ReceivablesDashboard({ isRTL }: { isRTL: boolean }) {
    const [agingData, setAgingData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const loadAging = () => {
        setLoading(true);
        setLoadError(false);
        api.get('/crm/receivables/aging')
            .then(res => setAgingData(res.data?.data || []))
            .catch(() => { setAgingData([]); setLoadError(true); })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadAging();
    }, []);

    const totalDue = agingData.reduce((sum, item) => sum + Number(item.total_due), 0);
    const total0_30 = agingData.reduce((sum, item) => sum + Number(item._0_30_days), 0);
    const total31_60 = agingData.reduce((sum, item) => sum + Number(item._31_60_days), 0);
    const total61_90 = agingData.reduce((sum, item) => sum + Number(item._61_90_days), 0);
    const total90Plus = agingData.reduce((sum, item) => sum + Number(item.over_90_days), 0);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">{isRTL ? 'إدارة المديونيات' : 'Receivables Dashboard'}</h1>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">{isRTL ? 'إجمالي الديون' : 'Total Receivables'}</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalDue.toFixed(2)} SAR</p>
                </Card>
                <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">0 - 30 {isRTL ? 'يوم' : 'Days'}</p>
                    <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{total0_30.toFixed(2)} SAR</p>
                </Card>
                <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium mb-1">31 - 60 {isRTL ? 'يوم' : 'Days'}</p>
                    <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{total31_60.toFixed(2)} SAR</p>
                </Card>
                <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800">
                    <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">61 - 90 {isRTL ? 'يوم' : 'Days'}</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{total61_90.toFixed(2)} SAR</p>
                </Card>
                <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">+90 {isRTL ? 'يوم (متأخر جداً)' : 'Days (Severely Overdue)'}</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">{total90Plus.toFixed(2)} SAR</p>
                </Card>
            </div>

            {/* Aging Report Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-start text-sm">
                        <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                            <tr>
                                <th className="p-4 font-semibold">{isRTL ? 'العميل' : 'Customer'}</th>
                                <th className="p-4 font-semibold text-end">{isRTL ? 'إجمالي الدين' : 'Total Due'}</th>
                                <th className="p-4 font-semibold text-end">0 - 30</th>
                                <th className="p-4 font-semibold text-end">31 - 60</th>
                                <th className="p-4 font-semibold text-end">61 - 90</th>
                                <th className="p-4 font-semibold text-end">+90</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={`sk-${i}`} className="border-b">
                                        {Array.from({ length: 6 }).map((__, j) => (
                                            <td key={j} className="p-4"><Skeleton className="w-3/4 h-4" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : loadError ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <p className="mb-3 text-sm text-red-600">{isRTL ? 'تعذّر تحميل تقرير المديونيات.' : 'Failed to load receivables report.'}</p>
                                        <button onClick={() => loadAging()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                                    </td>
                                </tr>
                            ) : agingData.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">{isRTL ? 'لا توجد مديونيات' : 'No receivables found'}</td></tr>
                            ) : (
                                agingData.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                        <td className="p-4 font-medium">{row.customer_name}</td>
                                        <td className="p-4 text-end font-bold text-blue-600">{Number(row.total_due).toFixed(2)}</td>
                                        <td className="p-4 text-end">{Number(row._0_30_days) > 0 ? Number(row._0_30_days).toFixed(2) : '-'}</td>
                                        <td className="p-4 text-end text-yellow-600">{Number(row._31_60_days) > 0 ? Number(row._31_60_days).toFixed(2) : '-'}</td>
                                        <td className="p-4 text-end text-orange-600">{Number(row._61_90_days) > 0 ? Number(row._61_90_days).toFixed(2) : '-'}</td>
                                        <td className="p-4 text-end font-bold text-red-600">{Number(row.over_90_days) > 0 ? Number(row.over_90_days).toFixed(2) : '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
