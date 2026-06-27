import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api';
import type { MainGroup, Unit } from '../InventoryModals';

export interface Product {
    id: string; code: string; name: string; nameAr: string; barcode: string;
    mainGroupId: string; subGroupId: string; unitId: string;
    costPrice: number; sellPrice: number; wholesalePrice: number; semiWholesalePrice: number;
    profitPercent: number; discount: number; stock: number; minStock: number; description: string;
    imageUrl?: string;
    oemNumber?: string;
    partNumber?: string;
    brand?: string;
    brand_id?: string;
    qualityGrade?: string;
    countryOfOrigin?: string;
    isKit?: boolean;
    binLocation?: string;
    warehouseStocks?: any[];
    supersededById?: string;
    supersededBy?: any;
}

export function useInventoryData() {
    // We keep these empty states for backward compatibility of the hook return type, 
    // but the real data is fetched via react-query
    const [localGroups, setLocalGroups] = useState<MainGroup[]>([]);
    const [localUnits, setLocalUnits] = useState<Unit[]>([]);

    const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await inventoryApi.getCategories();
            if (!res.data?.data) return [];
            return res.data.data.map((c: any) => ({
                id: c.id,
                name: c.name,
                nameAr: c.name_ar,
                imageUrl: c.image_url,
                discount: c.discount ? parseFloat(c.discount) : undefined,
                subGroups: (c.children || []).map((child: any) => ({
                    id: child.id,
                    name: child.name,
                    nameAr: child.name_ar,
                    imageUrl: child.image_url,
                    discount: child.discount ? parseFloat(child.discount) : undefined
                }))
            })) as MainGroup[];
        }
    });

    const { data: units = [], isLoading: isLoadingUnits } = useQuery({
        queryKey: ['units'],
        queryFn: async () => {
            const res = await inventoryApi.getUnits();
            if (!res.data?.data) return [];
            return res.data.data.map((u: any) => ({
                id: u.id,
                name: u.name,
                nameAr: u.name_ar,
                symbol: u.symbol || ''
            })) as Unit[];
        }
    });

    const { data: products = [], isLoading: isLoadingProducts, error } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const res = await inventoryApi.getProducts({ limit: 100 });
            if (!res.data?.data) return [];
            
            return res.data.data.map((p: any) => ({
                id: p.id,
                code: p.sku || p.id.substring(0,6),
                name: p.name,
                nameAr: p.name_ar || p.name,
                barcode: p.barcode || '',
                mainGroupId: p.category_id || '',
                subGroupId: '',
                unitId: p.unit_of_measure || '',
                costPrice: parseFloat(p.cost_price || 0),
                sellPrice: parseFloat(p.sell_price || 0),
                wholesalePrice: p.wholesale_price !== null && p.wholesale_price !== undefined ? parseFloat(p.wholesale_price) : parseFloat(p.sell_price || 0) * 0.9,
                semiWholesalePrice: p.semi_wholesale_price !== null && p.semi_wholesale_price !== undefined ? parseFloat(p.semi_wholesale_price) : parseFloat(p.sell_price || 0) * 0.95,
                profitPercent: 0,
                discount: 0,
                countryOfOrigin: p.country_of_origin || '',
                isKit: p.is_kit || false,
                supersededById: p.superseded_by_id || '',
                supersededBy: p.superseded_by || null,
                stock: p.warehouseStocks?.reduce((acc: number, w: any) => acc + (parseFloat(w.quantity) || 0), 0) || 0,
                warehouseStocks: p.warehouseStocks || [],
                minStock: p.stock_alert_level || 5,
                description: p.description || '',
                imageUrl: p.image_url || '',
                oemNumber: p.oem_number || '',
                partNumber: p.part_number || '',
                brand: p.brand_model?.name || p.brand || '',
                brand_id: p.brand_id || null,
                qualityGrade: p.quality_grade || '',
                binLocation: p.warehouseStocks && p.warehouseStocks.length > 0 ? p.warehouseStocks[0].bin_location : '',
            })) as Product[];
        }
    });

    const isLoading = isLoadingProducts || isLoadingGroups || isLoadingUnits;

    return {
        products, 
        setProducts: () => {}, // Deprecated, will be removed later
        groups, setGroups: setLocalGroups, 
        units, setUnits: setLocalUnits, 
        isLoading
    };
}