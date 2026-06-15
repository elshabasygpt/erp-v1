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
                    className={`btn-icon-sm ml-3 ${showFilters ? 'bg-primary-500/20 text-primary-500' : 'text-surface-400 hover:text-white'}`}
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