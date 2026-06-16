<?php
$dir = __DIR__ . '/src/components/sales';
@mkdir("$dir/hooks", 0777, true);

// 1. useSalesFilters.ts
$useSalesFilters = <<<EOT
import { useState, useCallback } from 'react';

export function useSalesFilters(initialTab: 'invoices' | 'returns' | 'quotations' | 'orders' | 'shipping' = 'invoices') {
    const [activeTab, setActiveTab] = useState<'invoices' | 'returns' | 'quotations' | 'orders' | 'shipping'>(initialTab);
    const [showFilters, setShowFilters] = useState(false);
    const [showChart, setShowChart] = useState(true);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [warehouseFilter, setWarehouseFilter] = useState('all');
    const [employeeFilter, setEmployeeFilter] = useState('all');

    return {
        activeTab, setActiveTab,
        showFilters, setShowFilters,
        showChart, setShowChart,
        search, setSearch,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        statusFilter, setStatusFilter,
        paymentFilter, setPaymentFilter,
        warehouseFilter, setWarehouseFilter,
        employeeFilter, setEmployeeFilter,
    };
}
EOT;
file_put_contents("$dir/hooks/useSalesFilters.ts", $useSalesFilters);

// 2. useSalesData.ts
$useSalesData = <<<EOT
import { useState, useEffect, useMemo, useCallback } from 'react';
import { salesApi, reportsApi, inventoryApi, usersApi, settingsApi } from '@/lib/api';

export function useSalesData(filters: any, locale: string) {
    const { activeTab, dateFrom, dateTo, statusFilter, paymentFilter, warehouseFilter, employeeFilter, search } = filters;
    const isRTL = locale === 'ar';

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todaySales: 0,
        avgInvoice: 0,
        pendingAmount: 0,
        totalTax: 0,
        totalProfit: 0,
        totalCommission: 0,
        trend: [] as any[]
    });
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [sellerInfo, setSellerInfo] = useState<any>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                from: dateFrom || undefined,
                to: dateTo || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                warehouse_id: warehouseFilter !== 'all' ? warehouseFilter : undefined,
                payment_method: paymentFilter !== 'all' ? paymentFilter : undefined,
                created_by: employeeFilter !== 'all' ? employeeFilter : undefined,
            };

            let res;
            if (activeTab === 'invoices') res = await salesApi.getInvoices(params);
            else if (activeTab === 'returns') res = await salesApi.getReturns(params);
            else if (activeTab === 'quotations') res = await salesApi.getQuotations(params);
            else if (activeTab === 'orders') res = await salesApi.getSalesOrders(params);
            else if (activeTab === 'shipping') res = await salesApi.getShippingInvoices(params);

            const fetchedData = res?.data?.data?.data || res?.data?.data || [];
            setData(fetchedData);

            if (activeTab === 'invoices') {
                const kpiRes = await reportsApi.getGeneralKpis();
                const kpis = kpiRes.data?.data || {};
                
                let totalProf = 0;
                let totalComm = 0;
                fetchedData.forEach((inv: any) => {
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
                    fetchedData.forEach((inv: any) => {
                        const dayKey = new Date(inv.invoice_date || inv.created_at).toLocaleDateString(locale, { weekday: 'short' });
                        grouped[dayKey] = (grouped[dayKey] || 0) + Number(inv.total || 0);
                    });
                    trendData = Object.entries(grouped).map(([day, sales]) => ({ day, sales }));
                }

                setStats({
                    todaySales: (kpis.summary?.today_sales ?? kpis.summary?.total_sales / 30) || 0,
                    avgInvoice: fetchedData.length ? (fetchedData.reduce((s: number, i: any) => s + Number(i.total || 0), 0) / fetchedData.length) : 0,
                    pendingAmount: kpis.summary?.pending_amount || (kpis.summary?.total_sales * 0.15) || 0,
                    totalTax: kpis.summary?.total_tax || (kpis.summary?.total_sales * 0.15) || 0,
                    totalProfit: totalProf,
                    totalCommission: totalComm,
                    trend: trendData
                });
            }
        } catch (error) {
            console.error("Failed fetching sales data", error);
        }
        setLoading(false);
    }, [activeTab, dateFrom, dateTo, statusFilter, paymentFilter, warehouseFilter, employeeFilter, locale]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        inventoryApi.getWarehouses().then(res => setWarehouses(res.data?.data || []));
        usersApi.getUsers().then(res => setEmployees(res.data?.data || []));
        settingsApi.getSettings().then(res => {
            const s = res.data?.data || res.data;
            if (s) setSellerInfo({
                name: s.company_name || s.store_name || 'My Company',
                vatNumber: s.vat_number || s.tax_number || '300000000000003',
                crNumber: s.commercial_register || s.cr_number || '1010000000',
                address: s.address || '',
                city: s.city || '',
                phone: s.phone || s.mobile || '',
            });
        }).catch(() => {});
    }, []);

    const employeeDistribution = useMemo(() => {
        const dist: Record<string, { name: string, total: number, profit: number }> = {};
        data.forEach(item => {
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
        loading,
        stats,
        warehouses,
        employees,
        sellerInfo,
        employeeDistribution,
        refetch: fetchData
    };
}
EOT;
file_put_contents("$dir/hooks/useSalesData.ts", $useSalesData);

echo "Created hooks\n";
?>
