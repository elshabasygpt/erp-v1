"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { salesApi, customersApi, productsApi } from '@/lib/api';

const STATUS_STYLES: Record<string, string> = {
    draft:    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    sent:     'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired:  'bg-orange-100 text-orange-700',
};

const EMPTY_FORM = {
    customer_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    status: 'draft' as string,
    notes: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0, vat_rate: 15 }],
};

export default function QuotationsPage() {
    const { d, isRTL, locale } = useLanguage();
    const [quotations, setQuotations] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedQ, setSelectedQ] = useState<any>(null);
    const [form, setForm] = useState<any>(EMPTY_FORM);
    const [filterStatus, setFilterStatus] = useState('all');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await salesApi.getQuotations({ status: filterStatus, limit: 50 });
            setQuotations(res.data?.data || []);
        } catch { setQuotations([]); } finally { setLoading(false); }
    }, [filterStatus]);

    useEffect(() => { fetch(); }, [fetch]);

    useEffect(() => {
        customersApi.getCustomers({ limit: 100 }).then(r => setCustomers(r.data?.data || [])).catch(() => {});
        productsApi.getProducts({ limit: 200 }).then(r => setProducts(r.data?.data || r.data || [])).catch(() => {});
    }, []);

    const openNew = () => { setForm({ ...EMPTY_FORM, items: [{ product_id: '', quantity: 1, unit_price: 0, vat_rate: 15 }] }); setIsModalOpen(true); };
    const openEdit = (q: any) => {
        setForm({
            id: q.id,
            customer_id: q.customer_id,
            issue_date: q.issue_date?.split('T')[0] || '',
            expiry_date: q.expiry_date?.split('T')[0] || '',
            status: q.status,
            notes: q.notes || '',
            items: q.items?.map((i: any) => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, vat_rate: i.vat_rate })) || [],
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (form.id) { await salesApi.updateQuotation(form.id, form); }
            else { await salesApi.createQuotation(form); }
            setIsModalOpen(false);
            fetch();
        } catch (err: any) { alert(err?.response?.data?.message || 'Error saving quotation'); }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try { await salesApi.updateQuotationStatus(id, status); fetch(); } catch {}
    };

    const handleConvertToInvoice = async (q: any) => {
        if (!confirm(`Convert quotation ${q.quotation_number} to invoice?`)) return;
        try {
            await salesApi.createInvoice({
                customer_id: q.customer_id,
                invoice_type: 'cash',
                notes: `Converted from ${q.quotation_number}`,
                items: q.items?.map((i: any) => ({
                    product_id: i.product_id, quantity: i.quantity,
                    unit_price: i.unit_price, vat_rate: i.vat_rate,
                })),
            });
            await salesApi.updateQuotationStatus(q.id, 'accepted');
            fetch();
            alert('Invoice created successfully!');
        } catch (err: any) { alert(err?.response?.data?.message || 'Error converting'); }
    };

    const addItem = () => setForm((f: any) => ({ ...f, items: [...f.items, { product_id: '', quantity: 1, unit_price: 0, vat_rate: 15 }] }));
    const removeItem = (i: number) => setForm((f: any) => ({ ...f, items: f.items.filter((_: any, idx: number) => idx !== i) }));
    const updateItem = (i: number, field: string, val: any) => setForm((f: any) => {
        const items = [...f.items];
        items[i] = { ...items[i], [field]: val };
        if (field === 'product_id') {
            const prod = products.find((p: any) => p.id === val);
            if (prod) items[i].unit_price = prod.sell_price;
        }
        return { ...f, items };
    });

    const subtotal = form.items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
    const vat = form.items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price * i.vat_rate / 100), 0);

    const statusLabels: Record<string, string> = isRTL
        ? { draft: 'مسودة', sent: 'مرسل', accepted: 'مقبول', rejected: 'مرفوض', expired: 'منتهي' }
        : { draft: 'Draft', sent: 'Sent', accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired' };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-indigo-600">
                        {isRTL ? 'عروض الأسعار' : 'Quotations'}
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">{isRTL ? 'إنشاء وإدارة عروض الأسعار للعملاء' : 'Create and manage customer quotations'}</p>
                </div>
                <button onClick={openNew} className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl hover:opacity-90 transition font-medium shadow-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    {isRTL ? 'عرض سعر جديد' : 'New Quotation'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(['all', 'draft', 'sent', 'accepted', 'rejected'] as const).map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={`p-4 rounded-xl border transition text-left ${filterStatus === s ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200'}`}>
                        <p className="text-xs text-slate-500 capitalize">{s === 'all' ? (isRTL ? 'الكل' : 'All') : statusLabels[s]}</p>
                        <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-200">
                            {s === 'all' ? quotations.length : quotations.filter(q => q.status === s).length}
                        </p>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="text-center py-16 text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                {[isRTL ? 'رقم العرض' : '#', isRTL ? 'العميل' : 'Customer',
                                  isRTL ? 'تاريخ الانتهاء' : 'Expiry', isRTL ? 'الإجمالي' : 'Total',
                                  isRTL ? 'الحالة' : 'Status', isRTL ? 'إجراءات' : 'Actions'].map(h => (
                                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {quotations.map(q => (
                                <tr key={q.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className={`px-4 py-3 font-mono font-bold text-indigo-600 ${isRTL ? 'text-right' : ''}`}>{q.quotation_number}</td>
                                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : ''}`}>{q.customer?.name || '-'}</td>
                                    <td className={`px-4 py-3 text-slate-500 ${isRTL ? 'text-right' : ''}`}>{q.expiry_date ? new Date(q.expiry_date).toLocaleDateString(locale) : '-'}</td>
                                    <td className={`px-4 py-3 font-semibold ${isRTL ? 'text-right' : ''}`}>{parseFloat(q.total).toFixed(2)}</td>
                                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[q.status]}`}>
                                            {statusLabels[q.status] || q.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <button onClick={() => { setSelectedQ(q); setIsDetailOpen(true); }}
                                                className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600">
                                                {isRTL ? 'عرض' : 'View'}
                                            </button>
                                            <button onClick={() => openEdit(q)}
                                                className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
                                                {isRTL ? 'تعديل' : 'Edit'}
                                            </button>
                                            {q.status === 'accepted' && (
                                                <button onClick={() => handleConvertToInvoice(q)}
                                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium">
                                                    {isRTL ? '→ فاتورة' : '→ Invoice'}
                                                </button>
                                            )}
                                            {q.status === 'draft' && (
                                                <button onClick={() => handleStatusChange(q.id, 'sent')}
                                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                                                    {isRTL ? 'إرسال' : 'Send'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {quotations.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-12 text-slate-400">
                                    <svg className="w-12 h-12 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                    {isRTL ? 'لا توجد عروض أسعار' : 'No quotations found'}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl my-8">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold">{form.id ? (isRTL ? 'تعديل عرض السعر' : 'Edit Quotation') : (isRTL ? 'عرض سعر جديد' : 'New Quotation')}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'العميل' : 'Customer'} *</label>
                                    <select required value={form.customer_id} onChange={e => setForm((f: any) => ({...f, customer_id: e.target.value}))} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                        <option value="">{isRTL ? '-- اختر عميل --' : '-- Select Customer --'}</option>
                                        {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'الحالة' : 'Status'}</label>
                                    <select value={form.status} onChange={e => setForm((f: any) => ({...f, status: e.target.value}))} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                        {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'تاريخ العرض' : 'Issue Date'}</label>
                                    <input type="date" value={form.issue_date} onChange={e => setForm((f: any) => ({...f, issue_date: e.target.value}))} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</label>
                                    <input type="date" value={form.expiry_date} onChange={e => setForm((f: any) => ({...f, expiry_date: e.target.value}))} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"/>
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-sm">{isRTL ? 'الأصناف' : 'Items'}</h4>
                                    <button type="button" onClick={addItem} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                                        {isRTL ? 'إضافة صنف' : 'Add Item'}
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {form.items.map((item: any, i: number) => (
                                        <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                            <div className="col-span-4">
                                                <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} className="w-full p-1.5 text-xs border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600" required>
                                                    <option value="">{isRTL ? 'اختر منتج' : 'Select'}</option>
                                                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={e => updateItem(i, 'quantity', +e.target.value)} className="w-full p-1.5 text-xs border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600" placeholder={isRTL ? 'الكمية' : 'Qty'}/>
                                            </div>
                                            <div className="col-span-3">
                                                <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', +e.target.value)} className="w-full p-1.5 text-xs border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600" placeholder={isRTL ? 'السعر' : 'Price'}/>
                                            </div>
                                            <div className="col-span-2">
                                                <select value={item.vat_rate} onChange={e => updateItem(i, 'vat_rate', +e.target.value)} className="w-full p-1.5 text-xs border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
                                                    <option value={0}>0%</option>
                                                    <option value={5}>5%</option>
                                                    <option value={15}>15%</option>
                                                </select>
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                {form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">&times;</button>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end mt-3 gap-8 text-sm">
                                    <span className="text-slate-500">{isRTL ? 'المجموع قبل الضريبة:' : 'Subtotal:'} <strong>{subtotal.toFixed(2)}</strong></span>
                                    <span className="text-slate-500">{isRTL ? 'ضريبة القيمة المضافة:' : 'VAT:'} <strong>{vat.toFixed(2)}</strong></span>
                                    <span className="font-bold text-indigo-600">{isRTL ? 'الإجمالي:' : 'Total:'} {(subtotal + vat).toFixed(2)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                                <textarea value={form.notes} onChange={e => setForm((f: any) => ({...f, notes: e.target.value}))} rows={2} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="px-5 py-2 text-sm bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg hover:opacity-90 font-medium">
                                    {isRTL ? 'حفظ' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {isDetailOpen && selectedQ && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold">{selectedQ.quotation_number}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{selectedQ.customer?.name}</p>
                            </div>
                            <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <div className="p-6 space-y-3">
                            {selectedQ.items?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                    <span className="text-sm">{item.product?.name || 'Product'}</span>
                                    <span className="text-sm text-slate-500">{item.quantity} × {parseFloat(item.unit_price).toFixed(2)}</span>
                                    <span className="font-medium">{parseFloat(item.total).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="pt-2 flex justify-between font-bold text-indigo-600">
                                <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                                <span>{parseFloat(selectedQ.total).toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="px-6 pb-5 flex justify-end gap-2">
                            {selectedQ.status !== 'accepted' && (
                                <button onClick={() => { handleStatusChange(selectedQ.id, 'accepted'); setIsDetailOpen(false); }}
                                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                                    {isRTL ? 'قبول العرض' : 'Accept'}
                                </button>
                            )}
                            {selectedQ.status === 'accepted' && (
                                <button onClick={() => { handleConvertToInvoice(selectedQ); setIsDetailOpen(false); }}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                                    {isRTL ? 'تحويل لفاتورة' : 'Convert to Invoice'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
