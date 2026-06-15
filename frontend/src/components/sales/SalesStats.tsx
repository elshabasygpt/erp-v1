import React, { memo } from 'react';

interface SalesStatsProps {
    stats: any;
    filteredDataLength: number;
    dict: any;
    formatCurrency: (v: number) => string;
}

const SalesStats = memo(function SalesStats({ stats, filteredDataLength, dict, formatCurrency }: SalesStatsProps) {
    const s = dict.sales;
    return (
        <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4`}>
            {[
                { label: s.todaySales, value: stats.todaySales, icon: '💰', color: 'emerald' },
                { label: s.avgInvoiceValue, value: stats.avgInvoice, icon: '📈', color: 'blue' },
                { label: s.totalProfit, value: stats.totalProfit, icon: '💎', color: 'purple' },
                { label: s.totalCommission, value: stats.totalCommission, icon: '🎟️', color: 'amber' },
                { label: dict.dashboard.totalCustomers, value: filteredDataLength, icon: '📋', color: 'rose' },
            ].map((stat, i) => (
                <div key={i} className="glass-card p-5 group hover:border-primary-500/30 transition-all duration-300">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{i < 4 ? formatCurrency(stat.value) : stat.value}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-${stat.color}-500/10 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                            {stat.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

export default SalesStats;