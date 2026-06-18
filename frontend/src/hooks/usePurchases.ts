import { useQuery } from '@tanstack/react-query';
import { purchasesApi } from '@/lib/api';

export function usePurchasesDashboard() {
    return useQuery({
        queryKey: ['purchasesDashboard'],
        queryFn: async () => {
            const [invoices, orders] = await Promise.all([
                purchasesApi.getInvoices({ limit: 10 }).catch(() => ({ data: { data: [] } })),
                purchasesApi.getPurchaseOrders({ limit: 5 }).catch(() => ({ data: { data: [] } })),
            ]);

            return {
                invoices: invoices.data?.data || [],
                orders: orders.data?.data || [],
            };
        }
    });
}
export function usePurchasesInvoices(params?: any) {
    return useQuery({
        queryKey: ['purchasesInvoices', params],
        queryFn: async () => {
            const res = await purchasesApi.getInvoices(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function usePurchaseOrders(params?: any) {
    return useQuery({
        queryKey: ['purchaseOrders', params],
        queryFn: async () => {
            const res = await purchasesApi.getPurchaseOrders(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function usePurchaseReturns(params?: any) {
    return useQuery({
        queryKey: ['purchaseReturns', params],
        queryFn: async () => {
            const res = await purchasesApi.getReturns(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useSupplierPrices(params?: any) {
    return useQuery({
        queryKey: ['supplierPrices', params],
        queryFn: async () => {
            const res = await purchasesApi.getSupplierPrices(params);
            return res.data?.data || res.data || [];
        }
    });
}
