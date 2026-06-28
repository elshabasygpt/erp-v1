import React, { memo } from 'react';
import { useRegionalSettings } from '@/providers/RegionalSettingsProvider';

interface PurchasesStatsProps {
    isRTL: boolean;
    totalPurchasesValue: number;
    pendingInvoices: number;
    totalReturnsValue: number;
    suppliersCount: number;
}

const PurchasesStats = memo(function PurchasesStats({ isRTL, totalPurchasesValue, pendingInvoices, totalReturnsValue, suppliersCount }: PurchasesStatsProps) {
    const { formatAmount: formatCurrency } = useRegionalSettings();
    
    const stats = [
        { label: isRTL ? 'إجمالي المشتريات' : 'Total Purchases', value: formatCurrency(totalPurchasesValue), icon: '🛒', gradient: 'from-blue-500/20 to-blue-600/5', accent: 'text-blue-500' },
        { label: isRTL ? 'بانتظار الاستلام' : 'Pending Invoices', value: pendingInvoices.toString(), icon: '⏳', gradient: 'from-amber-500/20 to-amber-600/5', accent: 'text-amber-500' },
        { label: isRTL ? 'إجمالي المرتجعات' : 'Total Returns', value: formatCurrency(totalReturnsValue), icon: '↩️', gradient: 'from-rose-500/20 to-rose-600/5', accent: 'text-rose-500' },
        { label: isRTL ? 'عدد الموردين' : 'Total Suppliers', value: suppliersCount.toString(), icon: '🏢', gradient: 'from-emerald-500/20 to-emerald-600/5', accent: 'text-emerald-500' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
                <div key={i} className="stat-card relative overflow-hidden bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 shadow-sm transition-all hover:shadow-md">
                    <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-40 transition-opacity duration-300 hover:opacity-70`} />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold mb-1 uppercase tracking-wider text-surface-500">{s.label}</p>
                            <p className={`text-2xl font-black ${s.accent}`}>{s.value}</p>
                        </div>
                        <span className="text-3xl opacity-90 drop-shadow-sm">{s.icon}</span>
                    </div>
                </div>
            ))}
        </div>
    );
});

export default PurchasesStats;