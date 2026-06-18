import { useQuery } from '@tanstack/react-query';
import { inventoryApi, purchasesApi, purchaseReturnsApi, crmApi } from '@/lib/api';

export function usePurchasesData() {
    const { data: suppliersData, isLoading: loadingSup } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const res = await crmApi.getSuppliers({ limit: 100 });
            return res.data?.data?.data || res.data?.data || [];
        }
    });

    const { data: warehousesData, isLoading: loadingWar } = useQuery({
        queryKey: ['warehouses'],
        queryFn: async () => {
            const res = await inventoryApi.getWarehouses({ limit: 100 });
            return res.data?.data?.data || res.data?.data || [];
        }
    });

    const { data: productsData, isLoading: loadingProd } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const res = await inventoryApi.getProducts({ limit: 100 });
            return res.data?.data?.data || res.data?.data || [];
        }
    });

    const { data: invoicesData, isLoading: loadingInv, refetch: fetchInvoices } = useQuery({
        queryKey: ['purchaseInvoices'],
        queryFn: async () => {
            const res = await purchasesApi.getInvoices({ limit: 100 });
            return res.data?.data?.data || res.data?.data || [];
        }
    });

    const { data: returnsData, isLoading: loadingRet, refetch: fetchReturns } = useQuery({
        queryKey: ['purchaseReturns'],
        queryFn: async () => {
            const res = await purchaseReturnsApi.getReturns({ limit: 100 });
            return res.data?.data?.data || res.data?.data || [];
        }
    });

    const loading = loadingSup || loadingWar || loadingProd || loadingInv || loadingRet;

    return {
        loading,
        suppliers: suppliersData || [],
        warehouses: warehousesData || [],
        products: productsData || [],
        invoices: invoicesData || [],
        returns: returnsData || [],
        fetchInvoices,
        fetchReturns,
        fetchInitialData: () => {} // Shim for backwards compatibility if needed
    };
}