"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { salesApi } from '@/lib/api';
import api from '@/lib/api';

const STATUS_CONFIG: Record<string, { label_ar: string; label_en: string; color: string; icon: string }> = {
    pending:   { label_ar: 'في الانتظار', label_en: 'Pending',   color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
    shipped:   { label_ar: 'تم الشحن',    label_en: 'Shipped',   color: 'bg-blue-100 text-blue-700',    icon: '🚚' },
    delivered: { label_ar: 'تم التسليم',  label_en: 'Delivered', color: 'bg-green-100 text-green-700',  icon: '✅' },
    returned:  { label_ar: 'مُرتجع',      label_en: 'Returned',  color: 'bg-red-100 text-red-700',      icon: '↩️' },
    cancelled: { label_ar: 'ملغي',        label_en: 'Cancelled', color: 'bg-slate-100 text-slate-600',  icon: '❌' },
};

const EMPTY_FORM = {
    invoice_id: '', carrier: '', tracking_number: '',
    shipping_cost: '', shipping_address: '', notes: '',
};

export default function ShippingPage() {
    const { isRTL, locale } = useLanguage();
    const [shipments, setShipments] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<any>(EMPTY_FORM);
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedShipment, setSelectedShipment] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/sales/shipping', { params: { status: filterStatus, limit: 50 } });
            setShipments(res.data?.data || []);
        } catch { setShipments([]); } finally { setLoading(false); }
    }, [filterStatus]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        salesApi.getInvoices({ limit: 100, status: 'confirmed' })
            .then(r => setInvoices(r.data?.data || []))
            .catch(() => {});
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/sales/shipping', {
                ...form,
                shipping_cost: form.shipping_cost ? parseFloat(form.shipping_cost) : 0,
            });
            setIsModalOpen(false);
            setForm(EMPTY_FORM);
            fetchData();
        } catch (err: any) { alert(err?.response?.data?.message || 'Error creating shipment'); }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await api.put(`/sales/shipping/${id}/status`, { status });
            fetchData();
        } catch (err: any) { alert(err?.response?.data?.message || 'Error'); }
    };

    const stats = {
        total: shipments.length,
        pending: shipments.filter(s => s.status === 'pending').length,
        shipped: shipments.filter(s => s.status === 'shipped').length,
        delivered: shipments.filter(s => s.status === 'delivered').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-cyan-600">
                        🚚 {isRTL ? 'الشحن والتوصيل' : 'Shipping & Delivery'}
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">{isRTL ? 'تتبع وإدارة جميع أوامر الشحن والتوصيل' : 'Track and manage all shipping orders'}</p>
                </div>
                <button onClick={() => { setForm(EMPTY_FORM); setIsModalOpen(true); }}
                    className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl hover:opacity-90 transition font-medium shadow-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    {isRTL ? 'شحنة جديدة' : 'New Shipment'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { k: 'all', label_ar: 'إجمالي الشحنات', label_en: 'Total', val: stats.total, icon: '📦', color: 'from-slate-500 to-slate-600' },
                    { k: 'pending', label_ar: 'في الانتظار', label_en: 'Pending', val: stats.pending, icon: '⏳', color: 'from-yellow-400 to-amber-500' },
                    { k: 'shipped', label_ar: 'تم الشحن', label_en: 'Shipped', val: stats.shipped, icon: '🚚', color: 'from-blue-500 to-indigo-600' },
                    { k: 'delivered', label_ar: 'تم التسليم', label_en: 'Delivered', val: stats.delivered, icon: '✅', color: 'from-green-500 to-emerald-600' },
                ].map(s => (
                    <button key={s.k} onClick={() => setFilterStatus(s.k)}
                        className={`p-5 rounded-2xl text-left transition shadow-sm ${filterStatus === s.k ? `bg-gradient-to-br ${s.color} text-white` : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-200'}`}>
                        <span className="text-2xl">{s.icon}</span>
                        <p className={`text-xs mt-2 ${filterStatus === s.k ? 'text-white/80' : 'text-slate-500'}`}>{isRTL ? s.label_ar : s.label_en}</p>
                        <p className={`text-3xl font-bold mt-0.5 ${filterStatus === s.k ? '' : 'text-slate-800 dark:text-white'}`}>{s.val}</p>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400">
                        <svg className="animate-spin w-6 h-6 me-2 text-sky-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        {isRTL ? 'جاري التحميل...' : 'Loading...'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    {[
                                        isRTL ? 'رقم الشحنة' : 'Tracking #',
                                        isRTL ? 'الفاتورة' : 'Invoice',
                                        isRTL ? 'العميل' : 'Customer',
                                        isRTL ? 'شركة الشحن' : 'Carrier',
                                        isRTL ? 'رقم التتبع' : 'Tracking No.',
                                        isRTL ? 'الحالة' : 'Status',
                                        isRTL ? 'إجراءات' : 'Actions',
                                    ].map(h => (
                                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {shipments.map(s => {
                                    const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
                                    return (
                                        <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                            <td className={`px-4 py-3 font-mono font-bold text-sky-600 ${isRTL ? 'text-right' : ''}`}>{s.shipping_number}</td>
                                            <td className={`px-4 py-3 text-xs text-slate-500 ${isRTL ? 'text-right' : ''}`}>{s.sales_invoice?.invoice_number || '-'}</td>
                                            <td className={`px-4 py-3 font-medium ${isRTL ? 'text-right' : ''}`}>{s.sales_invoice?.customer?.name || isRTL ? 'عميل نقدي' : 'Cash'}</td>
                                            <td className={`px-4 py-3 text-slate-600 ${isRTL ? 'text-right' : ''}`}>{s.carrier || '-'}</td>
                                            <td className={`px-4 py-3 font-mono text-xs ${isRTL ? 'text-right' : ''}`}>{s.tracking_number || '-'}</td>
                                            <td className={`px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.icon} {isRTL ? cfg.label_ar : cfg.label_en}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    <button onClick={() => { setSelectedShipment(s); setIsDetailOpen(true); }}
                                                        className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600">
                                                        {isRTL ? 'عرض' : 'View'}
                                                    </button>
                                                    {s.status === 'pending' && (
                                                        <button onClick={() => handleStatusUpdate(s.id, 'shipped')}
                                                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium">
                                                            🚚 {isRTL ? 'شحن' : 'Ship'}
                                                        </button>
                                                    )}
                                                    {s.status === 'shipped' && (
                                                        <button onClick={() => handleStatusUpdate(s.id, 'delivered')}
                                                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium">
                                                            ✅ {isRTL ? 'تسلّم' : 'Deliver'}
                                                        </button>
                                                    )}
                                                    {['pending', 'shipped'].includes(s.status) && (
                                                        <button onClick={() => handleStatusUpdate(s.id, 'cancelled')}
                                                            className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200">
                                                            {isRTL ? 'إلغاء' : 'Cancel'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {shipments.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-16 text-slate-400">
                                        <div className="text-5xl mb-3">📦</div>
                                        <p>{isRTL ? 'لا توجد شحنات' : 'No shipments found'}</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">🚚 {isRTL ? 'شحنة جديدة' : 'New Shipment'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الفاتورة المراد شحنها' : 'Invoice to Ship'} *</label>
                                <select required value={form.invoice_id} onChange={e => setForm((f: any) => ({...f, invoice_id: e.target.value}))}
                                    className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                    <option value="">{isRTL ? '-- اختر فاتورة --' : '-- Select Invoice --'}</option>
                                    {invoices.map((inv: any) => (
                                        <option key={inv.id} value={inv.id}>{inv.invoice_number} — {inv.customer?.name || (isRTL ? 'نقدي' : 'Cash')} ({parseFloat(inv.total).toFixed(2)})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'شركة الشحن' : 'Carrier'}</label>
                                    <input placeholder="DHL, Aramex..." value={form.carrier} onChange={e => setForm((f: any) => ({...f, carrier: e.target.value}))}
                                        className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'رقم التتبع' : 'Tracking Number'}</label>
                                    <input placeholder="1Z999AA10123456784" value={form.tracking_number} onChange={e => setForm((f: any) => ({...f, tracking_number: e.target.value}))}
                                        className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm font-mono"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">{isRTL ? 'عنوان التوصيل' : 'Delivery Address'}</label>
                                <textarea rows={2} value={form.shipping_address} onChange={e => setForm((f: any) => ({...f, shipping_address: e.target.value}))}
                                    className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">{isRTL ? 'تكلفة الشحن' : 'Shipping Cost'}</label>
                                <input type="number" min="0" step="0.01" value={form.shipping_cost} onChange={e => setForm((f: any) => ({...f, shipping_cost: e.target.value}))}
                                    className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                                <textarea rows={2} value={form.notes} onChange={e => setForm((f: any) => ({...f, notes: e.target.value}))}
                                    className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                            </div>
                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                                <button type="submit" className="px-5 py-2 text-sm bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-lg hover:opacity-90 font-medium">🚚 {isRTL ? 'إنشاء الشحنة' : 'Create Shipment'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {isDetailOpen && selectedShipment && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg font-mono">{selectedShipment.shipping_number}</h3>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${STATUS_CONFIG[selectedShipment.status]?.color}`}>
                                    {STATUS_CONFIG[selectedShipment.status]?.icon} {isRTL ? STATUS_CONFIG[selectedShipment.status]?.label_ar : STATUS_CONFIG[selectedShipment.status]?.label_en}
                                </span>
                            </div>
                            <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <div className="p-6 space-y-3 text-sm">
                            {[
                                [isRTL ? 'شركة الشحن' : 'Carrier', selectedShipment.carrier || '-'],
                                [isRTL ? 'رقم التتبع' : 'Tracking No.', selectedShipment.tracking_number || '-'],
                                [isRTL ? 'عنوان التوصيل' : 'Address', selectedShipment.shipping_address || '-'],
                                [isRTL ? 'تكلفة الشحن' : 'Cost', selectedShipment.shipping_cost ? `${parseFloat(selectedShipment.shipping_cost).toFixed(2)}` : '-'],
                                [isRTL ? 'تاريخ الشحن' : 'Shipped At', selectedShipment.shipped_at || '-'],
                                [isRTL ? 'تاريخ التسليم' : 'Delivered At', selectedShipment.delivered_at || '-'],
                                [isRTL ? 'ملاحظات' : 'Notes', selectedShipment.notes || '-'],
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                    <span className="text-slate-500">{l}</span>
                                    <span className="font-medium max-w-xs text-right">{v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="px-6 pb-5 flex gap-2 justify-end flex-wrap">
                            {selectedShipment.status === 'pending' && (
                                <button onClick={() => { handleStatusUpdate(selectedShipment.id, 'shipped'); setIsDetailOpen(false); }}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">🚚 {isRTL ? 'تأكيد الشحن' : 'Confirm Shipped'}</button>
                            )}
                            {selectedShipment.status === 'shipped' && (
                                <button onClick={() => { handleStatusUpdate(selectedShipment.id, 'delivered'); setIsDetailOpen(false); }}
                                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">✅ {isRTL ? 'تأكيد الاستلام' : 'Confirm Delivered'}</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
