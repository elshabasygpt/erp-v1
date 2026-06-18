import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@/lib/api';

// --- QUERIES ---

export function useSalesInvoices(params?: any) {
    return useQuery({
        queryKey: ['salesInvoices', params],
        queryFn: async () => {
            const res = await salesApi.getInvoices(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useSalesInvoice(id: string) {
    return useQuery({
        queryKey: ['salesInvoice', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await salesApi.getInvoice(id);
            return res.data?.data || res.data;
        },
        enabled: !!id,
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

export function useSalesReturns(params?: any) {
    return useQuery({
        queryKey: ['salesReturns', params],
        queryFn: async () => {
            const res = await salesApi.getReturns(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useQuotations(params?: any) {
    return useQuery({
        queryKey: ['quotations', params],
        queryFn: async () => {
            const res = await salesApi.getQuotations(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useSalesOrders(params?: any) {
    return useQuery({
        queryKey: ['salesOrders', params],
        queryFn: async () => {
            const res = await salesApi.getSalesOrders(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useSalesChannels(params?: any) {
    return useQuery({
        queryKey: ['salesChannels', params],
        queryFn: async () => {
            const res = await salesApi.getSalesChannels(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useWarranties(params?: any) {
    return useQuery({
        queryKey: ['warranties', params],
        queryFn: async () => {
            const res = await salesApi.getWarranties(params);
            return res.data?.data || res.data || [];
        }
    });
}

// --- MUTATIONS ---

export function useCreateInvoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await salesApi.createInvoice(data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
            queryClient.invalidateQueries({ queryKey: ['salesDashboard'] });
        },
    });
}

export function useUpdateInvoiceStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const res = await salesApi.updateInvoiceStatus(id, status);
            return res.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
            queryClient.invalidateQueries({ queryKey: ['salesInvoice', variables.id] });
        },
    });
}

export function useCreateSalesOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await salesApi.createSalesOrder(data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
            queryClient.invalidateQueries({ queryKey: ['salesDashboard'] });
        },
    });
}

export function useCreateQuotation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await salesApi.createQuotation(data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quotations'] });
            queryClient.invalidateQueries({ queryKey: ['salesDashboard'] });
        },
    });
}
