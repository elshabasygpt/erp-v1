import React, { memo } from 'react';
import type { Product } from './hooks/useInventoryData';

interface InventoryCardGridProps {
    isRTL: boolean;
    inv: any;
    filtered: Product[];
    stockStatus: (p: Product) => 'in' | 'low' | 'out';
    getGroupName: (mainId: string) => string;
    getUnitSymbol: (unitId: string) => string;
    formatCurrency: (v: number) => string;
    setShowMovements: (p: Product) => void;
    setShowBarcode: (p: Product) => void;
    openEdit: (p: Product) => void;
    openDuplicate: (p: Product) => void;
    setShowDelete: (p: Product) => void;
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
}

const InventoryCardGrid = memo(function InventoryCardGrid({
    isRTL, inv, filtered, stockStatus, getGroupName, getUnitSymbol, formatCurrency,
    setShowMovements, setShowBarcode, openEdit, openDuplicate, setShowDelete,
    selectedIds, onToggleSelect
}: InventoryCardGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => {
                const status = stockStatus(p);
                const statusColor = status === 'out' ? 'bg-red-500' : status === 'low' ? 'bg-yellow-500' : 'bg-green-500';
                const isSelected = selectedIds.has(p.id);
                return (
                    <div key={p.id} className={`glass-card p-4 relative group transition-all duration-300 hover:scale-[1.02] ${status === 'out' ? 'opacity-70' : ''} ${isSelected ? 'ring-2 ring-primary-500' : ''}`}>
                        <input type="checkbox" className="absolute top-3 start-3 z-10 w-4 h-4 cursor-pointer accent-primary-600" checked={isSelected} onChange={() => onToggleSelect(p.id)} aria-label={isRTL ? `تحديد ${p.nameAr}` : `Select ${p.name}`} />
                        <div className={`absolute top-3 end-3 w-2.5 h-2.5 rounded-full ${statusColor}`} />
                        <div className="w-full h-28 rounded-xl mb-3 overflow-hidden flex items-center justify-center text-4xl" style={{ background: 'var(--bg-surface-secondary)' }}>
                            {p.imageUrl ? (
                                <img src={p.imageUrl} alt={isRTL ? p.nameAr : p.name} className="w-full h-full object-cover" />
                            ) : (
                                '📦'
                            )}
                        </div>
                        <div className="mb-3">
                            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{isRTL ? p.nameAr : p.name}</p>
                            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.code}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className="badge badge-info text-[10px]">{getGroupName(p.mainGroupId)}</span>
                            <span className="badge badge-success text-[10px]">{getUnitSymbol(p.unitId)}</span>
                            {p.discount > 0 && <span className="badge badge-danger text-[10px]">-{p.discount}%</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-surface-secondary)' }}>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{inv.costPrice}</p>
                                <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(p.costPrice)}</p>
                            </div>
                            <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-surface-secondary)' }}>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{inv.sellPrice}</p>
                                <p className="text-xs font-bold text-primary-400">{formatCurrency(p.sellPrice)}</p>
                            </div>
                        </div>
                        <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                                <span style={{ color: 'var(--text-muted)' }}>{inv.stock}</span>
                                <span className={`font-bold ${status === 'out' ? 'text-red-500' : status === 'low' ? 'text-yellow-500' : 'text-green-500'}`}>{p.stock} / {p.minStock}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-secondary)' }}>
                                <div className={`h-full rounded-full transition-all ${statusColor}`} style={{ width: `${Math.min(p.minStock > 0 ? (p.stock / (p.minStock * 3)) * 100 : 100, 100)}%` }} />
                            </div>
                        </div>
                        {/* Actions */}
                        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-surface-100 dark:border-surface-800">
                            <button onClick={() => setShowMovements(p)} className="flex items-center justify-center py-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors" title={inv.stockMovements}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2.243a2 2 0 011.897 1.368l1.371 4.113a1 1 0 001.897 0l3.184-9.551a1 1 0 011.897 0l1.371 4.113A2 2 0 0018.757 15H21" /></svg></button>
                            <button onClick={() => setShowBarcode(p)} className="flex items-center justify-center py-2 rounded-lg text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30 transition-colors" title={inv.printBarcode}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg></button>
                            <button onClick={() => openDuplicate(p)} className="flex items-center justify-center py-2 rounded-lg text-fuchsia-600 hover:bg-fuchsia-50 dark:text-fuchsia-400 dark:hover:bg-fuchsia-900/30 transition-colors" title={isRTL ? "نسخ وإضافة جديد" : "Duplicate"}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                            <button onClick={() => openEdit(p)} className="flex items-center justify-center py-2 rounded-lg text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30 transition-colors" title={isRTL ? 'تعديل' : 'Edit'}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default InventoryCardGrid;
