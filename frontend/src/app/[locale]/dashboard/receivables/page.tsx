'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import api from '@/lib/api';
import Skeleton from '@/components/ui/Skeleton';

export default function ReceivablesPage() {
    const { isRTL } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setLoadError(false);
            const res = await api.get('/crm/receivables/aging');
            if (res.data?.success) {
                setData(res.data.data);
            }
        } catch (error) {
            setLoadError(true);
            console.error('Failed to load receivables', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {isRTL ? 'إدارة الذمم المدينة (أعمار الديون)' : 'Receivables Aging Report'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {isRTL ? 'متابعة الديون المستحقة على العملاء وتصنيفها حسب فترة التأخير' : 'Track outstanding customer balances and aging categories'}
                    </p>
                </div>
                <button onClick={fetchData} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
                    🔄 {isRTL ? 'تحديث' : 'Refresh'}
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">{isRTL ? 'العميل' : 'Customer'}</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">{isRTL ? 'إجمالي المستحق' : 'Total Due'}</th>
                                <th className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">{isRTL ? '0-30 يوم' : '0-30 Days'}</th>
                                <th className="px-6 py-4 text-sm font-bold text-yellow-600 text-right">{isRTL ? '31-60 يوم' : '31-60 Days'}</th>
                                <th className="px-6 py-4 text-sm font-bold text-orange-600 text-right">{isRTL ? '61-90 يوم' : '61-90 Days'}</th>
                                <th className="px-6 py-4 text-sm font-bold text-red-600 text-right">{isRTL ? 'أكثر من 90 يوم' : '+90 Days'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={`sk-${i}`}>
                                        {Array.from({ length: 6 }).map((__, j) => (
                                            <td key={j} className="px-6 py-4"><Skeleton className="w-3/4 h-4" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : loadError ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center">
                                        <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                                            {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                                        </p>
                                        <button onClick={() => fetchData()} className="btn-secondary py-1.5 px-4 text-xs">
                                            🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                                        </button>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                                        {isRTL ? 'لا توجد ديون مستحقة' : 'No outstanding receivables found'}
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                                            {item.customer_name}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white text-lg">
                                            {parseFloat(item.total_due).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-emerald-700 dark:text-emerald-400">
                                            {parseFloat(item._0_30_days) > 0 ? parseFloat(item._0_30_days).toFixed(2) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-yellow-700 dark:text-yellow-400">
                                            {parseFloat(item._31_60_days) > 0 ? parseFloat(item._31_60_days).toFixed(2) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-orange-700 dark:text-orange-400">
                                            {parseFloat(item._61_90_days) > 0 ? parseFloat(item._61_90_days).toFixed(2) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                                            {parseFloat(item.over_90_days) > 0 ? parseFloat(item.over_90_days).toFixed(2) : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {!loading && !loadError && data.length > 0 && (
                            <tfoot className="bg-slate-50 dark:bg-slate-900/80 border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                                <tr>
                                    <td className="px-6 py-5 text-lg">{isRTL ? 'الإجمالي الكلي' : 'Grand Total'}</td>
                                    <td className="px-6 py-5 text-right text-lg text-indigo-700 dark:text-indigo-400">
                                        {data.reduce((s, i) => s + parseFloat(i.total_due || 0), 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-5 text-right text-emerald-700 dark:text-emerald-400">
                                        {data.reduce((s, i) => s + parseFloat(i._0_30_days || 0), 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-5 text-right text-yellow-700 dark:text-yellow-400">
                                        {data.reduce((s, i) => s + parseFloat(i._31_60_days || 0), 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-5 text-right text-orange-700 dark:text-orange-400">
                                        {data.reduce((s, i) => s + parseFloat(i._61_90_days || 0), 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-5 text-right text-red-700 dark:text-red-400">
                                        {data.reduce((s, i) => s + parseFloat(i.over_90_days || 0), 0).toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
