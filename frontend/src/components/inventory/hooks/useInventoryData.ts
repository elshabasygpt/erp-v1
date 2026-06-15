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