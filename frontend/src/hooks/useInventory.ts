import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api';

export function useInventoryProducts(params?: any) {
    return useQuery({
        queryKey: ['inventoryProducts', params],
        queryFn: async () => {
            const res = await inventoryApi.getProducts(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useInventoryDashboard() {
    return useQuery({
        queryKey: ['inventoryDashboard'],
        queryFn: async () => {
            const [products, movements] = await Promise.all([
                inventoryApi.getProducts({ limit: 10 }).catch(() => ({ data: { data: [] } })),
                inventoryApi.getMovements({ limit: 10 }).catch(() => ({ data: { data: [] } })),
            ]);

            return {
                products: products.data?.data || [],
                movements: movements.data?.data || [],
            };
        }
    });
}
export function useInventoryWarehouses(params?: any) {
    return useQuery({
        queryKey: ['inventoryWarehouses', params],
        queryFn: async () => {
            const res = await inventoryApi.getWarehouses(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useInventoryCategories(params?: any) {
    return useQuery({
        queryKey: ['inventoryCategories', params],
        queryFn: async () => {
            const res = await inventoryApi.getCategories(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useInventoryUnits(params?: any) {
    return useQuery({
        queryKey: ['inventoryUnits', params],
        queryFn: async () => {
            const res = await inventoryApi.getUnits(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useStockTransfers(params?: any) {
    return useQuery({
        queryKey: ['stockTransfers', params],
        queryFn: async () => {
            const res = await inventoryApi.getStockTransfers(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useInventoryMovements(params?: any) {
    return useQuery({
        queryKey: ['inventoryMovements', params],
        queryFn: async () => {
            const res = await inventoryApi.getMovements(params);
            return res.data?.data || res.data || [];
        }
    });
}
