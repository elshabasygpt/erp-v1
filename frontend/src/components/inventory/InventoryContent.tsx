'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { ManageGroupsModal, ManageUnitsModal, PrintBarcodeModal, StockMovementsModal, InventoryAdjustmentModal, AssembleProductModal } from './InventoryModals';
import type { MainGroup, Unit } from './InventoryModals';

interface Product {
    id: string; code: string; name: string; nameAr: string; barcode: string;
    mainGroupId: string; subGroupId: string; unitId: string;
    costPrice: number; sellPrice: number; wholesalePrice: number; semiWholesalePrice: number;
    profitPercent: number; discount: number; stock: number; minStock: number; description: string;
    imageUrl?: string;
}

const defaultGroups: MainGroup[] = [
    { id: 'MG-1', name: 'Electronics', nameAr: 'إلكترونيات', subGroups: [{ id: 'SG-1', name: 'Phones', nameAr: 'هواتف' }, { id: 'SG-2', name: 'TVs', nameAr: 'شاشات' }, { id: 'SG-3', name: 'Accessories', nameAr: 'إكسسوارات' }] },
    { id: 'MG-2', name: 'Furniture', nameAr: 'أثاث', subGroups: [{ id: 'SG-4', name: 'Chairs', nameAr: 'كراسي' }, { id: 'SG-5', name: 'Desks', nameAr: 'مكاتب' }] },
    { id: 'MG-3', name: 'Office Supplies', nameAr: 'مستلزمات مكتبية', subGroups: [{ id: 'SG-6', name: 'Printers', nameAr: 'طابعات' }, { id: 'SG-7', name: 'Paper', nameAr: 'ورق' }] },
    { id: 'MG-4', name: 'Food & Beverages', nameAr: 'أغذية ومشروبات', subGroups: [{ id: 'SG-8', name: 'Drinks', nameAr: 'مشروبات' }, { id: 'SG-9', name: 'Snacks', nameAr: 'وجبات خفيفة' }] },
];

const defaultUnits: Unit[] = [
    { id: 'U-1', name: 'Piece', nameAr: 'قطعة', symbol: 'PCS' },
    { id: 'U-2', name: 'Box', nameAr: 'صندوق', symbol: 'BOX' },
    { id: 'U-3', name: 'Kilogram', nameAr: 'كيلوغرام', symbol: 'KG' },
    { id: 'U-4', name: 'Meter', nameAr: 'متر', symbol: 'M' },
    { id: 'U-5', name: 'Liter', nameAr: 'لتر', symbol: 'L' },
    { id: 'U-6', name: 'Dozen', nameAr: 'درزن', symbol: 'DZ' },
];

const initialProducts: Product[] = [
    { id: 'P-001', code: '1001', name: 'Samsung TV 55"', nameAr: 'شاشة سامسونج 55', barcode: '8801643547890', mainGroupId: 'MG-1', subGroupId: 'SG-2', unitId: 'U-1', costPrice: 1200, sellPrice: 1599, wholesalePrice: 1450, semiWholesalePrice: 1500, profitPercent: 33, discount: 0, stock: 45, minStock: 5, description: 'Samsung 55 inch 4K Smart TV' },
    { id: 'P-002', code: '1002', name: 'iPhone 15 Pro', nameAr: 'آيفون 15 برو', barcode: '1901234567890', mainGroupId: 'MG-1', subGroupId: 'SG-1', unitId: 'U-1', costPrice: 3500, sellPrice: 4299, wholesalePrice: 3900, semiWholesalePrice: 4050, profitPercent: 23, discount: 0, stock: 12, minStock: 5, description: '' },
    { id: 'P-003', code: '1003', name: 'HP LaserJet Printer', nameAr: 'طابعة اتش بي ليزر', barcode: '2401234567890', mainGroupId: 'MG-3', subGroupId: 'SG-6', unitId: 'U-1', costPrice: 450, sellPrice: 620, wholesalePrice: 520, semiWholesalePrice: 560, profitPercent: 38, discount: 5, stock: 3, minStock: 5, description: '' },
    { id: 'P-004', code: '1004', name: 'Office Chair Ergonomic', nameAr: 'كرسي مكتب مريح', barcode: '3001234567890', mainGroupId: 'MG-2', subGroupId: 'SG-4', unitId: 'U-1', costPrice: 300, sellPrice: 450, wholesalePrice: 380, semiWholesalePrice: 400, profitPercent: 50, discount: 0, stock: 28, minStock: 5, description: '' },
    { id: 'P-005', code: '1005', name: 'USB-C Cable 2m', nameAr: 'كابل USB-C 2م', barcode: '4501234567890', mainGroupId: 'MG-1', subGroupId: 'SG-3', unitId: 'U-1', costPrice: 15, sellPrice: 35, wholesalePrice: 22, semiWholesalePrice: 28, profitPercent: 133, discount: 10, stock: 200, minStock: 20, description: '' },
    { id: 'P-006', code: '1006', name: 'A4 Copy Paper', nameAr: 'ورق نسخ A4', barcode: '5601234567890', mainGroupId: 'MG-3', subGroupId: 'SG-7', unitId: 'U-2', costPrice: 18, sellPrice: 28, wholesalePrice: 22, semiWholesalePrice: 25, profitPercent: 56, discount: 0, stock: 150, minStock: 20, description: 'Box of 500 sheets' },
    { id: 'P-007', code: '1007', name: 'Standing Desk 140cm', nameAr: 'مكتب متحرك 140سم', barcode: '6701234567890', mainGroupId: 'MG-2', subGroupId: 'SG-5', unitId: 'U-1', costPrice: 900, sellPrice: 1350, wholesalePrice: 1100, semiWholesalePrice: 1200, profitPercent: 50, discount: 0, stock: 7, minStock: 3, description: '' },
    { id: 'P-008', code: '1008', name: 'Wireless Mouse', nameAr: 'ماوس لاسلكي', barcode: '7801234567890', mainGroupId: 'MG-1', subGroupId: 'SG-3', unitId: 'U-1', costPrice: 25, sellPrice: 55, wholesalePrice: 38, semiWholesalePrice: 45, profitPercent: 120, discount: 5, stock: 0, minStock: 10, description: '' },
];

interface Props { dict: any; locale: string; }

export default function InventoryContent({ dict, locale }: Props) {
    const isRTL = locale === 'ar';
    const inv = dict.inventory;

    const [products, setProducts] = useState<Product[]>([]);
    const [groups, setGroups] = useState<MainGroup[]>(defaultGroups);
    const [units, setUnits] = useState<Unit[]>(defaultUnits);
    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

    const [showAddEdit, setShowAddEdit] = useState(false);
    const [showGroups, setShowGroups] = useState(false);
    const [showUnits, setShowUnits] = useState(false);
    const [showBarcode, setShowBarcode] = useState<Product | null>(null);
    const [showDelete, setShowDelete] = useState<Product | null>(null);
    const [showMovements, setShowMovements] = useState<Product | null>(null);
    const [promptModal, setPromptModal] = useState<{ isOpen: boolean, type: 'main' | 'sub' | 'unit', value: string }>({ isOpen: false, type: 'main', value: '' });
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showAdjustment, setShowAdjustment] = useState(false);
    const [showAssembly, setShowAssembly] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { inventoryApi } = await import('@/lib/api');
                const res = await inventoryApi.getProducts({ limit: 100 });
                if (res.data?.data) {
                    const mapped = res.data.data.map((p: any) => ({
                        id: p.id,
                        code: p.sku || p.id.substring(0,6),
                        name: p.name,
                        nameAr: p.name_ar || p.name,
                        barcode: p.barcode || '',
                        mainGroupId: p.category_id || 'MG-1',
                        subGroupId: '',
                        unitId: p.unit_of_measure || 'U-1',
                        costPrice: parseFloat(p.cost_price || 0),
                        sellPrice: parseFloat(p.sell_price || 0),
                        wholesalePrice: parseFloat(p.sell_price || 0) * 0.9,
                        semiWholesalePrice: parseFloat(p.sell_price || 0) * 0.95,
                        profitPercent: 0,
                        discount: 0,
                        stock: p.warehouseStocks?.reduce((acc: number, ws: any) => acc + parseFloat(ws.quantity), 0) || 0,
                        minStock: p.stock_alert_level || 5,
                        description: p.description || '',
                        imageUrl: p.image_url || ''
                    }));
                    setProducts(mapped);
                }
            } catch (err) {
                console.error("Failed to load products", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const emptyForm = { code: '', name: '', nameAr: '', barcode: '', mainGroupId: '', subGroupId: '', unitId: '', costPrice: 0, sellPrice: 0, wholesalePrice: 0, semiWholesalePrice: 0, profitPercent: 0, discount: 0, minStock: 5, description: '', imageUrl: '' };
    const [form, setForm] = useState(emptyForm);

    const formatCurrency = (v: number) => new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v);
    const getGroupName = (mainId: string) => { const g = groups.find(g => g.id === mainId); return g ? (isRTL ? g.nameAr : g.name) : '-'; };
    const getSubGroupName = (mainId: string, subId: string) => { const g = groups.find(g => g.id === mainId); const s = g?.subGroups.find(s => s.id === subId); return s ? (isRTL ? s.nameAr : s.name) : '-'; };
    const getUnitSymbol = (unitId: string) => units.find(u => u.id === unitId)?.symbol || '-';
    const getUnitName = (unitId: string) => { const u = units.find(u => u.id === unitId); return u ? (isRTL ? u.nameAr : u.name) : '-'; };
    const availableSubs = form.mainGroupId ? groups.find(g => g.id === form.mainGroupId)?.subGroups || [] : [];
    const stockStatus = (p: Product) => p.stock === 0 ? 'out' : p.stock <= p.minStock ? 'low' : 'in';
    const generateBarcode = () => `${Math.floor(Math.random() * 9000000000000) + 1000000000000}`;

    const filtered = useMemo(() => products.filter(p => {
        const name = isRTL ? p.nameAr : p.name;
        const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || p.code.includes(search) || p.barcode.includes(search);
        const matchesGroup = groupFilter === 'all' || p.mainGroupId === groupFilter;
        const matchesStock = stockFilter === 'all' || (stockFilter === 'in' && p.stock > p.minStock) || (stockFilter === 'low' && p.stock > 0 && p.stock <= p.minStock) || (stockFilter === 'out' && p.stock === 0);
        return matchesSearch && matchesGroup && matchesStock;
    }), [products, search, groupFilter, stockFilter, isRTL]);

    const openAdd = () => {
        setEditingProduct(null);
        const nextCode = String(Math.max(...products.map(p => parseInt(p.code) || 0), 1000) + 1);
        setForm({ ...emptyForm, code: nextCode, barcode: generateBarcode() });
        setShowAddEdit(true);
    };
    const openEdit = (p: Product) => {
        setEditingProduct(p);
        setForm({ code: p.code, name: p.name, nameAr: p.nameAr, barcode: p.barcode, mainGroupId: p.mainGroupId, subGroupId: p.subGroupId, unitId: p.unitId, costPrice: p.costPrice, sellPrice: p.sellPrice, wholesalePrice: p.wholesalePrice, semiWholesalePrice: p.semiWholesalePrice, profitPercent: p.profitPercent, discount: p.discount, minStock: p.minStock, description: p.description, imageUrl: p.imageUrl || '' });
        setShowAddEdit(true);
    };

    const handlePromptSubmit = () => {
        const val = promptModal.value.trim();
        if (!val) return;
        if (promptModal.type === 'main') {
            const newGroup = { id: `MG-${Date.now()}`, name: val, nameAr: val, subGroups: [] };
            setGroups(prev => [...prev, newGroup]);
            setForm(f => ({ ...f, mainGroupId: newGroup.id, subGroupId: '' }));
        } else if (promptModal.type === 'sub') {
            const newSub = { id: `SG-${Date.now()}`, name: val, nameAr: val };
            setGroups(prev => prev.map(g => g.id === form.mainGroupId ? { ...g, subGroups: [...g.subGroups, newSub] } : g));
            setForm(f => ({ ...f, subGroupId: newSub.id }));
        } else if (promptModal.type === 'unit') {
            const newUnit = { id: `U-${Date.now()}`, name: val, nameAr: val, symbol: val.substring(0, 3).toUpperCase() };
            setUnits(prev => [...prev, newUnit]);
            setForm(f => ({ ...f, unitId: newUnit.id }));
        }
        setPromptModal({ isOpen: false, type: 'main', value: '' });
    };

    const saveProduct = useCallback(async () => {
        if (!form.name && !form.nameAr) return;
        
        try {
            const { inventoryApi } = await import('@/lib/api');
            const payload = {
                sku: form.code,
                barcode: form.barcode || undefined,
                name: form.name || form.nameAr,
                name_ar: form.nameAr || form.name,
                description: form.description,
                selling_price: form.sellPrice,
                purchase_price: form.costPrice,
                image_url: form.imageUrl || null,
                category_id: form.mainGroupId?.length === 36 ? form.mainGroupId : null,
                unit_of_measure: form.unitId || null,
                stock_alert_level: form.minStock,
                is_active: true,
            };

            if (editingProduct) {
                const res = await inventoryApi.updateProduct(editingProduct.id, payload);
                const updated = res.data?.data;
                if (updated) {
                    setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
                        ...p,
                        code: updated.sku || form.code,
                        name: updated.name || form.name,
                        nameAr: updated.name_ar || form.nameAr,
                        barcode: updated.barcode || form.barcode,
                        mainGroupId: updated.category_id || form.mainGroupId,
                        subGroupId: form.subGroupId,
                        unitId: updated.unit_of_measure || form.unitId,
                        costPrice: parseFloat(updated.cost_price || form.costPrice),
                        sellPrice: parseFloat(updated.sell_price || form.sellPrice),
                        wholesalePrice: parseFloat(updated.sell_price || form.sellPrice) * 0.9,
                        semiWholesalePrice: parseFloat(updated.sell_price || form.sellPrice) * 0.95,
                        minStock: updated.stock_alert_level || form.minStock,
                        description: updated.description || form.description,
                        imageUrl: updated.image_url || form.imageUrl,
                    } : p));
                }
            } else {
                const res = await inventoryApi.createProduct(payload);
                const created = res.data?.data;
                if (created) {
                    setProducts(prev => [{
                        id: created.id,
                        code: created.sku || form.code,
                        name: created.name || form.name,
                        nameAr: created.name_ar || form.nameAr,
                        barcode: created.barcode || form.barcode || '',
                        mainGroupId: created.category_id || form.mainGroupId,
                        subGroupId: form.subGroupId,
                        unitId: created.unit_of_measure || form.unitId,
                        costPrice: parseFloat(created.cost_price || form.costPrice),
                        sellPrice: parseFloat(created.sell_price || form.sellPrice),
                        wholesalePrice: parseFloat(created.sell_price || form.sellPrice) * 0.9,
                        semiWholesalePrice: parseFloat(created.sell_price || form.sellPrice) * 0.95,
                        profitPercent: 0,
                        discount: 0,
                        stock: 0,
                        minStock: created.stock_alert_level || form.minStock,
                        description: created.description || form.description,
                        imageUrl: created.image_url || form.imageUrl,
                    }, ...prev]);
                }
            }
            setShowAddEdit(false);
        } catch (err) {
            console.error("Failed to save product", err);
            alert(isRTL ? "حدث خطأ أثناء حفظ المنتج" : "Failed to save product");
        }
    }, [form, editingProduct, isRTL]);

    const deleteProduct = useCallback(async () => {
        if (showDelete) {
            try {
                const { inventoryApi } = await import('@/lib/api');
                await inventoryApi.deleteProduct(showDelete.id);
                setProducts(prev => prev.filter(p => p.id !== showDelete.id));
                setShowDelete(null);
            } catch (err) {
                console.error("Failed to delete product", err);
                alert(isRTL ? "حدث خطأ أثناء حذف المنتج" : "Failed to delete product");
            }
        }
    }, [showDelete, isRTL]);

    const updateCostAndProfit = (costPrice: number, profitPercent: number) => {
        const sellPrice = Math.round(costPrice * (1 + profitPercent / 100));
        setForm(f => ({ ...f, costPrice, profitPercent, sellPrice }));
    };

    const exportCSV = useCallback(() => {
        const headers = ['Code', 'Name', 'Barcode', 'Group', 'Unit', 'Cost', 'Sell', 'Wholesale', 'SemiWholesale', 'Stock', 'MinStock'];
        const rows = products.map(p => [p.code, p.name, p.barcode, getGroupName(p.mainGroupId), getUnitSymbol(p.unitId), p.costPrice, p.sellPrice, p.wholesalePrice, p.semiWholesalePrice, p.stock, p.minStock]);
        const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; a.click(); URL.revokeObjectURL(url);
    }, [products, groups, units, isRTL]);

    const totalValue = products.reduce((a, p) => a + p.stock * p.costPrice, 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;

    const stats = [
        { label: inv.totalProducts, value: products.length.toString(), icon: '📦', gradient: 'from-blue-500/20 to-blue-600/5', accent: 'text-blue-400' },
        { label: inv.activeProducts, value: products.filter(p => p.stock > 0).length.toString(), icon: '✅', gradient: 'from-green-500/20 to-green-600/5', accent: 'text-green-400' },
        { label: inv.lowStockAlerts, value: `${lowStockCount}`, icon: '⚠️', gradient: 'from-yellow-500/20 to-yellow-600/5', accent: 'text-yellow-400' },
        { label: inv.outOfStock, value: outOfStockCount.toString(), icon: '🚫', gradient: 'from-red-500/20 to-red-600/5', accent: 'text-red-400' },
        { label: inv.totalValue, value: formatCurrency(totalValue), icon: '💰', gradient: 'from-purple-500/20 to-purple-600/5', accent: 'text-purple-400' },
    ];

    const actionBtns = [
        { key: 'add', label: inv.addProduct, icon: '➕', action: openAdd, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' },
        { key: 'groups', label: inv.manageGroups, icon: '📁', action: () => setShowGroups(true), color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
        { key: 'units', label: inv.manageUnits, icon: '📏', action: () => setShowUnits(true), color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20' },
        { key: 'export', label: inv.exportProducts, icon: '📤', action: exportCSV, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
        { key: 'adjustment', label: isRTL ? 'تسوية وهالك' : 'Adjustment', icon: '⚖️', action: () => setShowAdjustment(true), color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/20' },
        { key: 'assembly', label: isRTL ? 'التجميع بـ (BOM)' : 'Assembly', icon: '⚙️', action: () => setShowAssembly(true), color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20' },
    ];

    const lblCls = "block text-xs font-medium mb-1.5 uppercase tracking-wider";

    // ── Low stock alert banner ──
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

            {/* Stats */}
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
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <h3 className="text-base font-semibold me-auto" style={{ color: 'var(--text-primary)' }}>📦 {inv.productList}<span className="text-xs font-normal ms-2 px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' }}>{filtered.length}</span></h3>

                    {/* View toggle */}
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

                {filtered.length === 0 ? (
                    <div className="text-center py-12"><span className="text-4xl mb-3 block">🔍</span><p style={{ color: 'var(--text-muted)' }}>{inv.noProducts}</p></div>
                ) : viewMode === 'table' ? (
                    /* ── TABLE VIEW ── */
                    <div className="overflow-x-auto">
                        <table className="data-table text-sm">
                            <thead><tr><th>{inv.itemCode}</th><th>{inv.itemName}</th><th>{inv.mainGroup}</th><th>{inv.unit}</th><th>{inv.costPrice}</th><th>{inv.sellPrice}</th><th>{inv.wholesalePrice}</th><th>{inv.stock}</th><th>{inv.minStock}</th><th>{dict.common.actions}</th></tr></thead>
                            <tbody>
                                {filtered.map(p => {
                                    const status = stockStatus(p);
                                    return (
                                        <tr key={p.id} className={status === 'out' ? 'opacity-60' : ''}>
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
                                                    <button onClick={() => openEdit(p)} className="btn-icon w-7 h-7 flex items-center justify-center text-primary-500 hover:text-primary-600 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50" title="Edit"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                    <button onClick={() => setShowDelete(p)} className="btn-icon w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50" title="Delete"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* ── CARD VIEW ── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map(p => {
                            const status = stockStatus(p);
                            const statusColor = status === 'out' ? 'bg-red-500' : status === 'low' ? 'bg-yellow-500' : 'bg-green-500';
                            return (
                                <div key={p.id} className={`glass-card p-4 relative group transition-all duration-300 hover:scale-[1.02] ${status === 'out' ? 'opacity-70' : ''}`}>
                                    {/* Status dot */}
                                    <div className={`absolute top-3 end-3 w-2.5 h-2.5 rounded-full ${statusColor}`} />

                                    {/* Product image */}
                                    <div className="w-full h-28 rounded-xl mb-3 overflow-hidden flex items-center justify-center text-4xl" style={{ background: 'var(--bg-surface-secondary)' }}>
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt={isRTL ? p.nameAr : p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            '📦'
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="mb-3">
                                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{isRTL ? p.nameAr : p.name}</p>
                                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.code}</p>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        <span className="badge badge-info text-[10px]">{getGroupName(p.mainGroupId)}</span>
                                        <span className="badge badge-success text-[10px]">{getUnitSymbol(p.unitId)}</span>
                                        {p.discount > 0 && <span className="badge badge-danger text-[10px]">-{p.discount}%</span>}
                                    </div>

                                    {/* Prices */}
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

                                    {/* Stock bar */}
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
                )}
            </div>

            {/* Add/Edit Modal */}
            {showAddEdit && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddEdit(false)}>
                    <div className="modal-content !max-w-3xl">
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                            <div className="flex items-center gap-2"><span className="text-xl">{editingProduct ? '✏️' : '➕'}</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editingProduct ? inv.editProduct : inv.addProduct}</h2></div>
                            <button onClick={() => setShowAddEdit(false)} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                            {/* Product Image Section */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {isRTL ? 'صورة المنتج' : 'Product Image'}
                                </h3>
                                <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-secondary)' }}>
                                    <div className="relative w-24 h-24 rounded-lg overflow-hidden flex items-center justify-center text-4xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }}>
                                        {form.imageUrl ? (
                                            <img src={form.imageUrl} alt="Product preview" className="w-full h-full object-cover" />
                                        ) : (
                                            '📦'
                                        )}
                                        {form.imageUrl && (
                                            <button 
                                                onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] hover:bg-red-600 transition-colors"
                                                type="button"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                            {isRTL ? 'تحميل صورة للمنتج' : 'Upload product image'}
                                        </p>
                                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                            {isRTL ? 'صيغ PNG, JPG, WEBP حتى 2 ميجابايت' : 'PNG, JPG, WEBP formats up to 2MB'}
                                        </p>
                                        <label className="inline-block mt-2">
                                            <span className="btn-secondary text-xs px-3 py-1.5 cursor-pointer">
                                                {isRTL ? 'اختر ملف' : 'Choose File'}
                                            </span>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        try {
                                                            const { inventoryApi } = await import('@/lib/api');
                                                            const res = await inventoryApi.uploadProductImage(file);
                                                            if (res.data?.data?.image_url) {
                                                                setForm(f => ({ ...f, imageUrl: res.data.data.image_url }));
                                                            }
                                                        } catch (err) {
                                                            console.error("Failed to upload image", err);
                                                            alert(isRTL ? "فشل تحميل الصورة" : "Failed to upload image");
                                                        }
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Basic */}
                            <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><span className="w-1.5 h-1.5 rounded-full bg-primary-500" />{inv.itemDetails}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.itemCode}</label><input className="input-field py-2 text-sm font-mono" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.itemName} (EN)</label><input className="input-field py-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.itemName} (AR)</label><input className="input-field py-2 text-sm" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} /></div>
                                    <div>
                                        <label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.mainGroup}</label>
                                        <div className="flex gap-2">
                                            <select className="select-field py-2 text-sm flex-1" value={form.mainGroupId} onChange={e => setForm({ ...form, mainGroupId: e.target.value, subGroupId: '' })}><option value="">{inv.selectMainGroup}</option>{groups.map(g => <option key={g.id} value={g.id}>{isRTL ? g.nameAr : g.name}</option>)}</select>
                                            <button type="button" onClick={() => setPromptModal({ isOpen: true, type: 'main', value: '' })} className="btn-secondary px-3 py-2 text-sm font-bold flex-shrink-0" title={isRTL ? "إضافة مجموعة رئيسية" : "Add Main Group"}>+</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.subGroup}</label>
                                        <div className="flex gap-2">
                                            <select className="select-field py-2 text-sm flex-1" value={form.subGroupId} onChange={e => setForm({ ...form, subGroupId: e.target.value })} disabled={!form.mainGroupId}><option value="">{isRTL ? 'اختر الفرعية' : 'Select Sub Group'}</option>{availableSubs.map(s => <option key={s.id} value={s.id}>{isRTL ? s.nameAr : s.name}</option>)}</select>
                                            <button type="button" onClick={() => form.mainGroupId ? setPromptModal({ isOpen: true, type: 'sub', value: '' }) : alert(isRTL ? 'الرجاء اختيار المجموعة الرئيسية أولاً' : 'Please select a Main Group first')} disabled={!form.mainGroupId} className="btn-secondary px-3 py-2 text-sm font-bold flex-shrink-0 disabled:opacity-50" title={isRTL ? "إضافة مجموعة فرعية" : "Add Sub Group"}>+</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.unit}</label>
                                        <div className="flex gap-2">
                                            <select className="select-field py-2 text-sm flex-1" value={form.unitId} onChange={e => setForm({ ...form, unitId: e.target.value })}><option value="">{isRTL ? 'اختر الوحدة' : 'Select Unit'}</option>{units.map(u => <option key={u.id} value={u.id}>{isRTL ? u.nameAr : u.name} ({u.symbol})</option>)}</select>
                                            <button type="button" onClick={() => setPromptModal({ isOpen: true, type: 'unit', value: '' })} className="btn-secondary px-3 py-2 text-sm font-bold flex-shrink-0" title={isRTL ? "إضافة وحدة" : "Add Unit"}>+</button>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.barcode}</label>
                                        <div className="flex gap-2">
                                            <input className="input-field py-2 text-sm font-mono flex-1" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
                                            <button onClick={() => setForm({ ...form, barcode: generateBarcode() })} className="btn-secondary text-xs px-3 whitespace-nowrap" type="button">🔄 {inv.generateBarcode}</button>
                                        </div>
                                    </div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.minStock}</label><input type="number" className="input-field py-2 text-sm" min="0" value={form.minStock} onChange={e => setForm({ ...form, minStock: +e.target.value || 0 })} /></div>
                                </div>
                            </div>
                            {/* Pricing */}
                            <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{inv.pricing}</h3>
                                <div className="glass-card p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.costPrice}</label><input type="number" className="input-field py-2 text-sm" min="0" value={form.costPrice || ''} onChange={e => updateCostAndProfit(+e.target.value || 0, form.profitPercent)} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.profitPercent}</label><input type="number" className="input-field py-2 text-sm" min="0" value={form.profitPercent || ''} onChange={e => updateCostAndProfit(form.costPrice, +e.target.value || 0)} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.sellPrice}</label><input type="number" className="input-field py-2 text-sm" min="0" value={form.sellPrice || ''} onChange={e => setForm({ ...form, sellPrice: +e.target.value || 0 })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.wholesalePrice}</label><input type="number" className="input-field py-2 text-sm" min="0" value={form.wholesalePrice || ''} onChange={e => setForm({ ...form, wholesalePrice: +e.target.value || 0 })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.semiWholesalePrice}</label><input type="number" className="input-field py-2 text-sm" min="0" value={form.semiWholesalePrice || ''} onChange={e => setForm({ ...form, semiWholesalePrice: +e.target.value || 0 })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{inv.discount}</label><input type="number" className="input-field py-2 text-sm" min="0" max="100" value={form.discount || ''} onChange={e => setForm({ ...form, discount: +e.target.value || 0 })} /></div>
                                </div>
                            </div>
                            {/* Description */}
                            <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />{inv.description}</h3>
                                <textarea className="input-field py-2 text-sm w-full h-20 resize-none" placeholder={isRTL ? 'وصف الصنف...' : 'Product description...'} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                            <button onClick={() => setShowAddEdit(false)} className="btn-secondary">{dict.common.cancel}</button>
                            <button onClick={saveProduct} className="btn-primary">{dict.common.save}</button>
                        </div>

                        {/* Inline Prompt Modal for Groups */}
                        {promptModal.isOpen && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-xl w-80 border border-gray-200 dark:border-gray-700 animate-fade-in">
                                    <h4 className="font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                                        {promptModal.type === 'main' ? (isRTL ? 'إضافة مجموعة رئيسية' : 'Add Main Group') : 
                                         promptModal.type === 'sub' ? (isRTL ? 'إضافة مجموعة فرعية' : 'Add Sub Group') : 
                                         (isRTL ? 'إضافة وحدة' : 'Add Unit')}
                                    </h4>
                                    <input 
                                        type="text" 
                                        className="input-field w-full py-2 mb-4" 
                                        autoFocus
                                        placeholder={isRTL ? 'الاسم...' : 'Name...'}
                                        value={promptModal.value}
                                        onChange={e => setPromptModal(p => ({ ...p, value: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && handlePromptSubmit()}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setPromptModal({ isOpen: false, type: 'main', value: '' })} className="btn-secondary text-xs px-3 py-1.5">{dict.common.cancel}</button>
                                        <button onClick={handlePromptSubmit} className="btn-primary text-xs px-3 py-1.5">{dict.common.save}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {showDelete && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDelete(null)}>
                    <div className="modal-content !max-w-md">
                        <div className="p-6 text-center">
                            <span className="text-5xl mb-4 block">⚠️</span>
                            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{inv.deleteProduct}</h3>
                            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{isRTL ? showDelete.nameAr : showDelete.name}</p>
                            <div className="flex justify-center gap-3">
                                <button onClick={() => setShowDelete(null)} className="btn-secondary">{dict.common.cancel}</button>
                                <button onClick={deleteProduct} className="btn-primary !bg-red-600 !shadow-red-600/30">{inv.deleteProduct}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Other Modals */}
            {showGroups && <ManageGroupsModal dict={dict} locale={locale} groups={groups} setGroups={setGroups} onClose={() => setShowGroups(false)} />}
            {showUnits && <ManageUnitsModal dict={dict} locale={locale} units={units} setUnits={setUnits} onClose={() => setShowUnits(false)} />}
            {showBarcode && <PrintBarcodeModal dict={dict} locale={locale} product={showBarcode} onClose={() => setShowBarcode(null)} />}
            {showMovements && <StockMovementsModal dict={dict} locale={locale} product={showMovements} onClose={() => setShowMovements(null)} />}
            {showAdjustment && <InventoryAdjustmentModal dict={dict} locale={locale} products={products} warehouses={[{id: 'W1', name: isRTL ? 'المستودع الرئيسي' : 'Main Warehouse'}]} onClose={() => setShowAdjustment(false)} onSave={async (d) => { console.log('Adj:', d); }} />}
            {showAssembly && <AssembleProductModal dict={dict} locale={locale} products={products} warehouses={[{id: 'W1', name: isRTL ? 'المستودع الرئيسي' : 'Main Warehouse'}]} onClose={() => setShowAssembly(false)} onSave={async (d) => { console.log('Asm:', d); }} />}
        </div>
    );
}
