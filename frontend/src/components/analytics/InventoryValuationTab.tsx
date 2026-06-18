'use client';

import React, { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function InventoryValuationTab({ locale, formatCurrency }: { locale: string, formatCurrency: (v: number) => string }) {
    const isRTL = locale === 'ar';
    const [loading, setLoading] = useState(true);
    const [valData, setValData] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await analyticsApi.getInventoryValuation();
            setValData(res.data?.data || res.data);
        } catch (e) {

        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
    }

    if (!valData) {
        return <div className="p-10 text-center text-surface-500">{isRTL ? 'فشل في تحميل بيانات تقييم المخزون' : 'Failed to load inventory valuation data'}</div>;
    }

    const categoryChartData = valData.categories ? valData.categories.map((c: any) => ({
        name: c.category || (isRTL ? 'بدون تصنيف' : 'Uncategorized'),
        cost: Number(c.total_cost),
        retail: Number(c.total_retail)
    })) : [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 border-l-4 border-l-blue-500">
                    <p className="text-sm font-semibold text-surface-500 mb-2">{isRTL ? 'القيمة الإجمالية للمخزون (بالتكلفة)' : 'Total Value (at Cost)'}</p>
                    <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400">
                        {formatCurrency(valData.total_value_cost || 0)}
                    </h3>
                </div>
                
                <div className="glass-card p-6 border-l-4 border-l-purple-500">
                    <p className="text-sm font-semibold text-surface-500 mb-2">{isRTL ? 'القيمة الإجمالية للمخزون (سعر البيع)' : 'Total Value (at Retail)'}</p>
                    <h3 className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        {formatCurrency(valData.total_value_retail || 0)}
                    </h3>
                </div>

                <div className="glass-card p-6 border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-900/10">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-500 mb-2 flex items-center gap-2">
                        <span>✨</span> {isRTL ? 'الربح المحتمل عند بيع المخزون' : 'Potential Profit (If all sold)'}
                    </p>
                    <h3 className="text-3xl font-black text-green-600 dark:text-green-400">
                        {formatCurrency(valData.potential_profit || 0)}
                    </h3>
                    <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-2 font-medium">
                        {isRTL ? 'هامش الربح المتوقع:' : 'Expected Margin:'} {valData.total_value_cost > 0 ? ((valData.potential_profit / valData.total_value_cost) * 100).toFixed(1) : 0}%
                    </p>
                </div>
            </div>

            {/* Valuation by Category Chart */}
            <div className="glass-card p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-6">{isRTL ? 'تقييم المخزون حسب الفئة' : 'Valuation by Category'}</h3>
                <div className="h-[350px]">
                    {categoryChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryChartData} margin={{ left: isRTL ? 40 : 0, right: isRTL ? 0 : 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} orientation={isRTL ? 'right' : 'left'} />
                                <Tooltip 
                                    contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '8px' }}
                                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'cost' ? (isRTL ? 'التكلفة' : 'Cost') : (isRTL ? 'سعر البيع' : 'Retail')]}
                                />
                                <Bar dataKey="cost" fill="#3b82f6" name="cost" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="retail" fill="#a855f7" name="retail" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-surface-400">No category data</div>
                    )}
                </div>
            </div>

            {/* Dead Stock Warning */}
            {valData.dead_stock && valData.dead_stock.length > 0 && (
                <div className="glass-card p-6 rounded-2xl border border-red-200 dark:border-red-900/30">
                    <h3 className="text-lg font-bold mb-4 text-red-600 dark:text-red-400 flex items-center gap-2">
                        <span>⚠️</span> {isRTL ? 'المخزون الراكد (بدون حركة لأكثر من 90 يوم)' : 'Dead Stock (No movement > 90 days)'}
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                                <tr>
                                    <th className="text-start py-3 px-4 font-medium rounded-l-lg">{isRTL ? 'المنتج' : 'Product'}</th>
                                    <th className="text-center py-3 px-4 font-medium">{isRTL ? 'المخزون الحالي' : 'Current Stock'}</th>
                                    <th className="text-end py-3 px-4 font-medium">{isRTL ? 'القيمة المحتجزة (تكلفة)' : 'Locked Value (Cost)'}</th>
                                    <th className="text-end py-3 px-4 font-medium rounded-r-lg">{isRTL ? 'آخر حركة' : 'Last Movement'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {valData.dead_stock.map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
                                        <td className="py-3 px-4 font-medium">{item.name}</td>
                                        <td className="py-3 px-4 text-center">{item.stock_quantity}</td>
                                        <td className="py-3 px-4 text-end font-bold text-red-500">
                                            {formatCurrency(item.stock_quantity * (item.cost_price || 0))}
                                        </td>
                                        <td className="py-3 px-4 text-end text-surface-500">
                                            {item.last_movement_date || (isRTL ? 'غير معروف' : 'Unknown')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
