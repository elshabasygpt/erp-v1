import React, { memo } from 'react';
import type { MainGroup, Unit } from './InventoryModals';

interface InventoryToolbarProps {
    isRTL: boolean;
    inv: any;
    filteredCount: number;
    viewMode: 'table' | 'card';
    setViewMode: (m: 'table' | 'card') => void;
    search: string;
    setSearch: (s: string) => void;
    groupFilter: string;
    setGroupFilter: (g: string) => void;
    stockFilter: string;
    setStockFilter: (s: string) => void;
    groups: MainGroup[];
}

const InventoryToolbar = memo(function InventoryToolbar({
    isRTL, inv, filteredCount, viewMode, setViewMode, search, setSearch, groupFilter, setGroupFilter, stockFilter, setStockFilter, groups
}: InventoryToolbarProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 mb-5">
            <h3 className="text-base font-semibold me-auto" style={{ color: 'var(--text-primary)' }}>📦 {inv.productList}<span className="text-xs font-normal ms-2 px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' }}>{filteredCount}</span></h3>

            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-primary-600 text-white' : ''}`} style={viewMode !== 'table' ? { color: 'var(--text-muted)', background: 'var(--bg-input)' } : {}}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" /></svg>
                </button>
                <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'card' ? 'bg-primary-600 text-white' : ''}`} style={viewMode !== 'card' ? { color: 'var(--text-muted)', background: 'var(--bg-input)' } : {}}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                </button>
            </div>

            <div className="relative">
                <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input className="input-field ps-10 py-2 text-sm w-64" placeholder={inv.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select-field py-2 text-sm w-auto" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
                <option value="all">{inv.allGroups}</option>
                {groups.map(g => <option key={g.id} value={g.id}>{isRTL ? g.nameAr : g.name}</option>)}
            </select>
            <select className="select-field py-2 text-sm w-auto" value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
                <option value="all">{inv.allStatus}</option>
                <option value="in">{inv.inStock}</option>
                <option value="low">{inv.lowStock}</option>
                <option value="out">{inv.outOfStock}</option>
            </select>
        </div>
    );
});

export default InventoryToolbar;
