<?php
$dir = __DIR__ . '/src/components/sales';

$SalesModals = <<<EOT
import React, { memo } from 'react';
import POSInvoiceModal from './POSInvoiceModal';
import SalesReturnModal from './SalesReturnModal';
import QuotationModal from './QuotationModal';
import SalesOrderModal from './SalesOrderModal';
import ShippingModal from './ShippingModal';
import InvoicePrintTemplate from './InvoicePrintTemplate';

interface SalesModalsProps {
    isRTL: boolean;
    dict: any;
    locale: string;
    showModal: boolean;
    setShowModal: (v: boolean) => void;
    showSalesOrderModal: boolean;
    setShowSalesOrderModal: (v: boolean) => void;
    showDetail: any;
    setShowDetail: (v: any) => void;
    detailedData: any;
    fetchingDetail: boolean;
    printingInvoice: any;
    setPrintingInvoice: (v: any) => void;
    warehouses: any[];
    refetch: () => void;
    activeTab: string;
    formatCurrency: (v: number) => string;
}

const SalesModals = memo(function SalesModals({
    isRTL, dict, locale, showModal, setShowModal, showSalesOrderModal, setShowSalesOrderModal,
    showDetail, setShowDetail, detailedData, fetchingDetail, printingInvoice, setPrintingInvoice,
    warehouses, refetch, activeTab, formatCurrency
}: SalesModalsProps) {
    const s = dict.sales;

    return (
        <>
            {showDetail && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDetail(null)}>
                    <div className="modal-content !max-w-4xl animate-scale-in !bg-surface-950 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent flex justify-between items-start shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl border border-indigo-500/30">
                                    📄
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        {isRTL ? 'تفاصيل المستند' : 'Document Details'}
                                        <span className="text-indigo-400 font-mono text-lg">
                                            #{showDetail.invoice_number || showDetail.return_number || showDetail.quotation_number || showDetail.so_number || showDetail.shipping_number}
                                        </span>
                                    </h2>
                                    <p className="text-surface-400 text-sm mt-1 flex items-center gap-2">
                                        📅 {new Date(showDetail.invoice_date || showDetail.return_date || showDetail.issue_date || showDetail.created_at).toLocaleDateString(locale, { dateStyle: 'full' })}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                ❌
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {fetchingDetail ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                                    <p className="text-surface-400 animate-pulse">{isRTL ? 'جاري جلب التفاصيل...' : 'Fetching details...'}</p>
                                </div>
                            ) : detailedData ? (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="glass-card p-5 space-y-4">
                                            <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest border-b border-white/5 pb-2">
                                                {isRTL ? 'معلومات العميل' : 'Customer Info'}
                                            </h3>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center text-lg">👤</div>
                                                <div>
                                                    <p className="font-bold text-white text-lg">{detailedData.customer?.name || detailedData.sales_invoice?.customer?.name || 'Walk-in Customer'}</p>
                                                    <p className="text-sm text-surface-400">{detailedData.customer?.phone || detailedData.sales_invoice?.customer?.phone || '---'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="glass-card p-5 space-y-4">
                                            <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest border-b border-white/5 pb-2">
                                                {isRTL ? 'معلومات المستند' : 'Document Info'}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-surface-500">{isRTL ? 'الحالة' : 'Status'}</p>
                                                    <p className="font-bold text-white uppercase">{detailedData.status}</p>
                                                </div>
                                                <div>
                                                    <p className="text-surface-500">{isRTL ? 'البائع' : 'Seller'}</p>
                                                    <p className="font-bold text-white">{detailedData.creator?.name || 'Admin'}</p>
                                                </div>
                                                {detailedData.payment_method && (
                                                    <div className="col-span-2">
                                                        <p className="text-surface-500">{isRTL ? 'طريقة الدفع' : 'Payment Method'}</p>
                                                        <p className="font-bold text-white capitalize">{detailedData.payment_method}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="glass-card overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-surface-800/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-start font-medium text-surface-300">{isRTL ? 'المنتج' : 'Product'}</th>
                                                    <th className="px-4 py-3 text-center font-medium text-surface-300">{isRTL ? 'الكمية' : 'Qty'}</th>
                                                    <th className="px-4 py-3 text-end font-medium text-surface-300">{isRTL ? 'السعر' : 'Price'}</th>
                                                    <th className="px-4 py-3 text-end font-medium text-surface-300">{isRTL ? 'الإجمالي' : 'Total'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {(detailedData.items || []).map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-white/5">
                                                        <td className="px-4 py-3 text-white font-medium">
                                                            {isRTL ? (item.product?.name_ar || item.product?.name) : item.product?.name}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-surface-300">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-end text-surface-300">{formatCurrency(item.unit_price)}</td>
                                                        <td className="px-4 py-3 text-end font-bold text-indigo-400">{formatCurrency(item.subtotal || (item.quantity * item.unit_price))}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-surface-800/30 p-4 border-t border-white/5 flex justify-end">
                                            <div className="w-full max-w-xs space-y-2">
                                                <div className="flex justify-between text-sm text-surface-400">
                                                    <span>{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                                                    <span>{formatCurrency(detailedData.subtotal || detailedData.total)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-surface-400">
                                                    <span>{isRTL ? 'الضريبة' : 'Tax'}</span>
                                                    <span>{formatCurrency(detailedData.tax_amount || 0)}</span>
                                                </div>
                                                <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10">
                                                    <span>{isRTL ? 'الإجمالي النهائي' : 'Grand Total'}</span>
                                                    <span className="text-indigo-400">{formatCurrency(detailedData.total || detailedData.shipping_cost)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-red-400">{isRTL ? 'فشل تحميل التفاصيل' : 'Failed to load details'}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Print Template Overlay */}
            {printingInvoice && (
                <div className="fixed inset-0 z-50 bg-white overflow-auto flex justify-center">
                    <div className="w-full max-w-[800px] bg-white text-black min-h-screen relative p-8">
                        <div className="absolute top-4 right-4 print:hidden flex gap-2">
                            <button onClick={() => window.print()} className="btn-primary px-4 py-2 text-sm shadow-lg">🖨️ {isRTL ? 'طباعة الآن' : 'Print Now'}</button>
                            <button onClick={() => setPrintingInvoice(null)} className="btn-secondary px-4 py-2 text-sm shadow-lg border border-gray-300 !text-gray-700">❌ {isRTL ? 'إغلاق' : 'Close'}</button>
                        </div>
                        <InvoicePrintTemplate 
                            invoice={printingInvoice}
                            isRTL={isRTL}
                        />
                    </div>
                </div>
            )}

            {/* Creation Modals */}
            {showModal && activeTab === 'invoices' && (
                <POSInvoiceModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    isRTL={isRTL}
                    dict={dict}
                    onSuccess={() => {
                        setShowModal(false);
                        refetch();
                    }}
                />
            )}

            {showModal && activeTab === 'returns' && (
                <SalesReturnModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    isRTL={isRTL}
                    dict={dict}
                    onSuccess={() => {
                        setShowModal(false);
                        refetch();
                    }}
                    warehouses={warehouses}
                />
            )}

            {showModal && activeTab === 'quotations' && (
                <QuotationModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    isRTL={isRTL}
                    dict={dict}
                    onSuccess={() => {
                        setShowModal(false);
                        refetch();
                    }}
                />
            )}

            {showSalesOrderModal && (
                <SalesOrderModal
                    isOpen={showSalesOrderModal}
                    onClose={() => {
                        setShowSalesOrderModal(false);
                        setQuotationToConvert(null);
                    }}
                    isRTL={isRTL}
                    dict={dict}
                    onSuccess={() => {
                        setShowSalesOrderModal(false);
                        refetch();
                    }}
                    quotation={quotationToConvert}
                />
            )}

            {showModal && activeTab === 'shipping' && (
                <ShippingModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    isRTL={isRTL}
                    dict={dict}
                    onSuccess={() => {
                        setShowModal(false);
                        refetch();
                    }}
                />
            )}
        </>
    );
});

export default SalesModals;
EOT;
file_put_contents("$dir/SalesModals.tsx", $SalesModals);

$SalesContent = <<<EOT
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
            ? `الفترة: \${filters.dateFrom || '---'} إلى \${filters.dateTo || '---'}` 
            : `Period: \${filters.dateFrom || '---'} to \${filters.dateTo || '---'}`;

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
        
        const subtitle = isRTL ? `الفترة: \${filters.dateFrom || '---'} إلى \${filters.dateTo || '---'}` : `Period: \${filters.dateFrom || '---'} to \${filters.dateTo || '---'}`;

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
                            `\${marginPercent.toFixed(1)}%`
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

        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\\n" + rows.map(r => r.join(",")).join("\\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_report_\${new Date().toISOString().split('T')[0]}.csv`);
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
                                \${filters.activeTab === tab ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-[1.02]' : 'text-surface-400 hover:text-white hover:bg-white/5'}
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
                        {isRTL ? `عرض \${filteredData.length} سجل من إجمالي \${filteredData.length}` : `Showing \${filteredData.length} records`}
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
                setPrintingInvoice={actions.setPrintingInvoice} warehouses={warehouses} refetch={refetch}
                activeTab={filters.activeTab} formatCurrency={formatCurrency}
            />
        </div>
    );
}
EOT;
file_put_contents("$dir/SalesContent.tsx", $SalesContent);

?>
