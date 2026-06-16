<?php
$dir = __DIR__ . '/src/components/sales';

$SalesHeader = <<<EOT
import React, { memo } from 'react';

interface SalesHeaderProps {
    isRTL: boolean;
    dict: any;
    showExportMenu: boolean;
    setShowExportMenu: (v: boolean) => void;
    exportMenuRef: React.RefObject<HTMLDivElement>;
    handleExportPDF: () => void;
    handleExportDetailedPDF: () => void;
    handleExportCSV: () => void;
    setShowModal: (v: boolean) => void;
}

const SalesHeader = memo(function SalesHeader({
    isRTL, dict, showExportMenu, setShowExportMenu, exportMenuRef,
    handleExportPDF, handleExportDetailedPDF, handleExportCSV, setShowModal
}: SalesHeaderProps) {
    const s = dict.sales;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {isRTL ? 'إدارة المبيعات والإنتاجية' : 'Sales & Productivity Hub'}
                </h1>
                <p className="text-surface-400 mt-1 flex items-center gap-2">
                    {isRTL ? 'متابعة أداء الموظفين والأرباح المحققة' : 'Track employee performance and real-time profits'}
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span className="text-xs font-medium text-indigo-500 uppercase tracking-widest">Managerial Mode</span>
                </p>
            </div>
            <div className="flex items-center gap-3 relative" ref={exportMenuRef}>
                <div className="relative">
                    <button 
                        onClick={() => setShowExportMenu(!showExportMenu)} 
                        className="btn-secondary px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-colors"
                    >
                        📥 {isRTL ? 'تصدير التقارير' : 'Export Reports'}
                        <svg className={`w-4 h-4 transition-transform \${showExportMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                    {showExportMenu && (
                        <div className="absolute top-full end-0 mt-2 w-64 bg-surface-900 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-scale-in origin-top-right">
                            <button onClick={handleExportPDF} className="w-full px-4 py-3 text-start text-sm hover:bg-primary-500/10 flex items-center gap-2 transition-colors border-b border-white/5">
                                <span className="text-red-400 text-lg">📄</span>
                                {isRTL ? 'تصدير PDF (ملخص)' : 'Export PDF (Summary)'}
                            </button>
                            <button onClick={handleExportDetailedPDF} className="w-full px-4 py-3 text-start text-sm hover:bg-primary-500/10 flex items-center gap-2 transition-colors border-b border-white/5">
                                <span className="text-primary-400 text-lg">📈</span>
                                {isRTL ? 'التقرير الإداري (الأرباح)' : 'Managerial Report (Profits)'}
                            </button>
                            <button onClick={handleExportCSV} className="w-full px-4 py-3 text-start text-sm hover:bg-primary-500/10 flex items-center gap-2 transition-colors">
                                <span className="text-green-400 text-lg">📊</span>
                                {isRTL ? 'تصدير Excel/CSV' : 'Export to CSV'}
                            </button>
                        </div>
                    )}
                </div>

                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 px-6 shadow-lg shadow-primary-500/20">
                    <span className="text-xl">+</span> {s.createInvoice}
                </button>
            </div>
        </div>
    );
});

export default SalesHeader;
EOT;
file_put_contents("$dir/SalesHeader.tsx", $SalesHeader);

$SalesStats = <<<EOT
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
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-\${stat.color}-500/10 text-\${stat.color}-500 group-hover:scale-110 transition-transform`}>
                            {stat.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

export default SalesStats;
EOT;
file_put_contents("$dir/SalesStats.tsx", $SalesStats);

$SalesFilters = <<<EOT
import React, { memo } from 'react';

interface SalesFiltersProps {
    isRTL: boolean;
    dict: any;
    showFilters: boolean;
    setShowFilters: (v: boolean) => void;
    search: string;
    setSearch: (v: string) => void;
    employeeFilter: string;
    setEmployeeFilter: (v: string) => void;
    employees: any[];
    dateFrom: string;
    setDateFrom: (v: string) => void;
    dateTo: string;
    setDateTo: (v: string) => void;
    statusFilter: string;
    setStatusFilter: (v: string) => void;
}

const SalesFilters = memo(function SalesFilters({
    isRTL, dict, showFilters, setShowFilters, search, setSearch,
    employeeFilter, setEmployeeFilter, employees, dateFrom, setDateFrom,
    dateTo, setDateTo, statusFilter, setStatusFilter
}: SalesFiltersProps) {
    const s = dict.sales;
    const c = dict.common;

    return (
        <div className="glass-card p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <div className="relative flex-1 max-w-sm">
                    <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        className="input-field ps-10"
                        placeholder={isRTL ? 'بحث برقم المستند، العميل، الهاتف...' : 'Search doc, customer, phone...'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`btn-icon-sm ml-3 \${showFilters ? 'bg-primary-500/20 text-primary-500' : 'text-surface-400 hover:text-white'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                </button>
            </div>

            {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5 animate-slide-down">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-surface-500 lowercase">{isRTL ? 'الموظف (الكاشير)' : 'Employee (Cashier)'}</label>
                        <select className="select-field py-2 text-xs" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
                            <option value="all">{isRTL ? 'جميع الموظفين' : 'All Employees'}</option>
                            {employees.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-surface-500">{s.dateFrom}</label>
                        <input type="date" className="input-field py-2 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-surface-500">{s.dateTo}</label>
                        <input type="date" className="input-field py-2 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-surface-500">{c.status}</label>
                        <select className="select-field py-2 text-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="all">{s.allStatuses}</option>
                            <option value="confirmed">{s.confirmed}</option>
                            <option value="draft">{s.draft}</option>
                            <option value="cancelled">{s.cancelled}</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
});

export default SalesFilters;
EOT;
file_put_contents("$dir/SalesFilters.tsx", $SalesFilters);

?>
