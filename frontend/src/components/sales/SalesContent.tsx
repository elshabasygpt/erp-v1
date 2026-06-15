'use client';

import { useSalesFilters } from './hooks/useSalesFilters';
import { useSalesData } from './hooks/useSalesData';
import { useSalesActions } from './hooks/useSalesActions';
import SalesHeader from './SalesHeader';
import SalesStats from './SalesStats';
import SalesFilters from './SalesFilters';
import SalesTable from './SalesTable';
import SalesCharts from './SalesCharts';
import SalesModals from './SalesModals';
import { exportTableToPDF, exportDetailedReportToPDF } from '@/lib/pdf-export';
import { useRef } from 'react';

interface SalesContentProps {
    dict: any;
    locale: string;
    initialTab?: 'invoices' | 'returns' | 'quotations' | 'orders' | 'shipping';
}

export default function SalesContent({ dict, locale, initialTab = 'invoices' }: SalesContentProps) {
    const isRTL = locale === 'ar';
    const s = dict.sales;

    const filters = useSalesFilters(initialTab);
    const {
        data, filteredData, loading, stats, warehouses, employees, sellerInfo, employeeDistribution, refetch
    } = useSalesData(filters, locale);

    const actions = useSalesActions(filters.activeTab, sellerInfo, locale);
    
    const exportMenuRef = useRef<HTMLDivElement>(null);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(val || 0);

    const handleExportPDF = () => {
        const title = isRTL 
            ? (filters.activeTab === 'invoices' ? 'تقرير فواتير المبيعات' : filters.activeTab === 'returns' ? 'تقرير المرتجعات' : filters.activeTab === 'quotations' ? 'تقرير عروض الأسعار' : filters.activeTab === 'orders' ? 'تقرير أوامر البيع' : 'تقرير الشحن')
            : (filters.activeTab === 'invoices' ? 'Sales Invoices Report' : filters.activeTab === 'returns' ? 'Returns Report' : filters.activeTab === 'quotations' ? 'Quotations Report' : filters.activeTab === 'orders' ? 'Sales Orders Report' : 'Shipping Report');
        
        const subtitle = isRTL 
            ? `الفترة: ${filters.dateFrom || '---'} إلى ${filters.dateTo || '---'}` 
            : `Period: ${filters.dateFrom || '---'} to ${filters.dateTo || '---'}`;

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

        const summaryCards = filters.activeTab === 'invoices' ? [
            { label: s.todaySales, value: formatCurrency(stats.todaySales) },
            { label: s.avgInvoiceValue, value: formatCurrency(stats.avgInvoice) },
            { label: dict.zatca.vatAmount, value: formatCurrency(stats.totalTax) },
            { label: dict.dashboard.pendingAmount, value: formatCurrency(stats.pendingAmount) },
        ] : undefined;

        exportTableToPDF(title, subtitle, headers, rows, summaryCards, isRTL);
        filters.setShowExportMenu(false);
    };

    const handleExportDetailedPDF = () => {
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
            ? (filters.activeTab === 'invoices' ? 'التقرير الإداري الشامل للمبيعات' : filters.activeTab === 'returns' ? 'تقرير المرتجعات الإداري' : filters.activeTab === 'quotations' ? 'تقرير العروض الإداري' : filters.activeTab === 'orders' ? 'تقرير أوامر البيع الإداري' : 'تقرير الشحن الإداري')
            : (filters.activeTab === 'invoices' ? 'Comprehensive Managerial Sales Report' : filters.activeTab === 'returns' ? 'Managerial Returns Report' : filters.activeTab === 'quotations' ? 'Managerial Quotations Report' : filters.activeTab === 'orders' ? 'Managerial Sales Orders Report' : 'Managerial Shipping Report');
        
        const subtitle = isRTL ? `الفترة: ${filters.dateFrom || '---'} إلى ${filters.dateTo || '---'}` : `Period: ${filters.dateFrom || '---'} to ${filters.dateTo || '---'}`;

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
        filters.setShowExportMenu(false);
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
        filters.setShowExportMenu(false);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <SalesHeader 
                isRTL={isRTL} dict={dict} showExportMenu={filters.showExportMenu} 
                setShowExportMenu={filters.setShowExportMenu} exportMenuRef={exportMenuRef}
                handleExportPDF={handleExportPDF} handleExportDetailedPDF={handleExportDetailedPDF}
                handleExportCSV={handleExportCSV} setShowModal={actions.setShowModal}
            />

            <SalesStats 
                stats={stats} filteredDataLength={filteredData.length} 
                dict={dict} formatCurrency={formatCurrency} 
            />

            <SalesCharts 
                isRTL={isRTL} showChart={filters.showChart} activeTab={filters.activeTab} 
                stats={stats} employeeDistribution={employeeDistribution} formatCurrency={formatCurrency} 
            />

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between bg-surface-900/50 p-1 rounded-2xl border border-white/5">
                <div className="flex flex-1 gap-1">
                    {['invoices', 'returns', 'quotations', 'orders', 'shipping'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => filters.setActiveTab(tab as any)}
                            className={`
                                flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-500
                                ${filters.activeTab === tab ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-[1.02]' : 'text-surface-400 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            {isRTL 
                                ? (tab === 'invoices' ? 'الفواتير' : tab === 'returns' ? 'المرتجعات' : tab === 'quotations' ? 'العروض' : tab === 'orders' ? 'أوامر البيع' : 'الشحن')
                                : (tab === 'invoices' ? 'Invoices' : tab === 'returns' ? 'Returns' : tab === 'quotations' ? 'Quotations' : tab === 'orders' ? 'Sales Orders' : 'Shipping')}
                        </button>
                    ))}
                </div>
            </div>

            <SalesFilters 
                isRTL={isRTL} dict={dict} showFilters={filters.showFilters} setShowFilters={filters.setShowFilters}
                search={filters.search} setSearch={filters.setSearch} employeeFilter={filters.employeeFilter}
                setEmployeeFilter={filters.setEmployeeFilter} employees={employees} dateFrom={filters.dateFrom}
                setDateFrom={filters.setDateFrom} dateTo={filters.dateTo} setDateTo={filters.setDateTo}
                statusFilter={filters.statusFilter} setStatusFilter={filters.setStatusFilter}
            />

            <SalesTable 
                isRTL={isRTL} dict={dict} locale={locale} loading={loading} 
                filteredData={filteredData} formatCurrency={formatCurrency} 
                handleViewDetail={actions.handleViewDetail} handlePrint={actions.handlePrint} 
            />

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

            <SalesModals 
                isRTL={isRTL} dict={dict} locale={locale} showModal={actions.showModal} 
                setShowModal={actions.setShowModal} showSalesOrderModal={actions.showSalesOrderModal}
                setShowSalesOrderModal={actions.setShowSalesOrderModal} showDetail={actions.showDetail}
                setShowDetail={actions.setShowDetail} detailedData={actions.detailedData}
                fetchingDetail={actions.fetchingDetail} printingInvoice={actions.printingInvoice}
                setPrintingInvoice={actions.setPrintingInvoice} quotationToConvert={actions.quotationToConvert} setQuotationToConvert={actions.setQuotationToConvert} warehouses={warehouses} refetch={refetch}
                activeTab={filters.activeTab} formatCurrency={formatCurrency}
            />
        </div>
    );
}