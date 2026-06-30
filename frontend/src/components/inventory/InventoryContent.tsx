'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api';
import { ManageGroupsModal, ManageUnitsModal, PrintBarcodeModal, StockMovementsModal, InventoryAdjustmentModal, AssembleProductModal } from './InventoryModals';
import ProductImportModal from './ProductImportModal';
import ManageBrandsModal from './ManageBrandsModal';
import type { Product } from './hooks/useInventoryData';
import { useInventoryData } from './hooks/useInventoryData';
import { useProductForm } from './hooks/useProductForm';
import InventoryStats from './InventoryStats';
import InventoryToolbar from './InventoryToolbar';
import InventoryTable from './InventoryTable';
import InventoryCardGrid from './InventoryCardGrid';
import InventoryFormModal from './InventoryFormModal';
import DataState from '@/components/ui/DataState';
import Pagination from '@/components/ui/Pagination';
import Dropdown from '@/components/ui/Dropdown';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

const PAGE_SIZE = 24;

interface Props { dict: any; locale: string; }

export default function InventoryContent({ dict, locale }: Props) {
    const isRTL = locale === 'ar';
    const inv = dict.inventory;

    const {
        products, setProducts, groups, setGroups, units, setUnits, isLoading, isError, refetch
    } = useInventoryData();

    const queryClient = useQueryClient();
    const router = useRouter();

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
    const [showImport, setShowImport] = useState(false);
    const [showBrands, setShowBrands] = useState(false);

    // ── Bulk selection (by product id) ──
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    }, []);
    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    const { format: formatCurrencyFn } = useCurrencyFormatter();
    const formatCurrency = useCallback((v: number) => formatCurrencyFn(v), [formatCurrencyFn]);
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

    // ── Client-side pagination (safePage clamps when filters shrink the list) ──
    const [page, setPage] = useState(1);
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const paged = useMemo(() => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [filtered, safePage]);

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

    // Export the rows the user is actually looking at: the current selection if
    // any, otherwise the filtered/searched view \u2014 never the whole catalogue
    // silently (that violated "what you see is what you get").
    const exportCSV = useCallback((source?: Product[]) => {
        const list = source ?? (selectedIds.size > 0 ? filtered.filter(p => selectedIds.has(p.id)) : filtered);
        const headers = ['Code', 'Name', 'Barcode', 'Group', 'Unit', 'Cost', 'Sell', 'Wholesale', 'SemiWholesale', 'Stock', 'MinStock'];
        const rows = list.map(p => [p.code, p.name, p.barcode, getGroupName(p.mainGroupId), getUnitSymbol(p.unitId), p.costPrice, p.sellPrice, p.wholesalePrice, p.semiWholesalePrice, p.stock, p.minStock]);
        const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; a.click(); URL.revokeObjectURL(url);
    }, [filtered, selectedIds, getGroupName, getUnitSymbol]);

    // \u2500\u2500 Bulk delete: loop the per-id endpoint, then invalidate once \u2500\u2500
    const bulkDelete = useCallback(async () => {
        setBulkDeleting(true);
        const ids = Array.from(selectedIds);
        try {
            const { inventoryApi } = await import('@/lib/api');
            const results = await Promise.allSettled(ids.map(id => inventoryApi.deleteProduct(id)));
            const failed = results.filter(r => r.status === 'rejected').length;
            queryClient.invalidateQueries({ queryKey: ['products'] });
            if (failed > 0) toast.error(isRTL ? `\u062A\u0639\u0630\u0651\u0631 \u062D\u0630\u0641 ${failed} \u0645\u0646 ${ids.length}` : `Failed to delete ${failed} of ${ids.length}`);
            else toast.success(isRTL ? `\u062A\u0645 \u062D\u0630\u0641 ${ids.length} \u0635\u0646\u0641` : `Deleted ${ids.length} products`);
            clearSelection();
        } catch {
            toast.error(isRTL ? '\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062D\u0630\u0641' : 'Bulk delete failed');
        } finally {
            setBulkDeleting(false);
            setShowBulkDelete(false);
        }
    }, [selectedIds, isRTL, queryClient, clearSelection]);

    const totalValue = products.reduce((a, p) => a + p.stock * p.costPrice, 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;
    const activeProductsCount = products.filter(p => p.stock > 0).length;

    // Secondary toolbar actions, grouped under three calm dropdowns so the
    // primary CTA (Add, in the header) stands alone. Replaces the old flat row
    // of 9 equally-weighted rainbow buttons (no hierarchy + duplicated Add).
    const manageItems = [
        { key: 'groups', label: inv.manageGroups, icon: '📁', onSelect: () => setShowGroups(true) },
        { key: 'units', label: inv.manageUnits, icon: '📏', onSelect: () => setShowUnits(true) },
        { key: 'brands', label: inv.manageBrands, icon: '🏷️', onSelect: () => setShowBrands(true) },
    ];
    const dataItems = [
        { key: 'import', label: inv.importProducts, icon: '📥', onSelect: () => setShowImport(true) },
        { key: 'export', label: inv.exportProducts + (selectedIds.size ? ` (${selectedIds.size})` : ''), icon: '📤', onSelect: () => exportCSV() },
    ];
    const toolItems = [
        { key: 'barcode', label: inv.printBarcode, icon: '🏷', onSelect: () => router.push(`/${locale}/dashboard/inventory/labels`) },
        { key: 'adjustment', label: isRTL ? 'تسوية وهالك' : 'Adjustment', icon: '⚖️', onSelect: () => setShowAdjustment(true) },
        { key: 'assembly', label: isRTL ? 'التجميع بـ (BOM)' : 'Assembly', icon: '⚙️', onSelect: () => setShowAssembly(true) },
    ];

    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.minStock);

    // ── Select-all applies to the rows currently visible on the page ──
    const pageIds = paged.map(p => p.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    const toggleSelectPage = () => setSelectedIds(prev => {
        const next = new Set(prev);
        if (allPageSelected) pageIds.forEach(id => next.delete(id));
        else pageIds.forEach(id => next.add(id));
        return next;
    });

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

            {/* Secondary actions — grouped dropdowns (primary CTA is the header button) */}
            <div className="flex flex-wrap items-center gap-3">
                {[
                    { key: 'manage', icon: '🗂️', label: isRTL ? 'إدارة' : 'Manage', items: manageItems },
                    { key: 'data', icon: '🔄', label: isRTL ? 'بيانات' : 'Data', items: dataItems },
                    { key: 'tools', icon: '🛠️', label: isRTL ? 'أدوات' : 'Tools', items: toolItems },
                ].map(group => (
                    <Dropdown
                        key={group.key}
                        isRTL={isRTL}
                        items={group.items}
                        trigger={
                            <button
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            >
                                <span className="text-base" aria-hidden="true">{group.icon}</span>
                                <span>{group.label}</span>
                                <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        }
                    />
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
                    <button type="button" onClick={() => setStockFilter('low')} className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-400 hover:underline" title={isRTL ? 'عرض الأصناف المنخفضة فقط' : 'Filter to low-stock items'}>
                        <span className="text-xl" aria-hidden="true">⚠️</span>
                        <h3 className="text-sm font-bold">{inv.lowStockItems} ({lowStockProducts.length})</h3>
                    </button>
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
                    <button type="button" onClick={() => setStockFilter('out')} className="flex items-center gap-2 mb-3 text-red-700 dark:text-red-400 hover:underline" title={isRTL ? 'عرض الأصناف النافدة فقط' : 'Filter to out-of-stock items'}>
                        <span className="text-xl" aria-hidden="true">🚫</span>
                        <h3 className="text-sm font-bold">{inv.outOfStock} ({outOfStockCount})</h3>
                    </button>
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

            {/* Bulk action bar — appears only when rows are selected */}
            {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl p-3 px-4 animate-fade-in shadow-sm bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                    <span className="text-sm font-bold text-primary-700 dark:text-primary-300">
                        {isRTL ? `تم تحديد ${selectedIds.size}` : `${selectedIds.size} selected`}
                    </span>
                    <div className="flex items-center gap-2 ms-auto">
                        <button onClick={() => exportCSV()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 hover:brightness-95 dark:hover:brightness-110 transition">
                            <span aria-hidden="true">📤</span>{isRTL ? 'تصدير المحدد' : 'Export selected'}
                        </button>
                        <button onClick={() => setShowBulkDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 hover:brightness-95 dark:hover:brightness-110 transition">
                            <span aria-hidden="true">🗑️</span>{isRTL ? 'حذف المحدد' : 'Delete selected'}
                        </button>
                        <button onClick={clearSelection} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:underline" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'إلغاء التحديد' : 'Clear'}
                        </button>
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

                <DataState
                    isLoading={isLoading}
                    isError={isError}
                    onRetry={refetch}
                    data={products}
                    isRTL={isRTL}
                    skeleton="table"
                    skeletonCount={8}
                    empty={{ icon: '📦', title: isRTL ? 'لا توجد منتجات' : 'No products', description: isRTL ? 'أضف أول منتج للبدء' : 'Add your first product to get started' }}
                >
                    {() => filtered.length === 0 ? (
                        <div className="text-center py-12"><span className="text-4xl mb-3 block">🔍</span><p style={{ color: 'var(--text-muted)' }}>{inv.noProducts}</p></div>
                    ) : (
                        <>
                            {viewMode === 'table' ? (
                                <InventoryTable
                                    isRTL={isRTL} inv={inv} common={dict.common} filtered={paged}
                                    stockStatus={stockStatus} getGroupName={getGroupName} getSubGroupName={getSubGroupName} getUnitSymbol={getUnitSymbol} formatCurrency={formatCurrency}
                                    setShowMovements={setShowMovements} setShowBarcode={setShowBarcode} openEdit={openEdit} openDuplicate={openDuplicate} setShowDelete={setShowDelete}
                                    selectedIds={selectedIds} onToggleSelect={toggleSelect} allPageSelected={allPageSelected} onToggleSelectPage={toggleSelectPage}
                                />
                            ) : (
                                <InventoryCardGrid
                                    isRTL={isRTL} inv={inv} filtered={paged}
                                    stockStatus={stockStatus} getGroupName={getGroupName} getUnitSymbol={getUnitSymbol} formatCurrency={formatCurrency}
                                    setShowMovements={setShowMovements} setShowBarcode={setShowBarcode} openEdit={openEdit} openDuplicate={openDuplicate} setShowDelete={setShowDelete}
                                    selectedIds={selectedIds} onToggleSelect={toggleSelect}
                                />
                            )}
                            {filtered.length > PAGE_SIZE && (
                                <div className="mt-4">
                                    <Pagination
                                        page={safePage}
                                        pageCount={pageCount}
                                        onPageChange={setPage}
                                        totalItems={filtered.length}
                                        pageSize={PAGE_SIZE}
                                        isRTL={isRTL}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </DataState>
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
            {showImport && <ProductImportModal dict={dict} locale={locale} existingProducts={products} onClose={() => setShowImport(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['products'] }); setShowImport(false); }} />}
            {showBrands && <ManageBrandsModal isOpen={showBrands} onClose={() => setShowBrands(false)} />}

            <ConfirmDialog
                isOpen={showBulkDelete}
                isRTL={isRTL}
                variant="danger"
                title={isRTL ? 'حذف الأصناف المحددة' : 'Delete selected products'}
                message={isRTL ? `سيتم حذف ${selectedIds.size} صنف نهائياً. لا يمكن التراجع عن هذا الإجراء.` : `${selectedIds.size} products will be permanently deleted. This cannot be undone.`}
                confirmLabel={bulkDeleting ? (isRTL ? 'جارٍ الحذف...' : 'Deleting...') : (isRTL ? 'حذف' : 'Delete')}
                onConfirm={bulkDelete}
                onCancel={() => setShowBulkDelete(false)}
            />

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
