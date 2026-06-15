import { useState, useEffect, useCallback } from 'react';
import api, { inventoryApi } from '@/lib/api';
import { format } from 'date-fns';

export function useSalesDashboard(isRTL: boolean) {
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState<any>({});
    const [charts, setCharts] = useState<any>({});
    const [dateRange, setDateRange] = useState({
        from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd')
    });
    const [filters, setFilters] = useState({ branch_id: '', warehouse_id: '' });
    const [branches, setBranches] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        inventoryApi.getBranches().then(res => {
            const data = res.data?.data?.data || res.data?.data || res.data || [];
            setBranches(Array.isArray(data) ? data : []);
        }).catch(() => setBranches([]));
        inventoryApi.getWarehouses().then(res => {
            const data = res.data?.data?.data || res.data?.data || res.data || [];
            setWarehouses(Array.isArray(data) ? data : []);
        }).catch(() => setWarehouses([]));
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [kpiRes, chartRes] = await Promise.all([
                api.get('/sales/advanced-reports/kpis', { params: { date_from: dateRange.from, date_to: dateRange.to, ...filters } }),
                api.get('/sales/advanced-reports/charts', { params: { date_from: dateRange.from, date_to: dateRange.to, ...filters } })
            ]);
            setKpis(kpiRes.data.data);
            setCharts(chartRes.data.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching dashboard data', error);
            setError(isRTL ? 'فشل تحميل بيانات لوحة القياس' : 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [dateRange, filters, isRTL]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { 
        loading, kpis, charts, 
        dateRange, setDateRange, 
        filters, setFilters, 
        branches, warehouses, error 
    };
}
