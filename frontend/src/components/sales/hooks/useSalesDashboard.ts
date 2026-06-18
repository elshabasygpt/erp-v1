import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { inventoryApi } from '@/lib/api';
import { format } from 'date-fns';

export function useSalesDashboard(isRTL: boolean) {
    const [dateRange, setDateRange] = useState({
        from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd')
    });
    const [filters, setFilters] = useState({ branch_id: '', warehouse_id: '' });

    const { data: branches = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const res = await inventoryApi.getBranches();
            const data = res.data?.data?.data || res.data?.data || res.data || [];
            return Array.isArray(data) ? data : [];
        }
    });

    const { data: warehouses = [] } = useQuery({
        queryKey: ['warehouses'],
        queryFn: async () => {
            const res = await inventoryApi.getWarehouses();
            const data = res.data?.data?.data || res.data?.data || res.data || [];
            return Array.isArray(data) ? data : [];
        }
    });

    const { data: dashboardData, isLoading: loading, error: queryError } = useQuery({
        queryKey: ['salesDashboardAdvanced', dateRange, filters],
        queryFn: async () => {
            const [kpiRes, chartRes] = await Promise.all([
                api.get('/sales/advanced-reports/kpis', { params: { date_from: dateRange.from, date_to: dateRange.to, ...filters } }),
                api.get('/sales/advanced-reports/charts', { params: { date_from: dateRange.from, date_to: dateRange.to, ...filters } })
            ]);
            return {
                kpis: kpiRes.data?.data || {},
                charts: chartRes.data?.data || {}
            };
        }
    });

    const error = queryError ? (isRTL ? 'فشل تحميل بيانات لوحة القياس' : 'Failed to load dashboard data') : null;

    return { 
        loading, 
        kpis: dashboardData?.kpis || {}, 
        charts: dashboardData?.charts || {}, 
        dateRange, setDateRange, 
        filters, setFilters, 
        branches, warehouses, error 
    };
}
