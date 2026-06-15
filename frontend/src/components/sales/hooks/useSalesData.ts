import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi, reportsApi, inventoryApi, usersApi, settingsApi } from '@/lib/api';

export function useSalesData(filters: any, locale: string) {
    const { activeTab, dateFrom, dateTo, statusFilter, paymentFilter, warehouseFilter, employeeFilter, search } = filters;
    const isRTL = locale === 'ar';

    const params = useMemo(() => ({
        from: dateFrom || undefined,
        to: dateTo || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        warehouse_id: warehouseFilter !== 'all' ? warehouseFilter : undefined,
        payment_method: paymentFilter !== 'all' ? paymentFilter : undefined,
        created_by: employeeFilter !== 'all' ? employeeFilter : undefined,
    }), [dateFrom, dateTo, statusFilter, warehouseFilter, paymentFilter, employeeFilter]);

    // Fetch Sales Data based on Active Tab
    const { data: salesRawData, isLoading: salesLoading, refetch: refetchSales } = useQuery({
        queryKey: ['sales', activeTab, params],
        queryFn: async () => {
            let res;
            if (activeTab === 'invoices') res = await salesApi.getInvoices(params);
            else if (activeTab === 'returns') res = await salesApi.getReturns(params);
            else if (activeTab === 'quotations') res = await salesApi.getQuotations(params);
            else if (activeTab === 'orders') res = await salesApi.getSalesOrders(params);
            else if (activeTab === 'shipping') res = await salesApi.getShippingInvoices(params);
            return res?.data?.data?.data || res?.data?.data || [];
        }
    });

    const data = salesRawData || [];

    // Fetch KPIs if Invoices tab is active
    const { data: kpisData } = useQuery({
        queryKey: ['sales-kpis'],
        queryFn: async () => {
            const res = await reportsApi.getGeneralKpis();
            return res?.data?.data || {};
        },
        enabled: activeTab === 'invoices'
    });

    const kpis = kpisData || {};

    // Calculate Stats
    const stats = useMemo(() => {
        let totalProf = 0;
        let totalComm = 0;

        if (activeTab === 'invoices') {
            data.forEach((inv: any) => {
                totalComm += Number(inv.commission_amount || 0);
                (inv.items || []).forEach((item: any) => {
                    const cost = Number(item.cost_price || item.product?.cost_price || 0);
                    const price = Number(item.unit_price || 0);
                    totalProf += (price - cost) * Number(item.quantity || 0);
                });
            });

            const dailySalesRaw = kpis.daily_sales || kpis.trend || [];
            let trendData;
            if (dailySalesRaw.length > 0) {
                trendData = dailySalesRaw.map((d: any) => ({
                    day: d.date ? new Date(d.date).toLocaleDateString(locale, { weekday: 'short' }) : (d.day || d.label),
                    sales: Number(d.total || d.sales || d.amount || 0)
                }));
            } else {
                const grouped: Record<string, number> = {};
                data.forEach((inv: any) => {
                    const dayKey = new Date(inv.invoice_date || inv.created_at).toLocaleDateString(locale, { weekday: 'short' });
                    grouped[dayKey] = (grouped[dayKey] || 0) + Number(inv.total || 0);
                });
                trendData = Object.entries(grouped).map(([day, sales]) => ({ day, sales }));
            }

            return {
                todaySales: (kpis.summary?.today_sales ?? (kpis.summary?.total_sales / 30)) || 0,
                avgInvoice: data.length ? (data.reduce((s: number, i: any) => s + Number(i.total || 0), 0) / data.length) : 0,
                pendingAmount: kpis.summary?.pending_amount || (kpis.summary?.total_sales * 0.15) || 0,
                totalTax: kpis.summary?.total_tax || (kpis.summary?.total_sales * 0.15) || 0,
                totalProfit: totalProf,
                totalCommission: totalComm,
                trend: trendData
            };
        }

        return {
            todaySales: 0, avgInvoice: 0, pendingAmount: 0, totalTax: 0, totalProfit: 0, totalCommission: 0, trend: [] as any[]
        };
    }, [data, kpis, activeTab, locale]);

    // Fetch Warehouses
    const { data: warehouses = [] } = useQuery({
        queryKey: ['warehouses'],
        queryFn: async () => {
            const res = await inventoryApi.getWarehouses();
            return res.data?.data || [];
        }
    });

    // Fetch Employees
    const { data: employees = [] } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await usersApi.getUsers();
            return res.data?.data || [];
        }
    });

    // Fetch Seller Info (Settings)
    const { data: sellerInfo = null } = useQuery({
        queryKey: ['settings-seller'],
        queryFn: async () => {
            const res = await settingsApi.getSettings();
            const s = res.data?.data || res.data;
            if (s) {
                return {
                    name: s.company_name || s.store_name || 'My Company',
                    vatNumber: s.vat_number || s.tax_number || '300000000000003',
                    crNumber: s.commercial_register || s.cr_number || '1010000000',
                    address: s.address || '',
                    city: s.city || '',
                    phone: s.phone || s.mobile || '',
                };
            }
            return null;
        }
    });

    const employeeDistribution = useMemo(() => {
        const dist: Record<string, { name: string, total: number, profit: number }> = {};
        data.forEach((item: any) => {
            const creatorName = item.creator?.name || (isRTL ? 'إداري' : 'Admin');
            const amount = Number(item.total || item.shipping_cost || 0);
            let profit = 0;
            (item.items || item.sales_invoice?.items || []).forEach((i: any) => {
                profit += (Number(i.unit_price || 0) - Number(i.product?.cost_price || 0)) * Number(i.quantity || 0);
            });

            if (!dist[creatorName]) dist[creatorName] = { name: creatorName, total: 0, profit: 0 };
            dist[creatorName].total += amount;
            dist[creatorName].profit += profit;
        });
        return Object.values(dist).sort((a,b) => b.total - a.total);
    }, [data, isRTL]);

    const filteredData = useMemo(() => {
        return (data || []).filter((item: any) => {
            const query = search.toLowerCase();
            const numberMatch = (item.invoice_number || item.return_number || item.quotation_number || item.so_number || item.shipping_number || '').toLowerCase().includes(query);
            const customerMatch = (item.customer?.name || item.sales_invoice?.customer?.name || '').toLowerCase().includes(query);
            return numberMatch || customerMatch;
        });
    }, [data, search]);

    return {
        data,
        filteredData,
        loading: salesLoading,
        stats,
        warehouses,
        employees,
        sellerInfo,
        employeeDistribution,
        refetch: refetchSales
    };
}