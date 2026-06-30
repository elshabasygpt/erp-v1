import React, { memo } from 'react';
import type { Product } from './hooks/useInventoryData';

interface InventoryTableProps {
    isRTL: boolean;
    inv: any;
    common: any;
    filtered: Product[];
    stockStatus: (p: Product) => 'in' | 'low' | 'out';
    getGroupName: (mainId: string) => string;
    getSubGroupName: (mainId: string, subId: string) => string;
    getUnitSymbol: (unitId: string) => string;
    formatCurrency: (v: number) => string;
    setShowMovements: (p: Product) => void;
    setShowBarcode: (p: Product) => void;
    openEdit: (p: Product) => void;
    openDuplicate: (p: Product) => void;
    setShowDelete: (p: Product) => void;
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    allPageSelected: boolean;
    onToggleSelectPage: () => void;
}

const InventoryTable = memo(function InventoryTable({
    isRTL, inv, common, filtered, stockStatus, getGroupName, getSubGroupName, getUnitSymbol, formatCurrency,
    setShowMovements, setShowBarcode, openEdit, openDuplicate, setShowDelete,
    selectedIds, onToggleSelect, allPageSelected, onToggleSelectPage
}: InventoryTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="data-table text-sm">
                <thead><tr><th className="w-10 text-center"><input type="checkbox" className="w-4 h-4 cursor-pointer accent-primary-600" checked={allPageSelected} onChange={onToggleSelectPage} aria-label={isRTL ? 'تحديد الكل' : 'Select all'} /></th><th>{inv.itemCode}</th><th>{inv.itemName}</th><th>{inv.mainGroup}</th><th>{inv.unit}</th><th>{inv.costPrice}</th><th>{inv.sellPrice}</th><th>{inv.wholesalePrice}</th><th>{inv.stock}</th><th>{inv.minStock}</th><th>{common.actions}</th></tr></thead>
                <tbody>
                    {filtered.map(p => {
                        const status = stockStatus(p);
                        const isSelected = selectedIds.has(p.id);
                        return (
                            <tr key={p.id} className={`${status === 'out' ? 'opacity-60' : ''} ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                                <td className="text-center"><input type="checkbox" className="w-4 h-4 cursor-pointer accent-primary-600" checked={isSelected} onChange={() => onToggleSelect(p.id)} aria-label={isRTL ? `تحديد ${p.nameAr}` : `Select ${p.name}`} /></td>
                                <td className="font-mono text-primary-600 dark:text-primary-400 font-bold">{p.code}</td>
                                <td>
                                    <div className="font-bold text-surface-900 dark:text-surface-100">{isRTL ? p.nameAr : p.name}</div>
                                    {p.discount > 0 && <span className="inline-block mt-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold border border-red-200 dark:border-red-800/50">-{p.discount}%</span>}
                                </td>
                                <td>
                                    <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold border border-blue-100 dark:border-blue-800">{getGroupName(p.mainGroupId)}</span>
                                    <div className="text-[10px] text-surface-500 mt-1 font-medium">{getSubGroupName(p.mainGroupId, p.subGroupId)}</div>
                                </td>
                                <td><span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold border border-emerald-100 dark:border-emerald-800">{getUnitSymbol(p.unitId)}</span></td>
                                <td className="text-surface-500 font-medium">{formatCurrency(p.costPrice)}</td>
                                <td className="font-bold text-primary-600 dark:text-primary-400">{formatCurrency(p.sellPrice)}</td>
                                <td className="text-surface-500 font-medium">{formatCurrency(p.wholesalePrice)}</td>
                                <td>
                                    <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-bold border ${status === 'out' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' : status === 'low' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'}`}>
                                        {p.stock}
                                    </span>
                                </td>
                                <td className="text-surface-500 font-medium text-center">{p.minStock}</td>
                                <td className="text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <button onClick={() => setShowMovements(p)} className="btn-icon w-7 h-7 flex items-center justify-center text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50" title={inv.stockMovements}><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2.243a2 2 0 011.897 1.368l1.371 4.113a1 1 0 001.897 0l3.184-9.551a1 1 0 011.897 0l1.371 4.113A2 2 0 0018.757 15H21" /></svg></button>
                                        <button onClick={() => setShowBarcode(p)} className="btn-icon w-7 h-7 flex items-center justify-center text-teal-500 hover:text-teal-600 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/50" title={inv.printBarcode}><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg></button>
                                        <button onClick={() => openDuplicate(p)} className="btn-icon w-7 h-7 flex items-center justify-center text-fuchsia-500 hover:text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-100 dark:border-fuchsia-800/50" title={isRTL ? "نسخ وإضافة جديد" : "Duplicate"}><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                                        <button onClick={() => openEdit(p)} className="btn-icon w-7 h-7 flex items-center justify-center text-primary-500 hover:text-primary-600 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50" title={isRTL ? 'تعديل' : 'Edit'}><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                        <button onClick={() => setShowDelete(p)} className="btn-icon w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50" title={isRTL ? 'حذف' : 'Delete'}><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
});

export default InventoryTable;
