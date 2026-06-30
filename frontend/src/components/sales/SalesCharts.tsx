import React, { memo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { CHART_COLORS, CHART_PRIMARY } from '@/lib/chart-colors';

interface SalesChartsProps {
    isRTL: boolean;
    showChart: boolean;
    activeTab: string;
    stats: any;
    employeeDistribution: any[];
    formatCurrency: (v: number) => string;
}

const COLORS = CHART_COLORS;

const SalesCharts = memo(function SalesCharts({
    isRTL, showChart, activeTab, stats, employeeDistribution, formatCurrency
}: SalesChartsProps) {
    if (!showChart || activeTab !== 'invoices') return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-6 overflow-hidden relative">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span>📊</span> {isRTL ? 'اتجاه المبيعات الأسبوعي' : 'Weekly Sales Trend'}
                    </h3>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.trend}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <YAxis hide />
                            <Tooltip 
                                contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '12px' }}
                                itemStyle={{ color: CHART_PRIMARY }}
                            />
                            <Area type="monotone" dataKey="sales" stroke={CHART_PRIMARY} strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-card p-6 flex flex-col items-center justify-center relative">
                <div className="w-full flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest">
                        {isRTL ? 'توزيع المبيعات (الموظفين)' : 'Sales Distribution (Team)'}
                    </h3>
                </div>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={employeeDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="total"
                            >
                                {employeeDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(val: number) => formatCurrency(val)}
                                contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="w-full mt-4 space-y-2">
                    {employeeDistribution.slice(0, 3).map((emp, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                <span className="text-surface-400 uppercase font-black tracking-tighter">{emp.name}</span>
                            </div>
                            <span className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(emp.total)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default SalesCharts;