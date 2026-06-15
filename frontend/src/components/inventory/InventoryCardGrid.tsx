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
    setShowDelete: (p: Product) => void;
}

const InventoryCardGrid = memo(function InventoryCardGrid({
    isRTL, inv, filtered, stockStatus, getGroupName, getUnitSymbol, formatCurrency,
    setShowMovements, setShowBarcode, openEdit, setShowDelete
}: InventoryCardGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => {
                const status = stockStatus(p);
                const statusColor = status === 'out' ? 'bg-red-500' : status === 'low' ? 'bg-yellow-500' : 'bg-green-500';
                return (
                    <div key={p.id} className={`glass-card p-4 relative group transition-all duration-300 hover:scale-[1.02] ${status === 'out' ? 'opacity-70' : ''}`}>
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
                        <div className="flex items-center gap-1 pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
                            <button onClick={() => setShowMovements(p)} className="btn-icon text-xs flex-1 justify-center" style={{ color: 'var(--text-muted)' }}>📊</button>
                            <button onClick={() => setShowBarcode(p)} className="btn-icon text-xs flex-1 justify-center" style={{ color: 'var(--text-muted)' }}>🏷️</button>
                            <button onClick={() => openEdit(p)} className="btn-icon text-xs flex-1 justify-center" style={{ color: 'var(--text-muted)' }}>✏️</button>
                            <button onClick={() => setShowDelete(p)} className="btn-icon text-xs flex-1 justify-center hover:!text-red-400" style={{ color: 'var(--text-muted)' }}>🗑️</button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default InventoryCardGrid;
