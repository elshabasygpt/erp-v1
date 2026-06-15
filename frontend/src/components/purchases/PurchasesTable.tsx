import React, { memo } from 'react';

interface PurchasesTableProps {
    isRTL: boolean;
    tc: any;
    filteredInvoices: any[];
    searchInvoice: string;
    setSearchInvoice: (v: string) => void;
    statusFilter: string;
    setStatusFilter: (v: string) => void;
    setSelectedOrder: (order: any) => void;
    statusConfig: any;
    getStatusLabel: (st: string) => string;
    formatCurrency: (amount: number) => string;
}

const PurchasesTable = memo(function PurchasesTable({
    isRTL, tc, filteredInvoices, searchInvoice, setSearchInvoice, statusFilter, setStatusFilter,
    setSelectedOrder, statusConfig, getStatusLabel, formatCurrency
}: PurchasesTableProps) {
    return (
        <>
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[250px] max-w-sm">
                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-surface-400">🔍</span>
                    <input
                        type="text"
                        placeholder={isRTL ? "بحث برقم الفاتورة أو المورد..." : "Search by invoice or supplier..."}
                        className="input-field ps-10 w-full"
                        value={searchInvoice}
                        onChange={e => setSearchInvoice(e.target.value)}
                    />
                </div>
                <select className="select-field w-auto min-w-[150px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                    <option value="draft">{isRTL ? 'مسودة' : 'Draft'}</option>
                    <option value="confirmed">{isRTL ? 'مؤكد/مستلم' : 'Confirmed'}</option>
                </select>
            </div>
            
            {filteredInvoices.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center py-16 px-4 text-center">
                    <span className="text-5xl mb-4 opacity-50">🛒</span>
                    <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300 mb-1">{isRTL ? 'لا توجد فواتير' : 'No invoices found'}</h3>
                    <p className="text-surface-500 max-w-sm">{isRTL ? 'لم يتم العثور على أي فواتير مشتريات تطابق بحثك. يمكنك إضافة فاتورة جديدة.' : 'No purchase invoices matched your criteria. You can create a new invoice.'}</p>
                </div>
            ) : (
                <div className="glass-card overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{isRTL ? 'الرقم' : 'Number'}</th>
                                <th>{isRTL ? 'المورد' : 'Supplier'}</th>
                                <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                <th>{isRTL ? 'الإجمالي' : 'Total'}</th>
                                <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                <th className="text-center">{tc.actions || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.map(inv => (
                                <tr key={inv.id} className="cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors" onClick={() => setSelectedOrder(inv)}>
                                    <td className="text-primary-600 dark:text-primary-400 font-bold font-mono">{inv.invoice_number}</td>
                                    <td className="font-medium text-surface-900 dark:text-surface-100">{inv.supplier?.name}</td>
                                    <td className="text-surface-500 font-medium">{inv.invoice_date?.split('T')[0]}</td>
                                    <td className="font-bold text-surface-900 dark:text-white">{formatCurrency(inv.total)}</td>
                                    <td>
                                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold border" style={{ background: statusConfig[inv.status]?.bg, color: statusConfig[inv.status]?.color, borderColor: statusConfig[inv.status]?.color + '40' }}>
                                            {getStatusLabel(inv.status)}
                                        </span>
                                    </td>
                                    <td className="text-center" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => setSelectedOrder(inv)} className="btn-icon w-8 h-8 flex items-center justify-center text-primary-500 hover:text-primary-600 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 rounded-lg mx-auto transition-all" title={isRTL ? 'عرض الفاتورة' : 'View Invoice'}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
});

export default PurchasesTable;