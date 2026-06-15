'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { salesApi, reportsApi, inventoryApi, usersApi, settingsApi } from '@/lib/api';
import { exportTableToPDF, exportDetailedReportToPDF } from '@/lib/pdf-export';
import POSInvoiceModal from './POSInvoiceModal';
import SalesReturnModal from './SalesReturnModal';
import QuotationModal from './QuotationModal';
import SalesOrderModal from './SalesOrderModal';
import ShippingModal from './ShippingModal';
import InvoicePrintTemplate from './InvoicePrintTemplate';

interface SalesContentProps {
    dict: any;
    locale: string;
    initialTab?: 'invoices' | 'returns' | 'quotations' | 'orders' | 'shipping';
}

export default function SalesContent({ dict, locale, initialTab = 'invoices' }: SalesContentProps) {
    const isRTL = locale === 'ar';
    const s = dict.sales;
    const c = dict.common;
    const inv = dict.inventory;
    
    // ── UI State ──────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'invoices' | 'returns' | 'quotations' | 'orders' | 'shipping'>(initialTab);
    const [showFilters, setShowFilters] = useState(false);
    const [showChart, setShowChart] = useState(true);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    
    // ── Data State ────────────────────────────────────────────────────────
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
    
    // ── Filter State ──────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [warehouseFilter, setWarehouseFilter] = useState('all');
    const [employeeFilter, setEmployeeFilter] = useState('all');
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    // ── Modal State ───────────────────────────────────────────────────────
    const [showModal, setShowModal] = useState(false);
    const [showSalesOrderModal, setShowSalesOrderModal] = useState(false);
    const [quotationToConvert, setQuotationToConvert] = useState<any>(null);
    const [showDetail, setShowDetail] = useState<any>(null);
    const [printingInvoice, setPrintingInvoice] = useState<any>(null);
    const [detailedData, setDetailedData] = useState<any>(null);
    const [fetchingDetail, setFetchingDetail] = useState(false);
    const [sellerInfo, setSellerInfo] = useState<any>(null);

    // ── Consumption Data (Performance by Employee) ───────────────────────
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

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // ── Data Fetching ─────────────────────────────────────────────────────
    const fetchData = async () => {
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
                
                // Calculate Estimated Total Profit and Commission for current view
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

                // Build real trend from kpis.daily_sales if available, else derive from fetched data
                const dailySalesRaw = kpis.daily_sales || kpis.trend || [];
                let trendData;
                if (dailySalesRaw.length > 0) {
                    trendData = dailySalesRaw.map((d: any) => ({
                        day: d.date ? new Date(d.date).toLocaleDateString(locale, { weekday: 'short' }) : (d.day || d.label),
                        sales: Number(d.total || d.sales || d.amount || 0)
                    }));
                } else {
                    // Aggregate from fetched invoices grouped by day
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
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, dateFrom, dateTo, statusFilter, paymentFilter, warehouseFilter, employeeFilter]);

    useEffect(() => {
        inventoryApi.getWarehouses().then(res => setWarehouses(res.data?.data || []));
        usersApi.getUsers().then(res => setEmployees(res.data?.data || []));
        // Fetch seller info for invoice printing
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
        
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleViewDetail = async (item: any) => {
        setShowDetail(item);
        setFetchingDetail(true);
        try {
            let res;
            if (activeTab === 'invoices') res = await salesApi.getInvoice(item.id);
            else if (activeTab === 'returns') res = await salesApi.getReturn(item.id);
            else if (activeTab === 'quotations') res = await salesApi.getQuotation(item.id);
            else if (activeTab === 'orders') res = await salesApi.getSalesOrder(item.id);
            else if (activeTab === 'shipping') res = await salesApi.getShippingInvoice(item.id);
            setDetailedData(res?.data?.data || res?.data);
        } catch (error) {
            console.error("Failed fetching detail", error);
        }
        setFetchingDetail(false);
    };

    const handlePrint = async (item: any) => {
        if (activeTab === 'invoices') {
            try {
                const res = await salesApi.getInvoice(item.id);
                const fullInvoice = res?.data?.data || res?.data;
                const printData = {
                    id: fullInvoice.invoice_number,
                    uuid: fullInvoice.id?.toString(),
                    type: (fullInvoice.type === 'tax_invoice' ? 'tax_invoice' : 'simplified') as any,
                    date: fullInvoice.invoice_date,
                    time: new Date(fullInvoice.created_at).toLocaleTimeString('en-GB', { hour12: false }),
                    seller: sellerInfo || {
                        name: 'My Company',
                        vatNumber: '300000000000003',
                        crNumber: '1010000000',
                        address: '',
                        city: '',
                        phone: '',
                    },
                    buyer: fullInvoice.customer ? {
                        name: fullInvoice.customer.name,
                        vatNumber: fullInvoice.customer.tax_number,
                        crNumber: fullInvoice.customer.commercial_register,
                    } : undefined,
                    items: (fullInvoice.items || []).map((i: any) => ({
                        code: i.product?.code || 'N/A',
                        name: isRTL ? (i.product?.name_ar || i.product?.name) : i.product?.name,
                        qty: i.quantity,
                        unit: i.product?.unit || 'pc',
                        price: i.unit_price,
                        vatRate: 0.15,
                    })),
                    paymentType: (fullInvoice.payment_method || 'cash') as any,
                    notes: fullInvoice.notes,
                };
                setPrintingInvoice(printData);
            } catch (error) {
                console.error("Print failed", error);
            }
        } else {
            window.print();
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(val || 0);

    const filteredData = (data || []).filter((item: any) => {
        const query = search.toLowerCase();
        const numberMatch = (item.invoice_number || item.return_number || item.quotation_number || item.so_number || item.shipping_number || '').toLowerCase().includes(query);
        const customerMatch = (item.customer?.name || item.sales_invoice?.customer?.name || '').toLowerCase().includes(query);
        return numberMatch || customerMatch;
    });

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': case 'completed': case 'delivered': case 'accepted': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'draft': case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'cancelled': case 'rejected': case 'returned': case 'expired': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'sent': case 'shipped': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const handleExportPDF = () => {
        const title = isRTL 
            ? (activeTab === 'invoices' ? 'تقرير فواتير المبيعات' : activeTab === 'returns' ? 'تقرير المرتجعات' : activeTab === 'quotations' ? 'تقرير عروض الأسعار' : activeTab === 'orders' ? 'تقرير أوامر البيع' : 'تقرير الشحن')
            : (activeTab === 'invoices' ? 'Sales Invoices Report' : activeTab === 'returns' ? 'Returns Report' : activeTab === 'quotations' ? 'Quotations Report' : activeTab === 'orders' ? 'Sales Orders Report' : 'Shipping Report');
        
        const subtitle = isRTL 
            ? `الفترة: ${dateFrom || '---'} إلى ${dateTo || '---'}` 
            : `Period: ${dateFrom || '---'} to ${dateTo || '---'}`;

        const headers = isRTL 
            ? ['الرقم', 'العميل', 'التاريخ', 'الموظف', 'الإجمالي', 'الحالة']
            : ['No.', 'Customer', 'Date', 'Employee', 'Total', 'Status'];

        const rows = filteredData.map(item => [
            item.invoice_number || item.return_number || item.quotation_number || item.so_number || item.shipping_number,
            item.customer?.name || item.sales_invoice?.customer?.name || 'Walk-in',
            new Date(item.invoice_date || item.created_at).toLocaleDateString(locale),
            item.creator?.name || 'Admin',
            formatCurrency(item.total || item.shipping_cost),
            item.status?.toUpperCase()
        ]);

        const summaryCards = activeTab === 'invoices' ? [
            { label: s.todaySales, value: formatCurrency(stats.todaySales) },
            { label: s.avgInvoiceValue, value: formatCurrency(stats.avgInvoice) },
            { label: dict.zatca.vatAmount, value: formatCurrency(stats.totalTax) },
            { label: dict.dashboard.pendingAmount, value: formatCurrency(stats.pendingAmount) },
        ] : undefined;

        exportTableToPDF(title, subtitle, headers, rows, summaryCards, isRTL);
        setShowExportMenu(false);
    };

    const handleExportDetailedPDF = () => {
        // Calculate Total Profit and Commissions for the filtered view
        let overallProfit = 0;
        let overallCommission = 0;
        filteredData.forEach(doc => {
            overallCommission += Number(doc.commission_amount || 0);
            const items = doc.items || doc.sales_invoice?.items || [];
            items.forEach((item: any) => {
                const cost = Number(item.cost_price || item.product?.cost_price || 0);
                const price = Number(item.unit_price || 0);
                overallProfit += (price - cost) * Number(item.quantity || 0);
            });
        });

        const title = isRTL 
            ? (activeTab === 'invoices' ? 'التقرير الإداري الشامل للمبيعات' : activeTab === 'returns' ? 'تقرير المرتجعات الإداري' : activeTab === 'quotations' ? 'تقرير العروض الإداري' : activeTab === 'orders' ? 'تقرير أوامر البيع الإداري' : 'تقرير الشحن الإداري')
            : (activeTab === 'invoices' ? 'Comprehensive Managerial Sales Report' : activeTab === 'returns' ? 'Managerial Returns Report' : activeTab === 'quotations' ? 'Managerial Quotations Report' : activeTab === 'orders' ? 'Managerial Sales Orders Report' : 'Managerial Shipping Report');
        
        const subtitle = isRTL ? `الفترة: ${dateFrom || '---'} إلى ${dateTo || '---'}` : `Period: ${dateFrom || '---'} to ${dateTo || '---'}`;

        const mainHeaders = isRTL 
            ? ['رقم المستند', 'الموظف', 'التاريخ', 'الإجمالي', 'العمولة', 'الحالة']
            : ['Doc No.', 'Employee', 'Date', 'Total', 'Commission', 'Status'];

        const itemHeaders = isRTL
            ? ['الصنف', 'الكمية', 'التكلفة', 'البيع', 'الربح', 'الهامش %']
            : ['Item', 'Qty', 'Cost', 'Sell', 'Profit', 'Margin %'];

        exportDetailedReportToPDF(
            title, 
            subtitle, 
            mainHeaders, 
            filteredData,
            (item) => [
                item.invoice_number || item.return_number || item.quotation_number || item.so_number || item.shipping_number,
                item.creator?.name || 'Admin',
                new Date(item.invoice_date || item.return_date || item.issue_date || item.created_at).toLocaleDateString(locale),
                formatCurrency(item.total || item.shipping_cost),
                formatCurrency(item.commission_amount || 0),
                item.status?.toUpperCase()
            ],
            (item) => {
                const itemsList = item.items || item.sales_invoice?.items || [];
                return {
                    headers: itemHeaders,
                    rows: itemsList.map((i: any) => {
                        const cost = Number(i.cost_price || i.product?.cost_price || 0);
                        const price = Number(i.unit_price || 0);
                        const profitPerUnit = price - cost;
                        const marginPercent = price > 0 ? (profitPerUnit / price) * 100 : 0;
                        const totalProfit = profitPerUnit * Number(i.quantity);

                        return [
                            isRTL ? (i.product?.name_ar || i.product?.name) : i.product?.name,
                            i.quantity,
                            formatCurrency(cost),
                            formatCurrency(price),
                            formatCurrency(totalProfit),
                            `${marginPercent.toFixed(1)}%`
                        ];
                    })
                }
            },
            [
                { label: isRTL ? 'إجمالي المبيعات' : 'Total Sales', value: formatCurrency(filteredData.reduce((acc, curr) => acc + Number(curr.total || curr.shipping_cost || 0), 0)) },
                { label: s.totalProfit, value: formatCurrency(overallProfit) },
                { label: s.totalCommission, value: formatCurrency(overallCommission) },
                { label: isRTL ? 'صافي الربح المتبقي' : 'Net Profit Remaining', value: formatCurrency(overallProfit - overallCommission) },
                { label: isRTL ? 'عدد العمليات' : 'Total Transactions', value: filteredData.length.toString() },
            ],
            isRTL
        );
        setShowExportMenu(false);
    };

    const handleExportCSV = () => {
        const headers = ['Doc No.', 'Customer', 'Date', 'Employee', 'Total', 'Status'];
        const rows = filteredData.map(item => [
            item.invoice_number || item.return_number || item.quotation_number || item.so_number || item.shipping_number,
            item.customer?.name || item.sales_invoice?.customer?.name || 'Walk-in',
            item.invoice_date || item.created_at,
            item.creator?.name || 'Admin',
            item.total || item.shipping_cost,
            item.status
        ]);

        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        setShowExportMenu(false);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'إدارة المبيعات والتاجية' : 'Sales & Productivity Hub'}
                    </h1>
                    <p className="text-surface-400 mt-1 flex items-center gap-2">
                        {isRTL ? 'متابعة أداء الموظفين والأرباح المحققة' : 'Track employee performance and real-time profits'}
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        <span className="text-xs font-medium text-indigo-500 uppercase tracking-widest">Managerial Mode</span>
                    </p>
                </div>
                <div className="flex items-center gap-3 relative" ref={exportMenuRef}>
                    <div className="relative">
                        <button 
                            onClick={() => setShowExportMenu(!showExportMenu)} 
                            className="btn-secondary px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-colors"
                        >
                            📥 {isRTL ? 'تصدير التقارير' : 'Export Reports'}
                            <svg className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        
                        {showExportMenu && (
                            <div className="absolute top-full end-0 mt-2 w-64 bg-surface-900 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-scale-in origin-top-right">
                                <button onClick={handleExportPDF} className="w-full px-4 py-3 text-start text-sm hover:bg-primary-500/10 flex items-center gap-2 transition-colors border-b border-white/5">
                                    <span className="text-red-400 text-lg">📄</span>
                                    {isRTL ? 'تصدير PDF (ملخص)' : 'Export PDF (Summary)'}
                                </button>
                                <button onClick={handleExportDetailedPDF} className="w-full px-4 py-3 text-start text-sm hover:bg-primary-500/10 flex items-center gap-2 transition-colors border-b border-white/5">
                                    <span className="text-primary-400 text-lg">📈</span>
                                    {isRTL ? 'التقرير الإداري (الأرباح)' : 'Managerial Report (Profits)'}
                                </button>
                                <button onClick={handleExportCSV} className="w-full px-4 py-3 text-start text-sm hover:bg-primary-500/10 flex items-center gap-2 transition-colors">
                                    <span className="text-green-400 text-lg">📊</span>
                                    {isRTL ? 'تصدير Excel/CSV' : 'Export to CSV'}
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 px-6 shadow-lg shadow-primary-500/20">
                        <span className="text-xl">+</span> {s.createInvoice}
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4`}>
                {[
                    { label: s.todaySales, value: stats.todaySales, icon: '💰', color: 'emerald' },
                    { label: s.avgInvoiceValue, value: stats.avgInvoice, icon: '📈', color: 'blue' },
                    { label: s.totalProfit, value: stats.totalProfit, icon: '💎', color: 'purple' },
                    { label: s.totalCommission, value: stats.totalCommission, icon: '🎟️', color: 'amber' },
                    { label: dict.dashboard.totalCustomers, value: filteredData.length, icon: '📋', color: 'rose' },
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-5 group hover:border-primary-500/30 transition-all duration-300">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{i < 4 ? formatCurrency(stat.value) : stat.value}</p>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-${stat.color}-500/10 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts & Distribution */}
            {showChart && activeTab === 'invoices' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 glass-card p-6 overflow-hidden relative">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <span>📊</span> {isRTL ? 'اتجاه المبيعات الأسبوعي' : 'Weekly Sales Trend'}
                            </h3>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.trend}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '12px' }}
                                        itemStyle={{ color: '#6366f1' }}
                                    />
                                    <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="glass-card p-6 flex flex-col items-center justify-center relative">
                        <div className="w-full flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest">
                                {isRTL ? 'توزيع المبيعات (الموظفين)' : 'Sales Distribution (Team)'}
                            </h3>
                        </div>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={employeeDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="total"
                                    >
                                        {employeeDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(val: number) => formatCurrency(val)}
                                        contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '12px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full mt-4 space-y-2">
                            {employeeDistribution.slice(0, 3).map((emp, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="text-surface-400 uppercase font-black tracking-tighter">{emp.name}</span>
                                    </div>
                                    <span className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(emp.total)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between bg-surface-900/50 p-1 rounded-2xl border border-white/5">
                <div className="flex flex-1 gap-1">
                    {['invoices', 'returns', 'quotations', 'orders', 'shipping'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`
                                flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-500
                                ${activeTab === tab ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-[1.02]' : 'text-surface-400 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            {isRTL 
                                ? (tab === 'invoices' ? 'الفواتير' : tab === 'returns' ? 'المرتجعات' : tab === 'quotations' ? 'العروض' : tab === 'orders' ? 'أوامر البيع' : 'الشحن')
                                : (tab === 'invoices' ? 'Invoices' : tab === 'returns' ? 'Returns' : tab === 'quotations' ? 'Quotations' : tab === 'orders' ? 'Sales Orders' : 'Shipping')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters Section */}
            <div className="glass-card p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            className="input-field ps-10"
                            placeholder={isRTL ? 'بحث برقم المستند، العميل، الهاتف...' : 'Search doc, customer, phone...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-icon-sm ml-3 ${showFilters ? 'bg-primary-500/20 text-primary-500' : 'text-surface-400 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5 animate-slide-down">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-surface-500 lowercase">{isRTL ? 'الموظف (الكاشير)' : 'Employee (Cashier)'}</label>
                            <select className="select-field py-2 text-xs" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
                                <option value="all">{isRTL ? 'جميع الموظفين' : 'All Employees'}</option>
                                {employees.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-surface-500">{s.dateFrom}</label>
                            <input type="date" className="input-field py-2 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-surface-500">{s.dateTo}</label>
                            <input type="date" className="input-field py-2 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-surface-500">{c.status}</label>
                            <select className="select-field py-2 text-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="all">{s.allStatuses}</option>
                                <option value="confirmed">{s.confirmed}</option>
                                <option value="draft">{s.draft}</option>
                                <option value="cancelled">{s.cancelled}</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Table Content */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="text-center py-32">
                        <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-surface-400 font-medium animate-pulse">{c.loading}</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="text-center py-32 space-y-4">
                        <div className="text-7xl opacity-20">📂</div>
                        <div>
                            <p className="text-surface-300 text-xl font-bold">{isRTL ? 'لا توجد بيانات متاحة' : 'No data available'}</p>
                            <p className="text-surface-500 text-sm">{isRTL ? 'جرب تغيير فلاتر البحث أو التاريخ' : 'Try changing search filters or date range'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table text-sm">
                            <thead>
                                <tr className="bg-white/5">
                                    <th className="w-10">
                                        <input type="checkbox" className="rounded bg-surface-800 border-white/10" />
                                    </th>
                                    <th>{isRTL ? 'الرقم' : 'No.'}</th>
                                    <th>{isRTL ? 'العميل' : 'Customer'}</th>
                                    <th>{isRTL ? 'الكاشير' : 'Cashier'}</th>
                                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                    <th className="text-end">{s.total}</th>
                                    <th className="text-center">{c.status}</th>
                                    <th className="text-end">{c.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredData.map((item, i) => {
                                    const docNumber = item.invoice_number || item.return_number || item.quotation_number || item.so_number || item.shipping_number;
                                    const customerName = item.customer?.name || item.sales_invoice?.customer?.name || 'Walk-in';
                                    const creatorName = item.creator?.name || 'Admin';
                                    const dateStr = item.invoice_date || item.return_date || item.issue_date || item.created_at;
                                    const amount = item.total !== undefined ? item.total : item.shipping_cost;
                                    
                                    return (
                                        <tr key={i} className="group hover:bg-indigo-500/5 transition-all duration-300 cursor-pointer" onClick={() => handleViewDetail(item)}>
                                            <td>
                                                <input type="checkbox" className="rounded bg-surface-800 border-white/10" onClick={(e) => e.stopPropagation()} />
                                            </td>
                                            <td className="font-mono text-indigo-400 font-bold tracking-tighter">{docNumber}</td>
                                            <td className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {customerName}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-400 font-bold border border-indigo-500/30">
                                                        {creatorName.substring(0,1).toUpperCase()}
                                                    </div>
                                                    <span className="text-surface-400 text-xs font-medium uppercase tracking-tighter">{creatorName}</span>
                                                </div>
                                            </td>
                                            <td className="text-surface-400 text-xs tabular-nums">
                                                {new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="font-extrabold text-end tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(amount)}</td>
                                            <td className="text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border-2 tracking-tighter ${getStatusColor(item.status)}`}>
                                                    {item.status?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="text-end" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handlePrint(item)} className="p-2 hover:bg-white/10 rounded-lg text-surface-400 hover:text-white transition-all shadow-sm" title={s.printInvoice}>
                                                        🖨️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination Placeholder */}
            {!loading && filteredData.length > 0 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-xs text-surface-500">
                        {isRTL ? `عرض ${filteredData.length} سجل من إجمالي ${filteredData.length}` : `Showing ${filteredData.length} records`}
                    </p>
                    <div className="flex gap-2">
                        <button className="btn-secondary px-3 py-1 text-xs opacity-50 cursor-not-allowed">Previous</button>
                        <button className="btn-secondary px-3 py-1 text-xs opacity-50 cursor-not-allowed">Next</button>
                    </div>
                </div>
            )}

            {/* Detailed View Modal */}
            {showDetail && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDetail(null)}>
                    <div className="modal-content !max-w-4xl animate-scale-in !bg-surface-950 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent flex justify-between items-start shrink-0">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">
                                    👤
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                        {showDetail.invoice_number || showDetail.return_number || showDetail.quotation_number || showDetail.so_number || showDetail.shipping_number}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(showDetail.status)}`}>
                                            {showDetail.status?.toUpperCase()}
                                        </span>
                                        <span className="text-surface-500 text-[10px] uppercase font-bold tracking-widest leading-none flex items-center gap-1">
                                            • BY: <span className="text-indigo-400">{showDetail.creator?.name || 'ADMIN'}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowDetail(null)} className="btn-icon p-2 hover:bg-white/10 transition-colors">✕</button>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-8 space-y-10">
                            {/* Same content as before but with employee focus if needed */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-surface-500 uppercase font-black tracking-tighter">{s.customer}</p>
                                    <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{showDetail.customer?.name || showDetail.sales_invoice?.customer?.name || 'Walk-in'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-surface-500 uppercase font-black tracking-tighter">{c.date}</p>
                                    <p className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{new Date(showDetail.invoice_date || showDetail.created_at || showDetail.issue_date).toLocaleDateString(locale)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-surface-500 uppercase font-black tracking-tighter">{isRTL ? 'المستودع' : 'Warehouse'}</p>
                                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{showDetail.warehouse?.name || (isRTL ? 'الرئيسي' : 'Main')}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-surface-500 uppercase font-black tracking-tighter">{isRTL ? 'البائع / الكاشير' : 'Salesperson / Cashier'}</p>
                                    <span className="px-2 py-1 rounded bg-indigo-500/10 text-xs text-indigo-400 font-bold uppercase tracking-widest">{showDetail.creator?.name || 'System Admin'}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-surface-300 uppercase tracking-[0.2em] flex items-center gap-4">
                                    {isRTL ? 'بنود المستند' : 'Document Line Items'}
                                    <span className="flex-1 h-px bg-white/5"></span>
                                </h3>
                                
                                {fetchingDetail ? (
                                    <div className="py-20 text-center text-surface-500 animate-pulse">{c.loading}</div>
                                ) : (
                                    <div className="bg-surface-900/40 rounded-2xl border border-white/5 overflow-hidden">
                                        <table className="w-full text-sm text-start border-collapse">
                                            <thead className="bg-white/5">
                                                <tr className="text-surface-500 font-bold text-[10px] uppercase">
                                                    <th className="p-4 text-start">{s.product}</th>
                                                    <th className="p-4 text-center">{s.quantity}</th>
                                                    <th className="p-4 text-center">{s.unitPrice}</th>
                                                    <th className="p-4 text-end">{s.itemTotal}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {(detailedData?.items || []).map((item: any, idx: number) => (
                                                    <tr key={idx} className="group hover:bg-white/5 transition-colors">
                                                        <td className="p-4">
                                                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? item.product?.name_ar || item.product?.name : item.product?.name}</p>
                                                            <p className="text-[10px] font-mono text-surface-500 uppercase">{item.product?.code}</p>
                                                        </td>
                                                        <td className="p-4 text-center font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{item.quantity} {item.product?.unit}</td>
                                                        <td className="p-4 text-center font-mono text-surface-400">{formatCurrency(item.unit_price)}</td>
                                                        <td className="p-4 text-end font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.total_price || (item.unit_price * item.quantity))}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 pt-6 border-t border-white/5">
                                <div className="flex-1 space-y-4">
                                    <div className="p-4 rounded-2xl bg-surface-900/50 border border-white/5 space-y-3">
                                        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest leading-none">{c.notes}</p>
                                        <p className="text-sm italic text-surface-300">
                                            {showDetail.notes || (isRTL ? 'لا توجد ملاحظات إضافية' : 'No extra notes provided')}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full md:w-72 space-y-3 p-6 rounded-3xl bg-indigo-600/10 border border-indigo-500/20">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-surface-400">{s.subtotal}</span>
                                        <span className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(showDetail.total || showDetail.shipping_cost || 0) * 0.85)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-surface-400">{s.taxEnabled} (15%)</span>
                                        <span className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(showDetail.total || showDetail.shipping_cost || 0) * 0.15)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-white/10 group">
                                        <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>{c.total}</span>
                                        <span className="text-2xl font-black text-indigo-400 tracking-tight tabular-nums">{formatCurrency(Number(showDetail.total || showDetail.shipping_cost || 0))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-surface-950 flex flex-wrap gap-3">
                            <button onClick={() => handlePrint(showDetail)} className="btn-secondary flex-1 flex items-center justify-center gap-3 py-4 text-sm font-bold">
                                <span className="text-xl">🖨️</span>
                                {isRTL ? 'طباعة المستند' : 'Print Document'}
                            </button>
                            
                            {activeTab === 'quotations' && showDetail.status !== 'accepted' && (
                                <button onClick={() => { setQuotationToConvert(showDetail); setShowSalesOrderModal(true); setShowDetail(null); }} className="btn-primary flex-1 flex items-center justify-center gap-3 py-4 text-sm font-bold bg-indigo-600">
                                    <span className="text-xl">📦</span>
                                    {isRTL ? 'تحويل إلى أمر بيع' : 'Convert to Sales Order'}
                                </button>
                            )}

                            {activeTab === 'orders' && showDetail.status === 'approved' && (
                                <button onClick={async () => {
                                    try {
                                        await salesApi.fulfillSalesOrder(showDetail.id);
                                        fetchData();
                                        setShowDetail(null);
                                    } catch (e) {
                                        alert(isRTL ? 'فشل التوصيل، تأكد من توفر المخزون' : 'Fulfillment failed, check stock');
                                    }
                                }} className="btn-primary flex-1 flex items-center justify-center gap-3 py-4 text-sm font-bold bg-green-600">
                                    <span className="text-xl">🚚</span>
                                    {isRTL ? 'توصيل وإنشاء فاتورة' : 'Fulfill & Invoice'}
                                </button>
                            )}

                            {activeTab === 'orders' && showDetail.status === 'approved' && (
                                <button onClick={async () => {
                                    if(confirm(isRTL ? 'تأكيد الإلغاء؟' : 'Confirm Cancellation?')) {
                                        try {
                                            await salesApi.cancelSalesOrder(showDetail.id);
                                            fetchData();
                                            setShowDetail(null);
                                        } catch (e) {
                                            alert('Failed to cancel');
                                        }
                                    }
                                }} className="btn-secondary flex-1 flex items-center justify-center gap-3 py-4 text-sm font-bold text-red-400 hover:text-red-300">
                                    <span className="text-xl">❌</span>
                                    {isRTL ? 'إلغاء الأمر' : 'Cancel Order'}
                                </button>
                            )}

                            <button onClick={() => setShowDetail(null)} className="btn-secondary px-8 py-4 font-bold">{c.close}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Template Placeholder */}
            {printingInvoice && (
                <InvoicePrintTemplate 
                    invoice={printingInvoice} 
                    locale={locale} 
                    onClose={() => setPrintingInvoice(null)} 
                />
            )}

            {showSalesOrderModal && (
                <SalesOrderModal
                    dict={dict}
                    locale={locale}
                    onClose={() => {
                        setShowSalesOrderModal(false);
                        setQuotationToConvert(null);
                        fetchData();
                    }}
                    quotation={quotationToConvert}
                />
            )}
        </div>
    );
}
