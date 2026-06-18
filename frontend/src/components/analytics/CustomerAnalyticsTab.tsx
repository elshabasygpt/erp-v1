'use client';

import React, { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function CustomerAnalyticsTab({ locale, formatCurrency }: { locale: string, formatCurrency: (v: number) => string }) {
    const isRTL = locale === 'ar';
    const [loading, setLoading] = useState(true);
    
    const [clvData, setClvData] = useState<any>(null);
    const [funnelData, setFunnelData] = useState<any>(null);
    const [categoriesData, setCategoriesData] = useState<any>(null);
    const [discountData, setDiscountData] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [clvRes, funnelRes, catRes, discRes] = await Promise.all([
                analyticsApi.getCustomerLifetimeValue(),
                analyticsApi.getConversionFunnel(),
                analyticsApi.getTopCategories(),
                analyticsApi.getDiscountAnalysis()
            ]);
            setClvData(clvRes.data?.data || clvRes.data);
            setFunnelData(funnelRes.data?.data || funnelRes.data);
            setCategoriesData(catRes.data?.data || catRes.data);
            setDiscountData(discRes.data?.data || discRes.data);
        } catch (e) {

        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
    }

    // Prepare funnel data
    const funnelChartData = funnelData ? [
        { name: isRTL ? 'إجمالي العملاء' : 'Total Customers', value: funnelData.total_customers, fill: '#8b5cf6' },
        { name: isRTL ? 'عملاء قاموا بالشراء' : 'Purchased', value: funnelData.customers_with_purchases, fill: '#3b82f6' },
        { name: isRTL ? 'عملاء متكررين' : 'Repeat Customers', value: funnelData.repeat_customers, fill: '#10b981' },
    ] : [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Top KPI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CLV Card */}
                <div className="glass-card p-6 rounded-2xl border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-900/10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-400">
                                {isRTL ? 'القيمة الدائمة للعميل (CLV)' : 'Customer Lifetime Value'}
                            </h3>
                            <p className="text-xs text-surface-500 mt-1">
                                {isRTL ? 'متوسط قيمة العميل طوال فترة تفاعله مع متجرك.' : 'Average value of a customer over their entire relationship with you.'}
                            </p>
                        </div>
                        <span className="text-4xl">💎</span>
                    </div>
                    <div className="text-4xl font-black text-indigo-600 dark:text-indigo-300">
                        {formatCurrency(clvData?.average_clv || 0)}
                    </div>
                    {clvData?.segments && (
                        <div className="mt-6 grid grid-cols-3 gap-2">
                            {Object.entries(clvData.segments).map(([segment, count]: [string, any]) => (
                                <div key={segment} className="bg-white/60 dark:bg-black/20 p-2 rounded-lg text-center border border-indigo-100 dark:border-indigo-800/30">
                                    <p className="text-[10px] text-surface-500 uppercase">{segment}</p>
                                    <p className="font-bold text-indigo-600">{count} {isRTL ? 'عميل' : ''}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Discount Analysis Card */}
                <div className="glass-card p-6 rounded-2xl border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400">
                                {isRTL ? 'تحليل الخصومات' : 'Discount Analysis'}
                            </h3>
                            <p className="text-xs text-surface-500 mt-1">
                                {isRTL ? 'تأثير الخصومات على حجم المبيعات الإجمالي.' : 'Impact of discounts on total sales volume.'}
                            </p>
                        </div>
                        <span className="text-4xl">🏷️</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-4xl font-black text-amber-600 dark:text-amber-300">
                            {formatCurrency(discountData?.total_discounts_given || 0)}
                        </div>
                        <span className="text-sm text-surface-500">{isRTL ? 'ممنوحة' : 'given'}</span>
                    </div>
                    <div className="mt-6 flex justify-between items-center bg-white/60 dark:bg-black/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800/30">
                        <span className="text-sm font-medium">{isRTL ? 'نسبة الخصم من المبيعات:' : 'Discount to Sales Ratio:'}</span>
                        <span className="font-bold text-amber-600 text-lg">{discountData?.discount_to_sales_pct?.toFixed(2) || 0}%</span>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Funnel Chart */}
                <div className="glass-card p-5 rounded-2xl">
                    <h3 className="text-sm font-bold mb-4">{isRTL ? 'مسار تحويل العملاء (Funnel)' : 'Customer Conversion Funnel'}</h3>
                    <div className="h-[250px]">
                        {funnelChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelChartData} layout="vertical" margin={{ left: isRTL ? 10 : 80, right: isRTL ? 80 : 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-default)" />
                                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 500 }} width={80} orientation={isRTL ? 'right' : 'left'} />
                                    <Tooltip cursor={{fill: 'var(--bg-surface-secondary)'}} contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '8px' }} />
                                    <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]}>
                                        {funnelChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-surface-400 text-sm">No data</div>
                        )}
                    </div>
                    {funnelData?.conversion_rate_pct !== undefined && (
                        <p className="text-center text-sm mt-2 text-surface-500">
                            {isRTL ? 'معدل التحويل العام:' : 'Overall Conversion Rate:'} <span className="font-bold text-primary-600">{funnelData.conversion_rate_pct.toFixed(1)}%</span>
                        </p>
                    )}
                </div>

                {/* Top Categories */}
                <div className="glass-card p-5 rounded-2xl">
                    <h3 className="text-sm font-bold mb-4">{isRTL ? 'أفضل الفئات مبيعاً' : 'Top Selling Categories'}</h3>
                    <div className="h-[250px]">
                        {categoriesData && categoriesData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoriesData} margin={{ left: isRTL ? 20 : 0, right: isRTL ? 0 : 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
                                    <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} orientation={isRTL ? 'right' : 'left'} />
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '8px' }}
                                        formatter={(val: number) => [formatCurrency(val), isRTL ? 'الإيرادات' : 'Revenue']}
                                    />
                                    <Bar dataKey="total_revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-surface-400 text-sm">No data</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
