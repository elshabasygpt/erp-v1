'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api';
import { ManageGroupsModal, ManageUnitsModal, PrintBarcodeModal, StockMovementsModal, InventoryAdjustmentModal, AssembleProductModal } from './InventoryModals';
import type { Product } from './hooks/useInventoryData';
import { useInventoryData } from './hooks/useInventoryData';
import { useProductForm } from './hooks/useProductForm';
import InventoryStats from './InventoryStats';
import InventoryToolbar from './InventoryToolbar';
import InventoryTable from './InventoryTable';
import InventoryCardGrid from './InventoryCardGrid';
import InventoryFormModal from './InventoryFormModal';
import toast from 'react-hot-toast';

interface Props { dict: any; locale: string; }

export default function InventoryContent({ dict, locale }: Props) {
    const isRTL = locale === 'ar';
    const inv = dict.inventory;

    const {
        products, setProducts, groups, setGroups, units, setUnits, isLoading
    } = useInventoryData();

    const queryClient = useQueryClient();

    const { data: warehousesResponse } = useQuery({
        queryKey: ['warehouses'],
        queryFn: () => inventoryApi.getWarehouses()
    });
    const warehouses = warehousesResponse?.data?.data || [];

    const handleSaveAdjustment = async (data: any) => {
        try {
            await inventoryApi.createAdjustment(data);
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setShowAdjustment(false);
        } catch (error) {

            toast.error("Failed to save adjustment.");
        }
    };

    const handleSaveAssembly = async (data: any) => {
        try {
            await inventoryApi.assemble(data);
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setShowAssembly(false);
        } catch (error) {

            toast.error("Failed to assemble product.");
        }
    };

    const {
        form, setForm, editingProduct, showAddEdit, setShowAddEdit,
        promptModal, setPromptModal, openAdd, openEdit, openDuplicate, saveProduct, handlePromptSubmit, updateCostAndProfit, generateBarcode
    } = useProductForm(products, setProducts, groups, setGroups, units, setUnits, isRTL);

    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

    const [showGroups, setShowGroups] = useState(false);
    const [showUnits, setShowUnits] = useState(false);
    const [showBarcode, setShowBarcode] = useState<Product | null>(null);
    const [showDelete, setShowDelete] = useState<Product | null>(null);
    const [showMovements, setShowMovements] = useState<Product | null>(null);
    const [showAdjustment, setShowAdjustment] = useState(false);
    const [showAssembly, setShowAssembly] = useState(false);

    const formatCurrency = useCallback((v: number) => new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v), [isRTL]);
    const getGroupName = useCallback((mainId: string) => { const g = groups.find(g => g.id === mainId); return g ? (isRTL ? g.nameAr : g.name) : '-'; }, [groups, isRTL]);
    const getSubGroupName = useCallback((mainId: string, subId: string) => { const g = groups.find(g => g.id === mainId); const s = g?.subGroups.find(sub => sub.id === subId); return s ? (isRTL ? s.nameAr : s.name) : '-'; }, [groups, isRTL]);
    const getUnitSymbol = useCallback((unitId: string) => units.find(u => u.id === unitId)?.symbol || '-', [units]);
    const stockStatus = useCallback((p: Product) => p.stock === 0 ? 'out' : p.stock <= p.minStock ? 'low' : 'in', []);

    const filtered = useMemo(() => products.filter(p => {
        const name = isRTL ? p.nameAr : p.name;
        const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || p.code.includes(search) || p.barcode.includes(search);
        const matchesGroup = groupFilter === 'all' || p.mainGroupId === groupFilter;
        const matchesStock = stockFilter === 'all' || (stockFilter === 'in' && p.stock > p.minStock) || (stockFilter === 'low' && p.stock > 0 && p.stock <= p.minStock) || (stockFilter === 'out' && p.stock === 0);
        return matchesSearch && matchesGroup && matchesStock;
    }), [products, search, groupFilter, stockFilter, isRTL]);

    const deleteProduct = useCallback(async () => {
        if (showDelete) {
            try {
                const { inventoryApi } = await import('@/lib/api');
                await inventoryApi.deleteProduct(showDelete.id);
                // setProducts is deprecated; invalidate the query to refetch from backend
                queryClient.invalidateQueries({ queryKey: ['products'] });
                setShowDelete(null);
            } catch (err) {

                toast.error(isRTL ? "حدث خطأ أثناء حذف المنتج" : "Failed to delete product");
            }
        }
    }, [showDelete, isRTL, setProducts]);

    const exportCSV = useCallback(() => {
        const headers = ['Code', 'Name', 'Barcode', 'Group', 'Unit', 'Cost', 'Sell', 'Wholesale', 'SemiWholesale', 'Stock', 'MinStock'];
        const rows = products.map(p => [p.code, p.name, p.barcode, getGroupName(p.mainGroupId), getUnitSymbol(p.unitId), p.costPrice, p.sellPrice, p.wholesalePrice, p.semiWholesalePrice, p.stock, p.minStock]);
        const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; a.click(); URL.revokeObjectURL(url);
    }, [products, getGroupName, getUnitSymbol, isRTL]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                <div className="text-surface-500 dark:text-surface-400 font-medium">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
            </div>
        );
    }

    const totalValue = products.reduce((a, p) => a + p.stock * p.costPrice, 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;
    const activeProductsCount = products.filter(p => p.stock > 0).length;

    const actionBtns = [
        { key: 'add', label: inv.addProduct, icon: '➕', action: openAdd, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' },
        { key: 'groups', label: inv.manageGroups, icon: '📁', action: () => setShowGroups(true), color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
        { key: 'units', label: inv.manageUnits, icon: '📏', action: () => setShowUnits(true), color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20' },
        { key: 'export', label: inv.exportProducts, icon: '📤', action: exportCSV, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
        { key: 'adjustment', label: isRTL ? 'تسوية وهالك' : 'Adjustment', icon: '⚖️', action: () => setShowAdjustment(true), color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/20' },
        { key: 'assembly', label: isRTL ? 'التجميع بـ (BOM)' : 'Assembly', icon: '⚙️', action: () => setShowAssembly(true), color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20' },
    ];

    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.minStock);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{inv.title}</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{inv.subtitle}</p>
                </div>
                <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    {inv.addProduct}
                </button>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
                {actionBtns.map(a => (
                    <button key={a.key} onClick={a.action} className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${a.bg} ${a.border} ${a.color} hover:brightness-95 dark:hover:brightness-110`}>
                        <span className="text-lg">{a.icon}</span>
                        <span className="text-sm font-bold">{a.label}</span>
                    </button>
                ))}
            </div>

            <InventoryStats 
                inv={inv} 
                productsLength={products.length} 
                activeProductsCount={activeProductsCount} 
                lowStockCount={lowStockCount} 
                outOfStockCount={outOfStockCount} 
                totalValueFormatted={formatCurrency(totalValue)} 
            />

            {/* Low Stock Alert Banner */}
            {lowStockProducts.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 animate-fade-in shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-400">
                        <span className="text-xl">⚠️</span>
                        <h3 className="text-sm font-bold">{inv.lowStockItems} ({lowStockProducts.length})</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {lowStockProducts.map(p => (
                            <div key={p.id} className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs bg-white dark:bg-surface-800 border border-amber-100 dark:border-amber-900 shadow-sm">
                                <span className="font-semibold text-surface-700 dark:text-surface-200">{isRTL ? p.nameAr : p.name}</span>
                                <span className="font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">{p.stock} / {p.minStock}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Out of Stock Alert */}
            {outOfStockCount > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 animate-fade-in shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-red-700 dark:text-red-400">
                        <span className="text-xl">🚫</span>
                        <h3 className="text-sm font-bold">{inv.outOfStock} ({outOfStockCount})</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {products.filter(p => p.stock === 0).map(p => (
                            <div key={p.id} className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs bg-white dark:bg-surface-800 border border-red-100 dark:border-red-900 shadow-sm">
                                <span className="font-semibold text-surface-700 dark:text-surface-200">{isRTL ? p.nameAr : p.name}</span>
                                <span className="font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded">0</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Product List Section */}
            <div className="glass-card p-6">
                <InventoryToolbar 
                    isRTL={isRTL} inv={inv} filteredCount={filtered.length}
                    viewMode={viewMode} setViewMode={setViewMode}
                    search={search} setSearch={setSearch}
                    groupFilter={groupFilter} setGroupFilter={setGroupFilter}
                    stockFilter={stockFilter} setStockFilter={setStockFilter}
                    groups={groups}
                />

                {filtered.length === 0 ? (
                    <div className="text-center py-12"><span className="text-4xl mb-3 block">🔍</span><p style={{ color: 'var(--text-muted)' }}>{inv.noProducts}</p></div>
                ) : viewMode === 'table' ? (
                    <InventoryTable 
                        isRTL={isRTL} inv={inv} common={dict.common} filtered={filtered}
                        stockStatus={stockStatus} getGroupName={getGroupName} getSubGroupName={getSubGroupName} getUnitSymbol={getUnitSymbol} formatCurrency={formatCurrency}
                        setShowMovements={setShowMovements} setShowBarcode={setShowBarcode} openEdit={openEdit} openDuplicate={openDuplicate} setShowDelete={setShowDelete}
                    />
                ) : (
                    <InventoryCardGrid 
                        isRTL={isRTL} inv={inv} filtered={filtered}
                        stockStatus={stockStatus} getGroupName={getGroupName} getUnitSymbol={getUnitSymbol} formatCurrency={formatCurrency}
                        setShowMovements={setShowMovements} setShowBarcode={setShowBarcode} openEdit={openEdit} openDuplicate={openDuplicate} setShowDelete={setShowDelete}
                    />
                )}
            </div>

            <InventoryFormModal 
                isRTL={isRTL} inv={inv} common={dict.common}
                showAddEdit={showAddEdit} setShowAddEdit={setShowAddEdit} editingProduct={editingProduct}
                form={form} setForm={setForm} saveProduct={saveProduct} generateBarcode={generateBarcode}
                groups={groups} units={units} setPromptModal={setPromptModal} updateCostAndProfit={updateCostAndProfit}
                products={products}
            />

            {/* Modals from external files */}
            {showGroups && <ManageGroupsModal dict={dict} locale={locale} groups={groups} setGroups={setGroups} onClose={() => setShowGroups(false)} />}
            {showUnits && <ManageUnitsModal dict={dict} locale={locale} units={units} setUnits={setUnits} onClose={() => setShowUnits(false)} />}
            {showBarcode && <PrintBarcodeModal dict={dict} locale={locale} product={showBarcode} onClose={() => setShowBarcode(null)} />}
            {showMovements && <StockMovementsModal dict={dict} locale={locale} product={showMovements} onClose={() => setShowMovements(null)} />}
            {showAdjustment && <InventoryAdjustmentModal dict={dict} locale={locale} products={products} warehouses={warehouses} onClose={() => setShowAdjustment(false)} onSave={handleSaveAdjustment} />}
            {showAssembly && <AssembleProductModal dict={dict} locale={locale} products={products} warehouses={warehouses} onClose={() => setShowAssembly(false)} onSave={handleSaveAssembly} />}

            {showDelete && (
                <div className="modal-overlay">
                    <div className="modal-content !max-w-sm">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
                            <h3 className="text-xl font-bold mb-2 text-surface-900 dark:text-white">{inv.deleteConfirm}</h3>
                            <p className="text-surface-500 dark:text-surface-400 text-sm mb-6">{isRTL ? `هل أنت متأكد من حذف المنتج "${isRTL ? showDelete.nameAr : showDelete.name}"؟ لا يمكن التراجع عن هذا الإجراء.` : `Are you sure you want to delete "${isRTL ? showDelete.nameAr : showDelete.name}"? This action cannot be undone.`}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDelete(null)} className="flex-1 btn-secondary py-2.5">{dict.common.cancel}</button>
                                <button onClick={deleteProduct} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl py-2.5 transition-colors shadow-lg shadow-red-500/30">{inv.deleteProduct}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Generic Prompt Modal for Groups/Units Add */}
            {promptModal.isOpen && (
                <div className="modal-overlay z-[200]">
                    <div className="modal-content !max-w-xs">
                        <div className="p-5">
                            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                                {promptModal.type === 'main' ? (isRTL ? 'مجموعة جديدة' : 'New Main Group') :
                                    promptModal.type === 'sub' ? (isRTL ? 'مجموعة فرعية جديدة' : 'New Sub Group') :
                                        (isRTL ? 'وحدة قياس جديدة' : 'New Unit')}
                            </h3>
                            <input
                                autoFocus
                                className="input-field w-full mb-5"
                                placeholder={isRTL ? 'ادخل الاسم هنا...' : 'Enter name here...'}
                                value={promptModal.value}
                                onChange={e => setPromptModal({ ...promptModal, value: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handlePromptSubmit()}
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setPromptModal({ isOpen: false, type: 'main', value: '' })} className="flex-1 btn-secondary">{dict.common.cancel}</button>
                                <button onClick={handlePromptSubmit} disabled={!promptModal.value.trim()} className="flex-1 btn-primary">{dict.common.save}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
