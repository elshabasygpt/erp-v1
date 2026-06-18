'use client';

import React, { useState } from 'react';
import { crmApi, salesApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface AddServiceModalProps {
    customerId: string;
    vehicleId: string;
    vehicleDisplayName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    locale: string;
}

export default function AddServiceModal({ customerId, vehicleId, vehicleDisplayName, isOpen, onClose, onSuccess, locale }: AddServiceModalProps) {
    const isRTL = locale === 'ar';
    const [loading, setLoading] = useState(false);
    
    const [form, setForm] = useState({
        service_type: 'parts_replacement',
        service_date: new Date().toISOString().split('T')[0],
        mileage_at_service: '',
        description: '',
        next_service_mileage: '',
        next_service_date: '',
        invoice_id: ''
    });

    const [invoiceQuery, setInvoiceQuery] = useState('');
    const [invoices, setInvoices] = useState<any[]>([]);
    const [searchingInvoice, setSearchingInvoice] = useState(false);

    const searchInvoices = async () => {
        if (!invoiceQuery) return;
        setSearchingInvoice(true);
        try {
            const res = await salesApi.getInvoices({ search: invoiceQuery, customer_id: customerId });
            setInvoices(res.data?.data?.data || res.data?.data || []);
        } catch (error) {

        } finally {
            setSearchingInvoice(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data: any = { ...form };
            if (!data.mileage_at_service) delete data.mileage_at_service;
            if (!data.next_service_mileage) delete data.next_service_mileage;
            if (!data.next_service_date) delete data.next_service_date;
            if (!data.invoice_id) delete data.invoice_id;

            await crmApi.addVehicleService(customerId, vehicleId, data);
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error adding service record');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: 'var(--bg-surface)' }}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50" style={{ borderColor: 'var(--border-default)' }}>
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {isRTL ? 'تسجيل خدمة جديدة' : 'Record New Service'}
                        </h2>
                        <p className="text-sm font-medium text-blue-600 mt-1">🚗 {vehicleDisplayName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5" style={{ color: 'var(--text-secondary)' }}>✕</button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="serviceForm" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'نوع الخدمة' : 'Service Type'}</label>
                            <div className="flex gap-4">
                                {['parts_replacement', 'maintenance', 'inspection', 'other'].map(type => (
                                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="service_type" value={type} checked={form.service_type === type} onChange={e => setForm({ ...form, service_type: e.target.value })} className="text-blue-600 focus:ring-blue-500" />
                                        <span className="text-sm">
                                            {type === 'parts_replacement' ? (isRTL ? 'قطع غيار' : 'Parts') :
                                             type === 'maintenance' ? (isRTL ? 'صيانة' : 'Maintenance') :
                                             type === 'inspection' ? (isRTL ? 'فحص' : 'Inspection') : (isRTL ? 'أخرى' : 'Other')}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'تاريخ الخدمة' : 'Service Date'}</label>
                                <input type="date" required value={form.service_date} onChange={e => setForm({ ...form, service_date: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'عداد الكيلومترات' : 'Mileage'}</label>
                                <input type="number" min="0" placeholder="e.g. 85000" value={form.mileage_at_service} onChange={e => setForm({ ...form, mileage_at_service: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'وصف الخدمة' : 'Description'}</label>
                            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }}></textarea>
                        </div>

                        <div className="border rounded-xl p-4 bg-yellow-50/50 border-yellow-200">
                            <h4 className="text-sm font-bold text-yellow-800 mb-3">{isRTL ? 'الخدمة القادمة (اختياري)' : 'Next Service (Optional)'}</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-yellow-900">{isRTL ? 'عند كيلومتر' : 'At Mileage'}</label>
                                    <input type="number" min="0" placeholder="e.g. 95000" value={form.next_service_mileage} onChange={e => setForm({ ...form, next_service_mileage: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border-yellow-300 bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-yellow-900">{isRTL ? 'تاريخ متوقع' : 'Expected Date'}</label>
                                    <input type="date" value={form.next_service_date} onChange={e => setForm({ ...form, next_service_date: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border-yellow-300 bg-white" />
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-xl p-4 bg-gray-50" style={{ borderColor: 'var(--border-default)' }}>
                            <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'ربط بفاتورة مبيعات (اختياري)' : 'Link to Invoice (Optional)'}</h4>
                            {!form.invoice_id ? (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input type="text" placeholder={isRTL ? 'ابحث برقم الفاتورة...' : 'Search invoice number...'} value={invoiceQuery} onChange={e => setInvoiceQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchInvoices())} className="flex-1 px-3 py-2 text-sm rounded-lg border" style={{ borderColor: 'var(--border-default)' }} />
                                        <button type="button" onClick={searchInvoices} disabled={searchingInvoice} className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium">
                                            {searchingInvoice ? '...' : (isRTL ? 'بحث' : 'Search')}
                                        </button>
                                    </div>
                                    {invoices.length > 0 && (
                                        <div className="border rounded-lg max-h-32 overflow-y-auto bg-white" style={{ borderColor: 'var(--border-default)' }}>
                                            {invoices.map(inv => (
                                                <div key={inv.id} onClick={() => setForm({ ...form, invoice_id: inv.id })} className="p-2 border-b last:border-0 hover:bg-blue-50 cursor-pointer text-sm flex justify-between">
                                                    <span className="font-medium text-blue-600">{inv.invoice_number}</span>
                                                    <span>{inv.total} SAR</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50">
                                    <span className="text-sm font-medium text-blue-800">
                                        {isRTL ? 'تم ربط الفاتورة بنجاح' : 'Invoice Linked'}
                                    </span>
                                    <button type="button" onClick={() => setForm({ ...form, invoice_id: '' })} className="text-xs text-red-600 font-bold hover:underline">
                                        {isRTL ? 'إلغاء الربط' : 'Unlink'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-default)' }}>
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-semibold transition-colors" style={{ color: 'var(--text-secondary)', background: 'var(--bg-input)' }}>
                        {isRTL ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button type="submit" form="serviceForm" disabled={loading} className="btn-primary px-6 py-2.5 disabled:opacity-50">
                        {loading ? '...' : (isRTL ? 'تسجيل الخدمة' : 'Record Service')}
                    </button>
                </div>
            </div>
        </div>
    );
}
