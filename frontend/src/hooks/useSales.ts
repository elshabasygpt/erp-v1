import { useQuery } from '@tanstack/react-query';
import { salesApi } from '@/lib/api';

export function useSalesInvoices(params?: any) {
    return useQuery({
        queryKey: ['salesInvoices', params],
        queryFn: async () => {
            const res = await salesApi.getInvoices(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useSalesDashboard() {
    return useQuery({
        queryKey: ['salesDashboard'],
        queryFn: async () => {
            const [invoices, orders, quotations] = await Promise.all([
                salesApi.getInvoices({ limit: 10 }).catch(() => ({ data: { data: [] } })),
                salesApi.getSalesOrders({ limit: 5 }).catch(() => ({ data: { data: [] } })),
                salesApi.getQuotations({ limit: 5 }).catch(() => ({ data: { data: [] } })),
            ]);

            return {
                invoices: invoices.data?.data || [],
                orders: orders.data?.data || [],
                quotations: quotations.data?.data || [],
            };
        }
    });
}
