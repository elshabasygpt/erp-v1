'use client';

import React, { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function SalesAnalyticsTab({ locale, formatCurrency }: { locale: string, formatCurrency: (v: number) => string }) {
    const isRTL = locale === 'ar';
    const [period, setPeriod] = useState('monthly');
    const [loading, setLoading] = useState(true);
    
    const [salesPerf, setSalesPerf] = useState<any>(null);
    const [profitability, setProfitability] = useState<any>(null);
    const [returns, setReturns] = useState<any>(null);
    const [channels, setChannels] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [period]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [salesRes, profRes, retRes, chanRes] = await Promise.all([
                analyticsApi.getSalesPerformance({ period }),
                analyticsApi.getProfitability({ period }),
                analyticsApi.getReturnsAnalysis({ period }),
                analyticsApi.getSalesByChannel({ period })
            ]);
            setSalesPerf(salesRes.data?.data || salesRes.data);
            setProfitability(profRes.data?.data || profRes.data);
            setReturns(retRes.data?.data || retRes.data);
            setChannels(chanRes.data?.data || chanRes.data);
        } catch (e) {

        } finally {
            setLoading(false);
        }
    };

    if (loading && !salesPerf) {
        return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
    }

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    // Format data for Recharts
    const chartData = salesPerf ? Object.entries(salesPerf.revenue_over_time).map(([key, value]) => ({
        date: key,
        revenue: Number(value)
    })) : [];

    const channelData = channels ? Object.entries(channels).map(([key, value]) => ({
        name: key === 'in_store' ? (isRTL ? 'داخل الفرع' : 'In Store') : key === 'online' ? (isRTL ? 'أونلاين' : 'Online') : key,
        value: Number(value)
    })) : [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white dark:bg-surface-800 p-4 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-700">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    📈 {isRTL ? 'أداء المبيعات والربحية' : 'Sales & Profitability'}
                </h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الفترة:' : 'Period:'}</span>
                    <select 
                        value={period} 
                        onChange={e => setPeriod(e.target.value)}
                        className="select-field py-1.5 text-sm w-32"
                    >
                        <option value="daily">{isRTL ? 'يومي' : 'Daily'}</option>
                        <option value="weekly">{isRTL ? 'أسبوعي' : 'Weekly'}</option>
                        <option value="monthly">{isRTL ? 'شهري' : 'Monthly'}</option>
                    </select>
                </div>
            </div>

            {loading && <div className="h-1 w-full bg-primary-100"><div className="h-full bg-primary-500 animate-pulse"></div></div>}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-5 border-l-4 border-l-blue-500">
                    <p className="text-xs font-semibold text-surface-500 uppercase">{isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
                    <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {formatCurrency(salesPerf?.total_revenue || 0)}
                    </h3>
                    {salesPerf?.growth_rate !== undefined && (
                        <p className={`text-xs mt-2 ${salesPerf.growth_rate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {salesPerf.growth_rate >= 0 ? '↗' : '↘'} {Math.abs(salesPerf.growth_rate).toFixed(2)}% {isRTL ? 'نمو' : 'Growth'}
                        </p>
                    )}
                </div>
                
                <div className="glass-card p-5 border-l-4 border-l-emerald-500">
                    <p className="text-xs font-semibold text-surface-500 uppercase">{isRTL ? 'إجمالي الأرباح' : 'Gross Profit'}</p>
                    <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        {formatCurrency(profitability?.gross_profit || 0)}
                    </h3>
                    <p className="text-xs mt-2 text-surface-500">
                        {isRTL ? 'هامش الربح الإجمالي:' : 'Gross Margin:'} <span className="font-bold">{profitability?.gross_margin_pct?.toFixed(1) || 0}%</span>
                    </p>
                </div>

                <div className="glass-card p-5 border-l-4 border-l-purple-500">
                    <p className="text-xs font-semibold text-surface-500 uppercase">{isRTL ? 'صافي الربح' : 'Net Profit'}</p>
                    <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                        {formatCurrency(profitability?.net_profit || 0)}
                    </h3>
                    <p className="text-xs mt-2 text-surface-500">
                        {isRTL ? 'هامش صافي الربح:' : 'Net Margin:'} <span className="font-bold">{profitability?.net_margin_pct?.toFixed(1) || 0}%</span>
                    </p>
                </div>

                <div className="glass-card p-5 border-l-4 border-l-red-500">
                    <p className="text-xs font-semibold text-surface-500 uppercase">{isRTL ? 'قيمة المرتجعات' : 'Returns Value'}</p>
                    <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                        {formatCurrency(returns?.total_returned_value || 0)}
                    </h3>
                    <p className="text-xs mt-2 text-surface-500">
                        {isRTL ? 'معدل الإرجاع:' : 'Return Rate:'} <span className="font-bold">{returns?.return_rate_pct?.toFixed(2) || 0}%</span>
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend Line Chart */}
                <div className="lg:col-span-2 glass-card p-5 rounded-2xl">
                    <h3 className="text-sm font-bold mb-4">{isRTL ? 'اتجاه الإيرادات' : 'Revenue Trend'}</h3>
                    <div className="h-[300px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ left: isRTL ? 20 : 0, right: isRTL ? 0 : 20, top: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} orientation={isRTL ? 'right' : 'left'} />
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '8px' }}
                                        formatter={(val: number) => [formatCurrency(val), isRTL ? 'الإيرادات' : 'Revenue']}
                                    />
                                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-surface-400 text-sm">{isRTL ? 'لا توجد بيانات' : 'No data available'}</div>
                        )}
                    </div>
                </div>

                {/* Sales by Channel Pie Chart */}
                <div className="glass-card p-5 rounded-2xl">
                    <h3 className="text-sm font-bold mb-4">{isRTL ? 'المبيعات حسب القناة' : 'Sales by Channel'}</h3>
                    <div className="h-[300px]">
                        {channelData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={channelData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="var(--bg-surface-default)"
                                    >
                                        {channelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-surface-400 text-sm">{isRTL ? 'لا توجد بيانات' : 'No data available'}</div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Extra Breakdowns */}
            {returns && returns.top_returned_products && returns.top_returned_products.length > 0 && (
                <div className="glass-card p-5 rounded-2xl">
                    <h3 className="text-sm font-bold mb-4 text-red-500">⚠️ {isRTL ? 'أكثر المنتجات إرجاعاً' : 'Top Returned Products'}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-surface-200 dark:border-surface-700 text-surface-500">
                                    <th className="text-start py-2 font-medium">{isRTL ? 'المنتج' : 'Product'}</th>
                                    <th className="text-center py-2 font-medium">{isRTL ? 'كمية المرتجعات' : 'Return Qty'}</th>
                                    <th className="text-end py-2 font-medium">{isRTL ? 'نسبة الإرجاع' : 'Return Rate'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returns.top_returned_products.map((p: any, idx: number) => (
                                    <tr key={idx} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
                                        <td className="py-3">{p.name}</td>
                                        <td className="py-3 text-center font-bold text-red-500">{p.returned_qty}</td>
                                        <td className="py-3 text-end">{p.return_rate_pct?.toFixed(1) || 0}%</td>
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
