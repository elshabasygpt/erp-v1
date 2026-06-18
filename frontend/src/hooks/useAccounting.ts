import { useQuery } from '@tanstack/react-query';
import { accountingApi, treasuryApi } from '@/lib/api';

export function useAccountingDashboard() {
    return useQuery({
        queryKey: ['accountingDashboard'],
        queryFn: async () => {
            const [entries, safes] = await Promise.all([
                accountingApi.getJournalEntries({ limit: 10 }).catch(() => ({ data: { data: [] } })),
                treasuryApi.getSafes().catch(() => ({ data: { data: [] } })),
            ]);

            return {
                entries: entries.data?.data || [],
                safes: safes.data?.data || [],
            };
        }
    });
}

export function useSafes() {
    return useQuery({
        queryKey: ['safes'],
        queryFn: async () => {
            const res = await treasuryApi.getSafes();
            return res.data?.data || [];
        }
    });
}

export function useExpenses() {
    return useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            const [expRes, catRes] = await Promise.all([
                treasuryApi.getExpenses(),
                treasuryApi.getExpenseCategories()
            ]);
            return {
                expenses: expRes.data?.data || [],
                categories: catRes.data?.data || []
            };
        }
    });
}

export function useJournalEntries(params?: any) {
    return useQuery({
        queryKey: ['journalEntries', params],
        queryFn: async () => {
            const res = await accountingApi.getJournalEntries(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useAccounts(params?: any) {
    return useQuery({
        queryKey: ['accounts', params],
        queryFn: async () => {
            const res = await accountingApi.getAccounts(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useCostCenters(params?: any) {
    return useQuery({
        queryKey: ['costCenters', params],
        queryFn: async () => {
            const res = await accountingApi.getCostCenters(params);
            return res.data?.data || res.data || [];
        }
    });
}

export function useCurrencies(params?: any) {
    return useQuery({
        queryKey: ['currencies', params],
        queryFn: async () => {
            const res = await accountingApi.getCurrencies(params);
            return res.data?.data || res.data || [];
        }
    });
}
