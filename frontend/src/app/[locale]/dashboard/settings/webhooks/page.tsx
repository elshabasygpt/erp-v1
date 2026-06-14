"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { webhooksApi } from '@/lib/api';

export default function WebhooksPage() {
    const { isRTL } = useLanguage();
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formVisible, setFormVisible] = useState(false);
    const [formData, setFormData] = useState({ name: '', url: '', is_active: true, events: [] as string[] });
    const [editingId, setEditingId] = useState<string | null>(null);

    const availableEvents = [
        'invoice.created', 'invoice.updated', 'invoice.paid',
        'customer.created', 'product.updated', 'stock.low'
    ];

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await webhooksApi.getWebhooks();
            setWebhooks(res.data?.data || res.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const toggleEvent = (e: string) => {
        setFormData(prev => ({
            ...prev,
            events: prev.events.includes(e) ? prev.events.filter(x => x !== e) : [...prev.events, e]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await webhooksApi.updateWebhook(editingId, formData);
            } else {
                await webhooksApi.createWebhook(formData);
            }
            setFormVisible(false);
            setEditingId(null);
            setFormData({ name: '', url: '', is_active: true, events: [] });
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Error saving webhook');
        }
    };

    const handleEdit = (w: any) => {
        setEditingId(w.id);
        setFormData({ name: w.name || '', url: w.url, is_active: w.is_active, events: w.events || [] });
        setFormVisible(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this webhook?')) return;
        try {
            await webhooksApi.deleteWebhook(id);
            loadData();
        } catch (err) {
            alert('Error deleting webhook');
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto py-8">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold">{isRTL ? 'تكامل Webhooks (خطافات الويب)' : 'Webhooks Integration'}</h1>
                    <p className="text-slate-500 mt-1">{isRTL ? 'أرسل بيانات النظام لحظياً إلى تطبيقات خارجية (مثل Zapier أو سيرفرات مخصصة).' : 'Send real-time system data to external applications (like Zapier or custom servers).'}</p>
                </div>
                <button 
                    onClick={() => { setEditingId(null); setFormData({ name: '', url: '', is_active: true, events: [] }); setFormVisible(true); }}
                    className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold hover:opacity-90">
                    + {isRTL ? 'إضافة Webhook' : 'Add Webhook'}
                </button>
            </div>

            {formVisible && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                    <h2 className="text-xl font-bold mb-4">{editingId ? (isRTL ? 'تعديل Webhook' : 'Edit Webhook') : (isRTL ? 'Webhook جديد' : 'New Webhook')}</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'الاسم (اختياري)' : 'Name (Optional)'}</label>
                            <input required={false} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700" placeholder="e.g. Zapier Integration"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'رابط الـ Payload (URL)' : 'Payload URL'}</label>
                            <input required type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700" placeholder="https://..."/>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">{isRTL ? 'الأحداث (Events)' : 'Events'}</label>
                        <div className="flex flex-wrap gap-2">
                            {availableEvents.map(ev => (
                                <button type="button" key={ev} onClick={() => toggleEvent(ev)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${formData.events.includes(ev) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                                    {ev}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                        <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4"/>
                        <label htmlFor="isActive" className="text-sm font-medium">{isRTL ? 'نشط' : 'Active'}</label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => setFormVisible(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">{isRTL ? 'حفظ' : 'Save'}</button>
                    </div>
                </form>
            )}

            {loading && !formVisible ? <div className="text-center p-10">Loading...</div> : (
                <div className="space-y-4">
                    {webhooks.length === 0 && !formVisible && (
                        <div className="text-center p-10 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500">
                            {isRTL ? 'لم تقم بإضافة أي Webhooks بعد.' : 'No webhooks configured yet.'}
                        </div>
                    )}
                    {webhooks.map(w => (
                        <div key={w.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="font-bold text-lg">{w.name || 'Unnamed Webhook'}</h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${w.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {w.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Disabled')}
                                    </span>
                                </div>
                                <code className="text-xs bg-slate-100 dark:bg-slate-900 text-pink-600 p-1 px-2 rounded block w-fit mb-3 truncate max-w-sm">{w.url}</code>
                                <div className="flex flex-wrap gap-1">
                                    {w.events.map((e: string) => <span key={e} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-md">{e}</span>)}
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(w)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-blue-50">
                                    ✏️
                                </button>
                                <button onClick={() => handleDelete(w.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-red-50">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
