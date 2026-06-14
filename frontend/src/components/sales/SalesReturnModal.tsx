'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { salesApi, inventoryApi, crmApi } from '@/lib/api';

interface SalesReturnModalProps {
    dict: any;
    locale: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function SalesReturnModal({ dict, locale, onClose, onSuccess }: SalesReturnModalProps) {
    const isRTL = locale === 'ar';
    const s = dict.sales;
    const r = dict.returns || {};
    const common = dict.common;

    const [saving, setSaving] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);

    const [invoices, setInvoices] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    
    // Form State
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [returnType, setReturnType] = useState('full'); // full, partial, line_return
    const [refundMethod, setRefundMethod] = useState('store_credit');
    const [reason, setReason] = useState('customer_request');
    const [notes, setNotes] = useState('');

    const [returnItems, setReturnItems] = useState<any[]>([]);

    useEffect(() => {
        const loadInitialData = async () => {
            setFetchingData(true);
            try {
                // Fetch posted invoices to return against
                const invRes = await salesApi.getInvoices({ status: 'posted', limit: 100 });
                setInvoices(invRes.data?.data?.data || invRes.data?.data || []);
                
                const wRes = await inventoryApi.getWarehouses();
                setWarehouses(wRes.data?.data?.data || wRes.data?.data || []);
            } catch (error) {
                console.error("Failed to load Return data", error);
            }
            setFetchingData(false);
        };
        loadInitialData();
    }, []);

    // When an invoice is selected, load its items
    useEffect(() => {
        if (!selectedInvoiceId) {
            setSelectedInvoice(null);
            setReturnItems([]);
            return;
        }
        const inv = invoices.find(i => i.id === selectedInvoiceId);
        if (inv) {
            setSelectedInvoice(inv);
            // Default to returning everything in 'good' condition
            const mappedItems = inv.items.map((it: any) => ({
                id: it.id,
                product_id: it.product_id,
                product: it.product,
                unit_price: it.unit_price,
                max_quantity: it.quantity,
                return_quantity: it.quantity,
                condition: 'good',
                selected: true
            }));
            setReturnItems(mappedItems);
            setReturnType('full');
            setSelectedWarehouseId(inv.warehouse_id || '');
        }
    }, [selectedInvoiceId, invoices]);

    // Handle full/partial toggles
    useEffect(() => {
        if (returnType === 'full') {
            setReturnItems(prev => prev.map(item => ({ ...item, selected: true, return_quantity: item.max_quantity })));
        } else if (returnType === 'line_return') {
            // keep selections but allow changing which ones
        } else if (returnType === 'partial') {
            // allow changing quantity
        }
    }, [returnType]);

    const handleSave = async () => {
        const itemsToProcess = returnItems.filter(i => i.selected && i.return_quantity > 0);
        
        if (!selectedInvoiceId) return alert(isRTL ? "يرجى اختيار الفاتورة" : "Please select an invoice");
        if (!selectedWarehouseId) return alert(isRTL ? "يرجى اختيار المستودع" : "Please select a warehouse");
        if (itemsToProcess.length === 0) return alert(isRTL ? "يرجى تحديد أصناف للإرجاع" : "Please select items to return");

        // Validate quantities
        for (const item of itemsToProcess) {
            if (item.return_quantity > item.max_quantity) {
                return alert(isRTL ? `الكمية المسترجعة للصنف تجاوزت الكمية في الفاتورة` : `Return quantity exceeds invoiced quantity`);
            }
        }

        setSaving(true);
        try {
            const payload = {
                invoice_id: selectedInvoiceId,
                warehouse_id: selectedWarehouseId,
                customer_id: selectedInvoice.customer_id,
                return_type: returnType,
                refund_method: refundMethod,
                reason: reason,
                notes: notes,
                items: itemsToProcess.map(i => ({
                    product_id: i.product_id,
                    quantity: i.return_quantity,
                    condition: i.condition
                }))
            };
            await salesApi.createReturn(payload);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Return save failed", error);
            if (error.response?.status === 428) {
                alert(isRTL ? 'تم حفظ المرتجع كمسودة وتم إرساله للمدير للموافقة.' : 'Return saved as draft and sent to manager for approval.');
                if (onSuccess) onSuccess();
                onClose();
            } else {
                alert(error.response?.data?.message || (isRTL ? 'فشل حفظ المرتجع' : 'Failed to save return'));
            }
        }
        setSaving(false);
    };

    const lblCls = "block text-[11px] font-medium text-surface-200/50 mb-1 uppercase tracking-wider";

    const totalRefund = returnItems
        .filter(i => i.selected)
        .reduce((sum, item) => sum + (item.unit_price * item.return_quantity), 0);

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-5xl !max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-red-500/5">
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span className="text-red-500">↩</span> {isRTL ? 'إنشاء مرتجع مبيعات متقدم' : 'Advanced Sales Return'}
                    </h2>
                </div>

                {fetchingData ? (
                    <div className="p-20 text-center text-surface-400">{common.loading}</div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b border-white/5 bg-surface-800/30">
                            <div className="md:col-span-2">
                                <label className={lblCls}>{isRTL ? 'الفاتورة الأصلية' : 'Original Invoice'}</label>
                                <select className="select-field w-full" value={selectedInvoiceId} onChange={e => setSelectedInvoiceId(e.target.value)}>
                                    <option value="">{common.select}</option>
                                    {invoices.map(inv => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.invoice_number} - {inv.customer?.name} ({inv.total} SAR)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className={lblCls}>{isRTL ? 'نوع المرتجع' : 'Return Type'}</label>
                                <select className="select-field w-full" value={returnType} onChange={e => setReturnType(e.target.value)}>
                                    <option value="full">{isRTL ? 'مرتجع كامل' : 'Full Return'}</option>
                                    <option value="partial">{isRTL ? 'مرتجع جزئي (كميات)' : 'Partial Return (Qtys)'}</option>
                                    <option value="line_return">{isRTL ? 'مرتجع أصناف' : 'Line Return'}</option>
                                </select>
                            </div>

                            <div>
                                <label className={lblCls}>{isRTL ? 'طريقة الاسترداد' : 'Refund Method'}</label>
                                <select className="select-field w-full" value={refundMethod} onChange={e => setRefundMethod(e.target.value)}>
                                    <option value="store_credit">{isRTL ? 'رصيد محفظة العميل' : 'Store Credit'}</option>
                                    <option value="cash">{isRTL ? 'نقداً (من الخزينة)' : 'Cash'}</option>
                                    <option value="bank_transfer">{isRTL ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                                    <option value="card">{isRTL ? 'بطاقة إئتمان' : 'Card'}</option>
                                </select>
                            </div>

                            <div>
                                <label className={lblCls}>{isRTL ? 'مستودع الاستلام' : 'Receiving Warehouse'}</label>
                                <select className="select-field w-full" value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(e.target.value)}>
                                    <option value="">{common.select}</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={lblCls}>{isRTL ? 'سبب المرتجع' : 'Reason'}</label>
                                <select className="select-field w-full" value={reason} onChange={e => setReason(e.target.value)}>
                                    <option value="customer_request">{isRTL ? 'طلب العميل' : 'Customer Request'}</option>
                                    <option value="defective">{isRTL ? 'منتج معيب / تالف' : 'Defective / Damaged'}</option>
                                    <option value="wrong_item">{isRTL ? 'صنف خاطئ' : 'Wrong Item'}</option>
                                    <option value="exchange">{isRTL ? 'استبدال' : 'Exchange'}</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            {!selectedInvoiceId ? (
                                <div className="text-center text-surface-400 py-10">
                                    {isRTL ? 'يرجى تحديد الفاتورة أولاً' : 'Please select an invoice first'}
                                </div>
                            ) : (
                                <table className="data-table text-sm">
                                    <thead>
                                        <tr>
                                            <th className="w-10 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={returnItems.every(i => i.selected)}
                                                    onChange={e => {
                                                        if (returnType === 'full') return; // Cannot toggle in full return mode
                                                        const checked = e.target.checked;
                                                        setReturnItems(prev => prev.map(i => ({ ...i, selected: checked })));
                                                    }}
                                                    disabled={returnType === 'full'}
                                                    className="rounded border-surface-600"
                                                />
                                            </th>
                                            <th>{s.itemName}</th>
                                            <th className="w-24 text-center">{s.price}</th>
                                            <th className="w-24 text-center">{isRTL ? 'الكمية بالفاتورة' : 'Inv Qty'}</th>
                                            <th className="w-24 text-center">{isRTL ? 'كمية المرتجع' : 'Return Qty'}</th>
                                            <th className="w-32 text-center">{isRTL ? 'الحالة' : 'Condition'}</th>
                                            <th className="w-32 text-end">{common.total}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {returnItems.map(item => (
                                            <tr key={item.id} className={!item.selected ? 'opacity-50' : ''}>
                                                <td className="text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.selected}
                                                        onChange={e => {
                                                            if (returnType === 'full') return;
                                                            setReturnItems(prev => prev.map(it => it.id === item.id ? { ...it, selected: e.target.checked } : it));
                                                        }}
                                                        disabled={returnType === 'full'}
                                                        className="rounded border-surface-600"
                                                    />
                                                </td>
                                                <td style={{ color: 'var(--text-primary)' }}>{item.product?.name || 'Unknown'}</td>
                                                <td className="text-center">{item.unit_price}</td>
                                                <td className="text-center text-surface-400">{item.max_quantity}</td>
                                                <td className="text-center">
                                                    <input 
                                                        type="number" 
                                                        className="bg-transparent border-b border-white/10 w-16 text-center disabled:opacity-50" 
                                                        value={item.return_quantity} 
                                                        onChange={e => {
                                                            let val = parseFloat(e.target.value);
                                                            if (isNaN(val) || val < 0) val = 0;
                                                            if (val > item.max_quantity) val = item.max_quantity;
                                                            setReturnItems(prev => prev.map(it => it.id === item.id ? { ...it, return_quantity: val } : it));
                                                        }} 
                                                        disabled={returnType !== 'partial' || !item.selected}
                                                        max={item.max_quantity}
                                                        min={0}
                                                        step="any"
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <select 
                                                        className="select-field text-xs py-1" 
                                                        value={item.condition} 
                                                        onChange={e => setReturnItems(prev => prev.map(it => it.id === item.id ? { ...it, condition: e.target.value } : it))}
                                                        disabled={!item.selected}
                                                    >
                                                        <option value="good">{isRTL ? 'سليم (إعادة للمخزون)' : 'Good (Return to stock)'}</option>
                                                        <option value="damaged">{isRTL ? 'تالف (لا يعود للمخزون)' : 'Damaged (Do not stock)'}</option>
                                                    </select>
                                                </td>
                                                <td className="text-end font-bold text-red-400">
                                                    {item.selected ? (item.unit_price * item.return_quantity).toFixed(2) : '0.00'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/5 bg-surface-900/50 flex flex-col md:flex-row justify-between items-end gap-10">
                            <div className="flex-1 w-full">
                                <label className={lblCls}>{common.notes}</label>
                                <textarea rows={2} className="input-field w-full text-sm" value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                            <div className="text-end space-y-2 min-w-[250px]">
                                <p className="text-surface-400 text-sm uppercase tracking-wider">{isRTL ? 'إجمالي الاسترداد' : 'Total Refund'}</p>
                                <p className="text-3xl font-bold text-red-500">SAR {totalRefund.toFixed(2)}</p>
                                <button onClick={handleSave} disabled={saving || !selectedInvoiceId} className="btn-primary bg-red-600 hover:bg-red-500 px-10 py-3 w-full">
                                    {saving ? common.loading : (isRTL ? 'اعتماد المرتجع' : 'Confirm Return')}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
