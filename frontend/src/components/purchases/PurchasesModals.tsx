import React, { memo, useState } from 'react';
import PriceCompareModal from './PriceCompareModal';

interface PurchasesModalsProps {
    isRTL: boolean;
    suppliers: any[];
    warehouses: any[];
    products: any[];
    invoices: any[];
    showOrderModal: boolean;
    setShowOrderModal: (v: boolean) => void;
    selectedOrder: any;
    setSelectedOrder: (v: any) => void;
    newOrder: any;
    setNewOrder: (v: any) => void;
    handleSaveOrder: (status: string) => void;
    openEditOrder: (order: any) => void;
    handleUpdateOrderStatus: (id: string, status: string, warehouse_id?: string) => void;
    showReturnModal: boolean;
    setShowReturnModal: (v: boolean) => void;
    selectedReturn: any;
    setSelectedReturn: (v: any) => void;
    newReturn: any;
    setNewReturn: (v: any) => void;
    handleSaveReturn: (status: string) => void;
    handleCompleteReturn: (id: string, warehouse_id: string) => void;
    statusConfig: any;
    getStatusLabel: (st: string) => string;
    formatCurrency: (amount: number) => string;
}

const PurchasesModals = memo(function PurchasesModals({
    isRTL, suppliers, warehouses, products, invoices,
    showOrderModal, setShowOrderModal, selectedOrder, setSelectedOrder,
    newOrder, setNewOrder, handleSaveOrder, openEditOrder, handleUpdateOrderStatus,
    showReturnModal, setShowReturnModal, selectedReturn, setSelectedReturn,
    newReturn, setNewReturn, handleSaveReturn, handleCompleteReturn,
    statusConfig, getStatusLabel, formatCurrency
}: PurchasesModalsProps) {
    const [comparingProductId, setComparingProductId] = useState<string | null>(null);

    return (
        <>
            {showOrderModal && newOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowOrderModal(false)}>
                    <div className="relative w-full max-w-5xl rounded-3xl overflow-hidden bg-white dark:bg-surface-900 shadow-2xl border border-surface-200 dark:border-surface-800 flex flex-col" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                <span className="text-2xl">{newOrder.id ? '📝' : '📄'}</span>
                                {newOrder.id ? (isRTL ? 'تعديل الفاتورة' : 'Edit Invoice') : (isRTL ? 'فاتورة شراء جديدة' : 'New Purchase Invoice')}
                            </h2>
                            <button onClick={() => setShowOrderModal(false)} className="btn-icon text-surface-400 hover:text-red-500 bg-white dark:bg-surface-800">✕</button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'المورد' : 'Supplier'}</label>
                                    <div className="relative">
                                        <select className="input-field w-full appearance-none" value={newOrder.supplier_id} onChange={e => setNewOrder({...newOrder, supplier_id: e.target.value})}>
                                            <option value="">{isRTL ? 'اختر المورد...' : 'Select Supplier...'}</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'المستودع' : 'Warehouse'}</label>
                                    <select className="input-field w-full" value={newOrder.warehouse_id} onChange={e => setNewOrder({...newOrder, warehouse_id: e.target.value})}>
                                        <option value="">{isRTL ? 'اختر المستودع للتموين' : 'Warehouse for stocking'}</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'طريقة الدفع' : 'Payment Type'}</label>
                                    <select className="input-field w-full" value={newOrder.payment_type} onChange={e => setNewOrder({...newOrder, payment_type: e.target.value})}>
                                        <option value="cash">{isRTL ? 'نقدي' : 'Cash'}</option>
                                        <option value="credit">{isRTL ? 'آجل' : 'Credit'}</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'التاريخ' : 'Date'}</label>
                                    <input type="date" className="input-field w-full" value={newOrder.issue_date} onChange={e => setNewOrder({...newOrder, issue_date: e.target.value})}/>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mb-3 border-b border-surface-200 dark:border-surface-800 pb-2">
                                <h3 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                    <span>📦</span> {isRTL ? 'الأصناف' : 'Items'}
                                </h3>
                                <button onClick={() => setNewOrder({...newOrder, items: [...newOrder.items, {product_id:'', qty:1, unit_price:0, tax_rate:15}]})} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-bold flex items-center gap-1 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg transition-colors">
                                    ➕ {isRTL ? 'إضافة صنف' : 'Add Item'}
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto mb-6 bg-surface-50 dark:bg-surface-800/20 rounded-xl border border-surface-200 dark:border-surface-800">
                                <table className="w-full text-sm text-start">
                                    <thead className="bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-b border-surface-200 dark:border-surface-700">
                                        <tr>
                                            <th className="py-3 px-4 font-bold w-[40%] text-start">{isRTL ? 'الصنف' : 'Product'}</th>
                                            <th className="py-3 px-4 font-bold text-center">{isRTL ? 'الكمية' : 'Qty'}</th>
                                            <th className="py-3 px-4 font-bold text-center">{isRTL ? 'السعر (بدون ضريبة)' : 'Price'}</th>
                                            <th className="py-3 px-4 font-bold text-center">{isRTL ? 'الضريبة%' : 'Tax%'}</th>
                                            <th className="py-3 px-4 font-bold text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
                                            <th className="py-3 px-4 text-center w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                                        {newOrder.items.map((it:any, idx:number) => {
                                            const lineTotal = Number(it.qty) * Number(it.unit_price) * (1 + Number(it.tax_rate) / 100);
                                            return (
                                            <tr key={idx} className="hover:bg-white dark:hover:bg-surface-800/50 transition-colors group">
                                                <td className="py-2 px-3">
                                                    <select className="input-field py-2 w-full bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900" value={it.product_id} onChange={e => {
                                                        const arr = [...newOrder.items]; arr[idx].product_id = e.target.value; setNewOrder({...newOrder, items: arr});
                                                    }}>
                                                        <option value="">{isRTL ? 'اختر منتج...' : 'Select product...'}</option>
                                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                    {it.product_id && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); setComparingProductId(it.product_id); }}
                                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                                            title={isRTL ? 'مقارنة أسعار الموردين' : 'Compare supplier prices'}
                                                        >
                                                            📊 {isRTL ? 'مقارنة الأسعار' : 'Compare prices'}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input type="number" min="1" className="input-field py-2 w-24 text-center bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900 mx-auto" value={it.qty} onChange={e => {
                                                        const arr = [...newOrder.items]; arr[idx].qty = e.target.value; setNewOrder({...newOrder, items: arr});
                                                    }}/>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input type="number" min="0" step="0.01" className="input-field py-2 w-28 text-center bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900 mx-auto" value={it.unit_price} onChange={e => {
                                                        const arr = [...newOrder.items]; arr[idx].unit_price = e.target.value; setNewOrder({...newOrder, items: arr});
                                                    }}/>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input type="number" min="0" step="1" className="input-field py-2 w-20 text-center bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900 mx-auto" value={it.tax_rate} onChange={e => {
                                                        const arr = [...newOrder.items]; arr[idx].tax_rate = e.target.value; setNewOrder({...newOrder, items: arr});
                                                    }}/>
                                                </td>
                                                <td className="py-2 px-4 text-end font-bold text-primary-600 dark:text-primary-400">
                                                    {formatCurrency(lineTotal)}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    {newOrder.items.length > 1 && (
                                                        <button onClick={() => {
                                                            const arr = newOrder.items.filter((_:any, i:number) => i !== idx); setNewOrder({...newOrder, items: arr});
                                                        }} className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">✕</button>
                                                    )}
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Summary Footer */}
                            <div className="flex flex-col items-end gap-1 mb-2">
                                <div className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-4 bg-surface-100 dark:bg-surface-800 px-6 py-3 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
                                    <span>{isRTL ? 'إجمالي الفاتورة المتوقع:' : 'Expected Total:'}</span>
                                    <span className="text-2xl text-primary-600 dark:text-primary-400">
                                        {formatCurrency(newOrder.items.reduce((acc:number, it:any) => acc + (Number(it.qty) * Number(it.unit_price) * (1 + Number(it.tax_rate) / 100)), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex flex-col-reverse sm:flex-row gap-3 justify-between items-center">
                            <button onClick={() => setShowOrderModal(false)} className="w-full sm:w-auto px-6 py-2.5 font-bold text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors">
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <div className="flex w-full sm:w-auto gap-3">
                                <button onClick={() => handleSaveOrder('draft')} className="w-full sm:w-auto px-6 py-2.5 font-bold bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-600 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-600 hover:shadow-sm transition-all shadow-sm">
                                    {isRTL ? 'حفظ كمسودة' : 'Save as Draft'}
                                </button>
                                <button onClick={() => handleSaveOrder('pending')} className="w-full sm:w-auto btn-primary px-8 py-2.5 font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5 transition-all">
                                    {isRTL ? 'تأكيد وحفظ' : 'Confirm & Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedOrder(null)}>
                    <div className="relative w-full max-w-3xl rounded-2xl glass-card p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold">{isRTL ? 'الفاتورة' : 'Invoice'} #{selectedOrder.number}</h2>
                                <p className="text-surface-400 text-sm mt-1">{selectedOrder.supplier?.name} | {selectedOrder.issue_date}</p>
                            </div>
                            <span className="px-3 py-1 rounded text-sm" style={{ background: statusConfig[selectedOrder.status]?.bg, color: statusConfig[selectedOrder.status]?.color }}>
                                {getStatusLabel(selectedOrder.status)}
                            </span>
                        </div>
                        
                        <div className="mb-6 border border-white/5 rounded-xl overflow-hidden">
                            <table className="data-table w-full text-sm">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="py-2 px-4 text-start">{isRTL ? 'الصنف' : 'Item'}</th>
                                        <th className="py-2 px-4">{isRTL ? 'الكمية' : 'Qty'}</th>
                                        <th className="py-2 px-4">{isRTL ? 'السعر' : 'Unit Price'}</th>
                                        <th className="py-2 px-4 text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items?.map((it:any) => (
                                        <tr key={it.id} className="border-t border-white/5">
                                            <td className="py-2 px-4">{it.product?.name || it.product_id}</td>
                                            <td className="py-2 px-4">{Number(it.quantity)}</td>
                                            <td className="py-2 px-4">{formatCurrency(it.unit_price)}</td>
                                            <td className="py-2 px-4 text-end text-primary font-medium">{formatCurrency(it.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-surface-hover rounded-xl p-4 flex flex-col gap-2 mb-6">
                            <div className="flex justify-between text-sm"><span>{isRTL ? 'المدفوع' : 'Paid'}</span><span className="text-emerald-400">{formatCurrency(selectedOrder.paid_amount)}</span></div>
                            <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-2 text-white"><span>{isRTL ? 'الإجمالي' : 'Total'}</span><span>{formatCurrency(selectedOrder.total_amount)}</span></div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                            <button onClick={() => setSelectedOrder(null)} className="px-4 py-2 text-surface-400">{isRTL ? 'إغلاق' : 'Close'}</button>
                            {(selectedOrder.status === 'draft' || selectedOrder.status === 'pending') && (
                                <button onClick={() => openEditOrder(selectedOrder)} className="px-4 py-2 rounded-lg bg-surface-hover text-primary">{isRTL ? 'تعديل الفاتورة' : 'Edit'}</button>
                            )}
                            {selectedOrder.status === 'pending' && (
                                <button onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'received')} className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400">✓ {isRTL ? 'استلام المخزون' : 'Receive Stock'}</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showReturnModal && newReturn && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowReturnModal(false)}>
                    <div className="relative w-full max-w-5xl rounded-3xl overflow-hidden bg-white dark:bg-surface-900 shadow-2xl border border-surface-200 dark:border-surface-800 flex flex-col" onClick={e=>e.stopPropagation()} style={{ maxHeight: '90vh' }}>
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                <span className="text-2xl">↩️</span>
                                {isRTL ? 'تسجيل مرتجع مشتريات' : 'New Purchase Return'}
                            </h2>
                            <button onClick={() => setShowReturnModal(false)} className="btn-icon text-surface-400 hover:text-red-500 bg-white dark:bg-surface-800">✕</button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'المورد' : 'Supplier'}</label>
                                    <select className="input-field w-full" value={newReturn.supplier_id} onChange={e => setNewReturn({...newReturn, supplier_id: e.target.value})}>
                                        <option value="">{isRTL ? 'اختر المورد...' : 'Select Supplier...'}</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'الفاتورة الأصلية (اختياري)' : 'Orig. Invoice'}</label>
                                    <select className="input-field w-full" value={newReturn.purchase_invoice_id} onChange={e => setNewReturn({...newReturn, purchase_invoice_id: e.target.value})}>
                                        <option value="">{isRTL ? 'بدون فاتورة مرتبطة' : 'None'}</option>
                                        {invoices.filter(i => newReturn.supplier_id ? i.supplier_id === newReturn.supplier_id : true).map(i => <option key={i.id} value={i.id}>{i.invoice_number} ({formatCurrency(i.total)})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'سبب الإرجاع / ملاحظات' : 'Reason / Notes'}</label>
                                    <input type="text" className="input-field w-full" value={newReturn.notes} onChange={e => setNewReturn({...newReturn, notes: e.target.value})}/>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-3 border-b border-surface-200 dark:border-surface-800 pb-2">
                                <h3 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                    <span>📦</span> {isRTL ? 'الأصناف المرتجعة' : 'Returned Items'}
                                </h3>
                                <button onClick={() => setNewReturn({...newReturn, items: [...newReturn.items, {product_id:'', qty:1, unit_price:0, tax_rate:15}]})} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-bold flex items-center gap-1 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg transition-colors">
                                    ➕ {isRTL ? 'إضافة صنف' : 'Add Item'}
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto mb-6 bg-surface-50 dark:bg-surface-800/20 rounded-xl border border-surface-200 dark:border-surface-800">
                                <table className="w-full text-sm text-start">
                                    <thead className="bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-b border-surface-200 dark:border-surface-700">
                                        <tr>
                                            <th className="py-3 px-4 font-bold w-[40%] text-start">{isRTL ? 'الصنف' : 'Product'}</th>
                                            <th className="py-3 px-4 font-bold text-center">{isRTL ? 'الكمية' : 'Qty'}</th>
                                            <th className="py-3 px-4 font-bold text-center">{isRTL ? 'سعر الإرجاع' : 'Return Price'}</th>
                                            <th className="py-3 px-4 font-bold text-center">{isRTL ? 'الضريبة%' : 'Tax%'}</th>
                                            <th className="py-3 px-4 font-bold text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
                                            <th className="py-3 px-4 text-center w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                                        {newReturn.items.map((it:any, idx:number) => {
                                            const lineTotal = Number(it.qty) * Number(it.unit_price) * (1 + Number(it.tax_rate) / 100);
                                            return (
                                            <tr key={idx} className="hover:bg-white dark:hover:bg-surface-800/50 transition-colors group">
                                                <td className="py-2 px-3">
                                                    <select className="input-field py-2 w-full bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900" value={it.product_id} onChange={e => {
                                                        const arr = [...newReturn.items]; arr[idx].product_id = e.target.value; setNewReturn({...newReturn, items: arr});
                                                    }}>
                                                        <option value="">{isRTL ? 'اختر منتج...' : 'Select product...'}</option>
                                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input type="number" min="1" className="input-field py-2 w-24 text-center bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900 mx-auto" value={it.qty} onChange={e => {
                                                        const arr = [...newReturn.items]; arr[idx].qty = e.target.value; setNewReturn({...newReturn, items: arr});
                                                    }}/>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input type="number" min="0" step="0.01" className="input-field py-2 w-28 text-center bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900 mx-auto" value={it.unit_price} onChange={e => {
                                                        const arr = [...newReturn.items]; arr[idx].unit_price = e.target.value; setNewReturn({...newReturn, items: arr});
                                                    }}/>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input type="number" min="0" step="1" className="input-field py-2 w-20 text-center bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900 mx-auto" value={it.tax_rate} onChange={e => {
                                                        const arr = [...newReturn.items]; arr[idx].tax_rate = e.target.value; setNewReturn({...newReturn, items: arr});
                                                    }}/>
                                                </td>
                                                <td className="py-2 px-4 text-end font-bold text-primary-600 dark:text-primary-400">
                                                    {formatCurrency(lineTotal)}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    {newReturn.items.length > 1 && (
                                                        <button onClick={() => {
                                                            const arr = newReturn.items.filter((_:any, i:number) => i !== idx); setNewReturn({...newReturn, items: arr});
                                                        }} className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">✕</button>
                                                    )}
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 mb-2">
                                <div className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-4 bg-surface-100 dark:bg-surface-800 px-6 py-3 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
                                    <span>{isRTL ? 'إجمالي المرتجع المتوقع:' : 'Expected Return Total:'}</span>
                                    <span className="text-2xl text-primary-600 dark:text-primary-400">
                                        {formatCurrency(newReturn.items.reduce((acc:number, it:any) => acc + (Number(it.qty) * Number(it.unit_price) * (1 + Number(it.tax_rate) / 100)), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex flex-col-reverse sm:flex-row gap-3 justify-between items-center">
                            <button onClick={() => setShowReturnModal(false)} className="w-full sm:w-auto px-6 py-2.5 font-bold text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors">
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <div className="flex w-full sm:w-auto gap-3">
                                <button onClick={() => handleSaveReturn('draft')} className="w-full sm:w-auto px-6 py-2.5 font-bold bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-600 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-600 hover:shadow-sm transition-all shadow-sm">
                                    {isRTL ? 'حفظ كمسودة' : 'Save as Draft'}
                                </button>
                                <button onClick={() => handleSaveReturn('pending')} className="w-full sm:w-auto btn-primary px-8 py-2.5 font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5 transition-all">
                                    {isRTL ? 'تأكيد وحفظ' : 'Confirm & Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedReturn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedReturn(null)}>
                    <div className="relative w-full max-w-3xl rounded-2xl glass-card p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold">{isRTL ? 'مرتجع' : 'Return'} #{selectedReturn.number}</h2>
                                <p className="text-surface-400 text-sm mt-1">{selectedReturn.supplier?.name} | {selectedReturn.issue_date}</p>
                            </div>
                            <span className="px-3 py-1 rounded text-sm" style={{ background: statusConfig[selectedReturn.status]?.bg, color: statusConfig[selectedReturn.status]?.color }}>
                                {getStatusLabel(selectedReturn.status)}
                            </span>
                        </div>
                        
                        <div className="mb-6 border border-white/5 rounded-xl overflow-hidden">
                            <table className="data-table w-full text-sm">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="py-2 px-4 text-start">{isRTL ? 'الصنف' : 'Item'}</th>
                                        <th className="py-2 px-4">{isRTL ? 'الكمية' : 'Qty'}</th>
                                        <th className="py-2 px-4">{isRTL ? 'السعر' : 'Unit Price'}</th>
                                        <th className="py-2 px-4 text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedReturn.items?.map((it:any) => (
                                        <tr key={it.id} className="border-t border-white/5">
                                            <td className="py-2 px-4">{it.product?.name || it.product_id}</td>
                                            <td className="py-2 px-4">{Number(it.quantity)}</td>
                                            <td className="py-2 px-4">{formatCurrency(it.unit_price)}</td>
                                            <td className="py-2 px-4 text-end text-primary font-medium">{formatCurrency(it.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-4 text-white mb-6">
                            <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                            <span>{formatCurrency(selectedReturn.total_amount)}</span>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                            <button onClick={() => setSelectedReturn(null)} className="px-4 py-2 text-surface-400">{isRTL ? 'إغلاق' : 'Close'}</button>
                            {selectedReturn.status === 'pending' && (
                                <button onClick={() => handleCompleteReturn(selectedReturn.id, selectedReturn.warehouse_id || warehouses[0]?.id)} className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                                    ✓ {isRTL ? 'إخراج المخزون وإكمال المرتجع' : 'Complete Return (Deduct Stock)'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {comparingProductId && (
                <PriceCompareModal
                    productId={comparingProductId}
                    productName={products.find(p => p.id === comparingProductId)?.name || ''}
                    isRTL={isRTL}
                    onClose={() => setComparingProductId(null)}
                    onSelectSupplier={(supplierId, price) => {
                        setNewOrder((prev: any) => ({
                            ...prev,
                            supplier_id: supplierId,
                            items: prev.items.map((item: any) =>
                                item.product_id === comparingProductId
                                    ? { ...item, unit_price: price }
                                    : item
                            )
                        }));
                        setComparingProductId(null);
                    }}
                />
            )}
        </>
    );
});

export default PurchasesModals;
