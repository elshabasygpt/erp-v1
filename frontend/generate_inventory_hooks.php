<?php
$dir = __DIR__ . '/src/components/inventory';
@mkdir("$dir/hooks", 0777, true);

$useInventoryData = <<<EOT
import { useState, useEffect, useCallback } from 'react';
import type { MainGroup, Unit } from '../InventoryModals';

export interface Product {
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

export function useInventoryData() {
    const [products, setProducts] = useState<Product[]>([]);
    const [groups, setGroups] = useState<MainGroup[]>(defaultGroups);
    const [units, setUnits] = useState<Unit[]>(defaultUnits);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProducts = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return {
        products, setProducts, groups, setGroups, units, setUnits, isLoading
    };
}
EOT;
file_put_contents("$dir/hooks/useInventoryData.ts", $useInventoryData);

$useProductForm = <<<EOT
import { useState, useCallback } from 'react';
import type { Product } from './useInventoryData';

export function useProductForm(products: Product[], setProducts: any, groups: any[], setGroups: any, units: any[], setUnits: any, isRTL: boolean) {
    const emptyForm = { code: '', name: '', nameAr: '', barcode: '', mainGroupId: '', subGroupId: '', unitId: '', costPrice: 0, sellPrice: 0, wholesalePrice: 0, semiWholesalePrice: 0, profitPercent: 0, discount: 0, minStock: 5, description: '', imageUrl: '' };
    const [form, setForm] = useState(emptyForm);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [showAddEdit, setShowAddEdit] = useState(false);
    const [promptModal, setPromptModal] = useState<{ isOpen: boolean, type: 'main' | 'sub' | 'unit', value: string }>({ isOpen: false, type: 'main', value: '' });

    const generateBarcode = () => `\${Math.floor(Math.random() * 9000000000000) + 1000000000000}`;

    const openAdd = useCallback(() => {
        setEditingProduct(null);
        const nextCode = String(Math.max(...products.map(p => parseInt(p.code) || 0), 1000) + 1);
        setForm({ ...emptyForm, code: nextCode, barcode: generateBarcode() });
        setShowAddEdit(true);
    }, [products]);

    const openEdit = useCallback((p: Product) => {
        setEditingProduct(p);
        setForm({ code: p.code, name: p.name, nameAr: p.nameAr, barcode: p.barcode, mainGroupId: p.mainGroupId, subGroupId: p.subGroupId, unitId: p.unitId, costPrice: p.costPrice, sellPrice: p.sellPrice, wholesalePrice: p.wholesalePrice, semiWholesalePrice: p.semiWholesalePrice, profitPercent: p.profitPercent, discount: p.discount, minStock: p.minStock, description: p.description, imageUrl: p.imageUrl || '' });
        setShowAddEdit(true);
    }, []);

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
                    setProducts((prev:any) => prev.map((p:any) => p.id === editingProduct.id ? {
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
                    setProducts((prev:any) => [{
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
    }, [form, editingProduct, isRTL, setProducts]);

    const handlePromptSubmit = useCallback(() => {
        const val = promptModal.value.trim();
        if (!val) return;
        if (promptModal.type === 'main') {
            const newGroup = { id: `MG-\${Date.now()}`, name: val, nameAr: val, subGroups: [] };
            setGroups((prev:any) => [...prev, newGroup]);
            setForm(f => ({ ...f, mainGroupId: newGroup.id, subGroupId: '' }));
        } else if (promptModal.type === 'sub') {
            const newSub = { id: `SG-\${Date.now()}`, name: val, nameAr: val };
            setGroups((prev:any) => prev.map((g:any) => g.id === form.mainGroupId ? { ...g, subGroups: [...g.subGroups, newSub] } : g));
            setForm(f => ({ ...f, subGroupId: newSub.id }));
        } else if (promptModal.type === 'unit') {
            const newUnit = { id: `U-\${Date.now()}`, name: val, nameAr: val, symbol: val.substring(0, 3).toUpperCase() };
            setUnits((prev:any) => [...prev, newUnit]);
            setForm(f => ({ ...f, unitId: newUnit.id }));
        }
        setPromptModal({ isOpen: false, type: 'main', value: '' });
    }, [promptModal, form.mainGroupId, setGroups, setUnits]);

    const updateCostAndProfit = useCallback((costPrice: number, profitPercent: number) => {
        const sellPrice = Math.round(costPrice * (1 + profitPercent / 100));
        setForm(f => ({ ...f, costPrice, profitPercent, sellPrice }));
    }, []);

    return {
        form, setForm, editingProduct, setEditingProduct, showAddEdit, setShowAddEdit,
        promptModal, setPromptModal, openAdd, openEdit, saveProduct, handlePromptSubmit, updateCostAndProfit, generateBarcode
    };
}
EOT;
file_put_contents("$dir/hooks/useProductForm.ts", $useProductForm);
?>
