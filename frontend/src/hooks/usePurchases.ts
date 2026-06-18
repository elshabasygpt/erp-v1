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
