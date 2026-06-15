import React, { memo } from 'react';

interface SalesTableProps {
    isRTL: boolean;
    dict: any;
    locale: string;
    loading: boolean;
    filteredData: any[];
    formatCurrency: (v: number) => string;
    handleViewDetail: (item: any) => void;
    handlePrint: (item: any) => void;
}

const SalesTable = memo(function SalesTable({
    isRTL, dict, locale, loading, filteredData, formatCurrency, handleViewDetail, handlePrint
}: SalesTableProps) {
    const s = dict.sales;
    const c = dict.common;

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': case 'completed': case 'delivered': case 'accepted': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'draft': case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'cancelled': case 'rejected': case 'returned': case 'expired': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'sent': case 'shipped': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
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
    );
});

export default SalesTable;