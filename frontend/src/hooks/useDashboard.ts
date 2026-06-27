import { useQuery } from '@tanstack/react-query';
import { reportsApi, salesApi, inventoryApi, purchasesApi, crmApi, analyticsApi, tasksApi } from '@/lib/api';
import type { DashboardPeriod } from '@/components/dashboard/PeriodSelector';

export function useDashboardData(period: DashboardPeriod = 'month') {
    return useQuery({
        queryKey: ['dashboardData', period],
        queryFn: async () => {
            const [salesRes, inventoryRes, purchasesRes, crmRes, aiRes, kpiRes, tasksRes] = await Promise.all([
                salesApi.getInvoices({ limit: 5 }).catch(() => ({ data: { data: [] } })),
                inventoryApi.getProducts({ limit: 5 }).catch(() => ({ data: { data: [] } })),
                purchasesApi.getInvoices({ limit: 5 }).catch(() => ({ data: { data: [] } })),
                crmApi.getCustomers({ limit: 5 }).catch(() => ({ data: { data: [] } })),
                analyticsApi.getInventoryForecast(10).catch(() => ({ data: { data: { forecasts: [] } } })),
                reportsApi.getGeneralKpis({ period }).catch(() => ({ data: { data: {} } })),
                tasksApi.getDashboard().catch(() => ({ data: { data: null } })),
            ]);

            return {
                salesRows:      salesRes.data?.data || [],
                invRows:        inventoryRes.data?.data || [],
                purRows:        purchasesRes.data?.data || [],
                custRows:       crmRes.data?.data || [],
                forecastsData:  aiRes?.data?.data?.forecasts || [],
                tasksDashData:  tasksRes?.data?.data ?? tasksRes?.data ?? null,
                kpis:           kpiRes.data?.data || {},
            };
        },
        staleTime: 2 * 60 * 1000, // 2 min cache
    });
}
