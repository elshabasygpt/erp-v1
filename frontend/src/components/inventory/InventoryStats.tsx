import React, { memo } from 'react';

interface InventoryStatsProps {
    inv: any;
    productsLength: number;
    activeProductsCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValueFormatted: string;
}

const InventoryStats = memo(function InventoryStats({
    inv, productsLength, activeProductsCount, lowStockCount, outOfStockCount, totalValueFormatted
}: InventoryStatsProps) {
    const stats = [
        { label: inv.totalProducts, value: productsLength.toString(), icon: '📦', gradient: 'from-blue-500/20 to-blue-600/5', accent: 'text-blue-400' },
        { label: inv.activeProducts, value: activeProductsCount.toString(), icon: '✅', gradient: 'from-green-500/20 to-green-600/5', accent: 'text-green-400' },
        { label: inv.lowStockAlerts, value: `${lowStockCount}`, icon: '⚠️', gradient: 'from-yellow-500/20 to-yellow-600/5', accent: 'text-yellow-400' },
        { label: inv.outOfStock, value: outOfStockCount.toString(), icon: '🚫', gradient: 'from-red-500/20 to-red-600/5', accent: 'text-red-400' },
        { label: inv.totalValue, value: totalValueFormatted, icon: '💰', gradient: 'from-purple-500/20 to-purple-600/5', accent: 'text-purple-400' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map((s, i) => (
                <div key={i} className="stat-card relative overflow-hidden">
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${s.gradient} opacity-40 transition-opacity duration-300 hover:opacity-70`} />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                            <p className={`text-2xl font-black ${s.accent}`}>{s.value}</p>
                        </div>
                        <span className="text-3xl opacity-90 drop-shadow-sm">{s.icon}</span>
                    </div>
                </div>
            ))}
        </div>
    );
});

export default InventoryStats;
