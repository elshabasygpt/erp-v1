'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Props {
    locale: string;
    insightsData: any;
    formatCurrency: (v: number) => string;
}

export default function CustomerInsightsTab({ locale, insightsData, formatCurrency }: Props) {
    const isRTL = locale === 'ar';

    if (!insightsData) {
        return (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    const { metrics, preferred_products, purchase_history, customer } = insightsData;

    // Colors for pie chart
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const pieData = useMemo(() => {
        if (!preferred_products || preferred_products.length === 0) return [];
        return preferred_products.map((p: any) => ({
            name: p.name,
            value: Number(p.total_quantity)
        }));
    }, [preferred_products]);

    const barData = useMemo(() => {
        if (!purchase_history || purchase_history.length === 0) return [];
        // Reverse to show oldest to newest (assuming it comes newest first from backend)
        return [...purchase_history].reverse().map((h: any) => ({
            name: h.invoice_number,
            value: Number(h.total)
        }));
    }, [purchase_history]);

    return (
        <div className="p-5 space-y-6 animate-fade-in">
            {/* Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-4 rounded-xl border-l-4 border-l-primary-500">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'إجمالي الإنفاق' : 'Total Spend'}
                    </p>
                    <p className="text-2xl font-black text-primary-500">
                        {formatCurrency(metrics?.total_spend || 0)}
                    </p>
                </div>
                <div className="glass-card p-4 rounded-xl border-l-4 border-l-green-500">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'إجمالي الفواتير' : 'Total Invoices'}
                    </p>
                    <p className="text-2xl font-black text-green-500">
                        {metrics?.total_invoices || 0}
                    </p>
                </div>
                <div className="glass-card p-4 rounded-xl border-l-4 border-l-purple-500">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'متوسط السلة' : 'Average Basket'}
                    </p>
                    <p className="text-2xl font-black text-purple-500">
                        {formatCurrency(metrics?.average_basket || 0)}
                    </p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Purchase History Chart */}
                <div className="glass-card p-5 rounded-xl">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {isRTL ? 'تاريخ المشتريات (آخر 10 فواتير)' : 'Purchase History (Last 10)'}
                    </h3>
                    {barData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={barData} margin={{ left: isRTL ? 16 : 0, right: isRTL ? 0 : 16 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                <YAxis orientation={isRTL ? "right" : "left"} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(1)}k`} />
                                <Tooltip 
                                    contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '12px' }} 
                                    formatter={(value: number) => [formatCurrency(value), isRTL ? 'الإجمالي' : 'Total']}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'لا توجد بيانات' : 'No data available'}
                        </div>
                    )}
                </div>

                {/* Preferred Products */}
                <div className="glass-card p-5 rounded-xl">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        {isRTL ? 'أكثر المنتجات طلباً' : 'Top Preferred Products'}
                    </h3>
                    {pieData.length > 0 ? (
                        <div className="flex items-center h-[250px]">
                            <ResponsiveContainer width="50%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="var(--bg-surface-default)"
                                        strokeWidth={2}
                                    >
                                        {pieData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '12px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="w-1/2 pl-4 flex flex-col gap-2 overflow-y-auto max-h-[200px]">
                                {pieData.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                            <span className="truncate" style={{ color: 'var(--text-primary)' }} title={entry.name}>{entry.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-500">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'لا توجد بيانات' : 'No data available'}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Customer Value Segment */}
            <div className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-indigo-500 bg-indigo-50 dark:bg-indigo-900/10">
                <div>
                    <h4 className="font-bold text-indigo-700 dark:text-indigo-400">
                        {isRTL ? 'شريحة العميل (Segment)' : 'Customer Segment'}
                    </h4>
                    <p className="text-sm mt-1 text-indigo-600/80 dark:text-indigo-400/80">
                        {isRTL ? 'تم تصنيف هذا العميل بناءً على تاريخ تعاملاته' : 'This customer is categorized based on purchase history.'}
                    </p>
                </div>
                <div className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <span className="font-black text-indigo-600 dark:text-indigo-300">
                        {customer?.segment || (isRTL ? 'غير مصنف' : 'Unsegmented')}
                    </span>
                </div>
            </div>
        </div>
    );
}
