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
