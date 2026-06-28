import { useState, useCallback } from 'react';
import type { Product } from './useInventoryData';
import toast from 'react-hot-toast';

export function useProductForm(products: Product[], setProducts: any, groups: any[], setGroups: any, units: any[], setUnits: any, isRTL: boolean) {
    const emptyForm = { code: '', name: '', nameAr: '', barcode: '', mainGroupId: '', subGroupId: '', unitId: '', costPrice: 0, sellPrice: 0, wholesalePrice: 0, semiWholesalePrice: 0, profitPercent: 0, discount: 0, minStock: 5, description: '', imageUrl: '', oemNumber: '', partNumber: '', brand: '', brandId: '', qualityGrade: '', countryOfOrigin: '', warrantyMonths: 0, hasCoreCharge: false, coreChargeAmount: 0, isKit: false, supersededById: '', binLocation: '', pendingVehicles: [] as any[], _uploadingImage: false };
    const [form, setForm] = useState(emptyForm);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [showAddEdit, setShowAddEdit] = useState(false);
    const [promptModal, setPromptModal] = useState<{ isOpen: boolean, type: 'main' | 'sub' | 'unit', value: string }>({ isOpen: false, type: 'main', value: '' });

    const generateBarcode = () => `${Math.floor(Math.random() * 9000000000000) + 1000000000000}`;

    const openAdd = useCallback(() => {
        setEditingProduct(null);
        const nextCode = String(Math.max(...products.map(p => parseInt(p.code) || 0), 1000) + 1);
        setForm({ ...emptyForm, code: nextCode, barcode: generateBarcode() });
        setShowAddEdit(true);
    }, [products]);

    const openEdit = useCallback((p: Product) => {
        setEditingProduct(p);
        setForm({ code: p.code, name: p.name, nameAr: p.nameAr, barcode: p.barcode, mainGroupId: p.mainGroupId, subGroupId: p.subGroupId, unitId: p.unitId, costPrice: p.costPrice, sellPrice: p.sellPrice, wholesalePrice: p.wholesalePrice, semiWholesalePrice: p.semiWholesalePrice, profitPercent: p.profitPercent, discount: p.discount, minStock: p.minStock, description: p.description, imageUrl: p.imageUrl || '', oemNumber: p.oemNumber || '', partNumber: p.partNumber || '', brand: p.brand || '', brandId: (p as any).brand_id || '', qualityGrade: p.qualityGrade || '', countryOfOrigin: p.countryOfOrigin || '', warrantyMonths: (p as any).warranty_months || 0, hasCoreCharge: (p as any).has_core_charge || false, coreChargeAmount: parseFloat((p as any).core_charge_amount || 0), isKit: p.isKit || false, supersededById: (p as any).superseded_by_id || '', binLocation: p.binLocation || '', pendingVehicles: [], _uploadingImage: false });
        setShowAddEdit(true);
    }, []);

    const openDuplicate = useCallback((p: Product) => {
        setEditingProduct(null);
        const nextCode = String(Math.max(...products.map(pr => parseInt(pr.code) || 0), 1000) + 1);
        setForm({ code: nextCode, name: `${p.name} (Copy)`, nameAr: `${p.nameAr} (نسخة)`, barcode: generateBarcode(), mainGroupId: p.mainGroupId, subGroupId: p.subGroupId, unitId: p.unitId, costPrice: p.costPrice, sellPrice: p.sellPrice, wholesalePrice: p.wholesalePrice, semiWholesalePrice: p.semiWholesalePrice, profitPercent: p.profitPercent, discount: p.discount, minStock: p.minStock, description: p.description, imageUrl: p.imageUrl || '', oemNumber: p.oemNumber || '', partNumber: p.partNumber || '', brand: p.brand || '', brandId: (p as any).brand_id || '', qualityGrade: p.qualityGrade || '', countryOfOrigin: p.countryOfOrigin || '', warrantyMonths: (p as any).warranty_months || 0, hasCoreCharge: (p as any).has_core_charge || false, coreChargeAmount: parseFloat((p as any).core_charge_amount || 0), isKit: p.isKit || false, supersededById: (p as any).superseded_by_id || '', binLocation: p.binLocation || '', pendingVehicles: [], _uploadingImage: false });
        setShowAddEdit(true);
    }, [products]);

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
                wholesale_price: form.wholesalePrice !== null && form.wholesalePrice !== undefined && !Number.isNaN(form.wholesalePrice) ? form.wholesalePrice : null,
                semi_wholesale_price: form.semiWholesalePrice !== null && form.semiWholesalePrice !== undefined && !Number.isNaN(form.semiWholesalePrice) ? form.semiWholesalePrice : null,
                purchase_price: form.costPrice,
                image_url: (form.imageUrl && !form.imageUrl.startsWith('data:') && !form.imageUrl.startsWith('blob:')) ? form.imageUrl : null,
                category_id: form.mainGroupId?.length === 36 ? form.mainGroupId : null,
                unit_of_measure: form.unitId || null,
                stock_alert_level: form.minStock,
                is_active: true,
                oem_number: form.oemNumber || null,
                part_number: form.partNumber || null,
                brand_id: form.brandId || null,
                brand: form.brand || null,
                quality_grade: form.qualityGrade || null,
                country_of_origin: form.countryOfOrigin || null,
                warranty_months: form.warrantyMonths || 0,
                has_core_charge: form.hasCoreCharge || false,
                core_charge_amount: form.coreChargeAmount || 0,
                is_kit: form.isKit || false,
                superseded_by_id: form.supersededById || null,
            };

            if (editingProduct) {
                const res = await inventoryApi.updateProduct(editingProduct.id, payload);
                const updated = res.data?.data;
                
                if (form.binLocation !== (editingProduct.binLocation || '')) {
                    await inventoryApi.updateBinLocation(editingProduct.id, { warehouse_id: '', bin_location: form.binLocation });
                }

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
                        wholesalePrice: updated.wholesale_price !== null && updated.wholesale_price !== undefined ? parseFloat(updated.wholesale_price) : parseFloat(updated.sell_price || form.sellPrice) * 0.9,
                        semiWholesalePrice: updated.semi_wholesale_price !== null && updated.semi_wholesale_price !== undefined ? parseFloat(updated.semi_wholesale_price) : parseFloat(updated.sell_price || form.sellPrice) * 0.95,
                        minStock: updated.stock_alert_level || form.minStock,
                        description: updated.description || form.description,
                        imageUrl: updated.image_url || form.imageUrl,
                        oemNumber: updated.oem_number || form.oemNumber,
                        partNumber: updated.part_number || form.partNumber,
                        brand: updated.brand || form.brand,
                        qualityGrade: updated.quality_grade || form.qualityGrade,
                        countryOfOrigin: updated.country_of_origin || form.countryOfOrigin,
                        hasCoreCharge: updated.has_core_charge || form.hasCoreCharge,
                        coreChargeAmount: parseFloat(updated.core_charge_amount || form.coreChargeAmount),
                        isKit: updated.is_kit || form.isKit,
                        binLocation: form.binLocation,
                    } : p));
                }
            } else {
                const res = await inventoryApi.createProduct(payload);
                const created = res.data?.data;
                
                if (created && form.binLocation) {
                    await inventoryApi.updateBinLocation(created.id, { warehouse_id: '', bin_location: form.binLocation });
                }

                // Attach any pending vehicles selected during creation
                if (created && form.pendingVehicles?.length) {
                    await Promise.allSettled(
                        form.pendingVehicles.map((v: any) =>
                            inventoryApi.attachVehicle(created.id, { vehicle_year_id: v.vehicle_year_id })
                        )
                    );
                }

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
                        wholesalePrice: created.wholesale_price !== null && created.wholesale_price !== undefined ? parseFloat(created.wholesale_price) : parseFloat(created.sell_price || form.sellPrice) * 0.9,
                        semiWholesalePrice: created.semi_wholesale_price !== null && created.semi_wholesale_price !== undefined ? parseFloat(created.semi_wholesale_price) : parseFloat(created.sell_price || form.sellPrice) * 0.95,
                        minStock: created.stock_alert_level || form.minStock,
                        description: created.description || form.description,
                        imageUrl: created.image_url || form.imageUrl,
                        oemNumber: created.oem_number || form.oemNumber,
                        partNumber: created.part_number || form.partNumber,
                        brand: created.brand || form.brand,
                        qualityGrade: created.quality_grade || form.qualityGrade,
                        countryOfOrigin: created.country_of_origin || form.countryOfOrigin,
                        hasCoreCharge: created.has_core_charge || form.hasCoreCharge,
                        coreChargeAmount: parseFloat(created.core_charge_amount || form.coreChargeAmount),
                        isKit: created.is_kit || form.isKit,
                    }, ...prev]);
                }
            }
            setShowAddEdit(false);
        } catch (err) {

            toast.error(isRTL ? "حدث خطأ أثناء حفظ المنتج" : "Failed to save product");
        }
    }, [form, editingProduct, isRTL, setProducts]);

    const handlePromptSubmit = useCallback(() => {
        const val = promptModal.value.trim();
        if (!val) return;
        if (promptModal.type === 'main') {
            const newGroup = { id: `MG-${Date.now()}`, name: val, nameAr: val, subGroups: [] };
            setGroups((prev:any) => [...prev, newGroup]);
            setForm(f => ({ ...f, mainGroupId: newGroup.id, subGroupId: '' }));
        } else if (promptModal.type === 'sub') {
            const newSub = { id: `SG-${Date.now()}`, name: val, nameAr: val };
            setGroups((prev:any) => prev.map((g:any) => g.id === form.mainGroupId ? { ...g, subGroups: [...g.subGroups, newSub] } : g));
            setForm(f => ({ ...f, subGroupId: newSub.id }));
        } else if (promptModal.type === 'unit') {
            const newUnit = { id: `U-${Date.now()}`, name: val, nameAr: val, symbol: val.substring(0, 3).toUpperCase() };
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
        promptModal, setPromptModal, openAdd, openEdit, openDuplicate, saveProduct, handlePromptSubmit, updateCostAndProfit, generateBarcode
    };
}