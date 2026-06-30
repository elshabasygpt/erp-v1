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

    // Guard with Array.isArray so a failed/odd API response can never crash
    // a `.map` in the UI (e.g. warehouses.map) and white-screen the page.
    const arr = (x: any) => (Array.isArray(x) ? x : []);

    return {
        loading,
        suppliers: arr(suppliersData),
        warehouses: arr(warehousesData),
        products: arr(productsData),
        invoices: arr(invoicesData),
        returns: arr(returnsData),
        fetchInvoices,
        fetchReturns,
        fetchInitialData: () => {} // Shim for backwards compatibility if needed
    };
}