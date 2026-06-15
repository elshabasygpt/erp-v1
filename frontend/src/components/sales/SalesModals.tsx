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
    quotationToConvert: any;
    setQuotationToConvert: (v: any) => void;
    refetch: () => void;
    warehouses: any[];
    activeTab: string;
    formatCurrency: (v: number) => string;
}

const SalesModals = memo(function SalesModals({
    isRTL, dict, locale, showModal, setShowModal, showSalesOrderModal, setShowSalesOrderModal,
    showDetail, setShowDetail, detailedData, fetchingDetail, printingInvoice, setPrintingInvoice,
    quotationToConvert, setQuotationToConvert, refetch, activeTab, formatCurrency
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
                            locale={locale}
                            onClose={() => setPrintingInvoice(null)}
                        />
                    </div>
                </div>
            )}

            {/* Creation Modals */}
            {showModal && activeTab === 'invoices' && (
                <POSInvoiceModal
                    dict={dict}
                    locale={locale}
                    onClose={() => {
                        setShowModal(false);
                        refetch();
                    }}
                />
            )}

            {showModal && activeTab === 'returns' && (
                <SalesReturnModal
                    dict={dict}
                    locale={locale}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        refetch();
                    }}
                />
            )}

            {showModal && activeTab === 'quotations' && (
                <QuotationModal dict={dict} locale={locale} onClose={() => { setShowModal(false); refetch(); }} />
            )}

            {showSalesOrderModal && (
                <SalesOrderModal dict={dict} locale={locale} onClose={() => { setShowSalesOrderModal(false); setQuotationToConvert(null); refetch(); }} quotation={quotationToConvert} />
            )}

            {showModal && activeTab === 'shipping' && (
                <ShippingModal dict={dict} locale={locale} onClose={() => { setShowModal(false); refetch(); }} />
            )}
        </>
    );
});

export default SalesModals;