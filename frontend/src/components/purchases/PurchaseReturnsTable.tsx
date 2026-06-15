import React, { memo } from 'react';

interface PurchaseReturnsTableProps {
    isRTL: boolean;
    tc: any;
    filteredReturns: any[];
    searchReturn: string;
    setSearchReturn: (v: string) => void;
    setSelectedReturn: (order: any) => void;
    statusConfig: any;
    getStatusLabel: (st: string) => string;
    formatCurrency: (amount: number) => string;
}

const PurchaseReturnsTable = memo(function PurchaseReturnsTable({
    isRTL, tc, filteredReturns, searchReturn, setSearchReturn, setSelectedReturn,
    statusConfig, getStatusLabel, formatCurrency
}: PurchaseReturnsTableProps) {
    return (
        <>
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[250px] max-w-sm">
                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-surface-400">🔍</span>
                    <input
                        type="text"
                        placeholder={isRTL ? "بحث رقم أو مورد..." : "Search..."}
                        className="input-field ps-10 w-full"
                        value={searchReturn}
                        onChange={e => setSearchReturn(e.target.value)}
                    />
                </div>
            </div>
            
            {filteredReturns.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center py-16 px-4 text-center">
                    <span className="text-5xl mb-4 opacity-50">↩️</span>
                    <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300 mb-1">{isRTL ? 'لا توجد مرتجعات' : 'No returns found'}</h3>
                    <p className="text-surface-500 max-w-sm">{isRTL ? 'لم يتم العثور على أي مرتجعات مشتريات تطابق بحثك.' : 'No purchase returns matched your criteria.'}</p>
                </div>
            ) : (
                <div className="glass-card overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{isRTL ? 'رقم المرتجع' : 'Return #'}</th>
                                <th>{isRTL ? 'الفاتورة الأصلية' : 'Orig. Invoice'}</th>
                                <th>{isRTL ? 'المورد' : 'Supplier'}</th>
                                <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                <th>{isRTL ? 'الإجمالي' : 'Total'}</th>
                                <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                <th className="text-center">{tc.actions || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReturns.map(ret => (
                                <tr key={ret.id} className="cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors" onClick={() => setSelectedReturn(ret)}>
                                    <td className="text-primary-600 dark:text-primary-400 font-bold font-mono">{ret.number}</td>
                                    <td className="text-surface-500 font-mono text-xs">{ret.purchaseInvoice?.number || '-'}</td>
                                    <td className="font-medium text-surface-900 dark:text-surface-100">{ret.supplier?.name}</td>
                                    <td className="text-surface-500 font-medium">{ret.issue_date}</td>
                                    <td className="font-bold text-surface-900 dark:text-white">{formatCurrency(ret.total_amount)}</td>
                                    <td>
                                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold border" style={{ background: statusConfig[ret.status]?.bg, color: statusConfig[ret.status]?.color, borderColor: statusConfig[ret.status]?.color + '40' }}>
                                            {getStatusLabel(ret.status)}
                                        </span>
                                    </td>
                                    <td className="text-center" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => setSelectedReturn(ret)} className="btn-icon w-8 h-8 flex items-center justify-center text-primary-500 hover:text-primary-600 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 rounded-lg mx-auto transition-all" title={isRTL ? 'عرض المرتجع' : 'View Return'}>
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

export default PurchaseReturnsTable;