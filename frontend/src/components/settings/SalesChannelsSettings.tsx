'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import api from '@/lib/api';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

export default function SalesChannelsSettings({ isRTL }: { isRTL: boolean }) {
    const [channels, setChannels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const confirm = useConfirm();
    const [modal, setModal] = useState<{ isOpen: boolean, type: 'add' | 'edit', data: any }>({ isOpen: false, type: 'add', data: null });
    const [isMounted, setIsMounted] = useState(false);

    const [form, setForm] = useState({
        name: '', code: '', type: 'delivery', pricing_method: 'percentage',
        markup_percentage: 0, fixed_markup: 0, apply_before_tax: true, is_active: true, logo_url: '', sort_order: 0
    });
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [channelTypes, setChannelTypes] = useState<string[]>(['Delivery App', 'Internal Delivery', 'Marketplace', 'Custom']);

    const fetchChannels = async () => {
        setLoading(true);
        try {
            const res = await api.get('/sales/channels');
            setChannels(res.data?.data || []);

            const settingsRes = await api.get('/settings');
            if (settingsRes.data?.data?.sales_channel_types) {
                setChannelTypes(settingsRes.data.data.sales_channel_types);
            }
        } catch (e) {

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setIsMounted(true);
        fetchChannels();
    }, []);

    const handleSave = async () => {
        try {
            if (modal.type === 'add') {
                await api.post('/sales/channels', form);
            } else {
                await api.put(`/sales/channels/${modal.data.id}`, form);
            }
            
            // Auto-save new type to settings if it doesn't exist
            if (form.type && !channelTypes.includes(form.type)) {
                const newTypes = [...channelTypes, form.type];
                await api.put('/settings', { sales_channel_types: newTypes });
                setChannelTypes(newTypes);
            }

            setModal({ isOpen: false, type: 'add', data: null });
            fetchChannels();
        } catch (e) {
            toast.error(isRTL ? 'خطأ أثناء الحفظ' : 'Error saving');
        }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return;
        try {
            await api.delete(`/sales/channels/${id}`);
            fetchChannels();
        } catch (e) {
            toast.error(isRTL ? 'خطأ أثناء الحذف' : 'Error deleting');
        }
    };

    const openEdit = (channel: any) => {
        setForm({
            name: channel.name, code: channel.code, type: channel.type,
            pricing_method: channel.pricing_method,
            markup_percentage: channel.markup_percentage,
            fixed_markup: channel.fixed_markup,
            apply_before_tax: channel.apply_before_tax,
            is_active: channel.is_active,
            logo_url: channel.logo_url || '',
            sort_order: channel.sort_order || 0
        });
        setModal({ isOpen: true, type: 'edit', data: channel });
    };

    const openAdd = () => {
        setForm({
            name: '', code: '', type: 'delivery', pricing_method: 'percentage',
            markup_percentage: 0, fixed_markup: 0, apply_before_tax: true, is_active: true, logo_url: '', sort_order: 0
        });
        setModal({ isOpen: true, type: 'add', data: null });
    };

    const handleLogoUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setUploadingLogo(true);
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const res = await api.post('/sales/channels/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data?.data?.image_url) {
                setForm(prev => ({ ...prev, logo_url: res.data.data.image_url }));
            }
        } catch (error) {
            toast.error(isRTL ? 'فشل رفع الشعار' : 'Failed to upload logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    return (
        <div className="glass-card p-6 mt-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
                        {isRTL ? 'قنوات البيع' : 'Sales Channels'}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'إدارة تطبيقات التوصيل والقنوات الأخرى' : 'Manage delivery apps and other sales channels'}
                    </p>
                </div>
                <button onClick={openAdd} className="btn-primary">
                    + {isRTL ? 'إضافة قناة' : 'Add Channel'}
                </button>
            </div>
            
            <div className="mb-6 flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{isRTL ? 'الأنواع المتاحة:' : 'Available Types:'}</span>
                {channelTypes.map((t, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs flex items-center gap-2">
                        {t}
                        <button onClick={async () => {
                            if(!await confirm(isRTL ? 'حذف هذا النوع؟' : 'Delete this type?')) return;
                            const newTypes = channelTypes.filter(type => type !== t);
                            await api.put('/settings', { sales_channel_types: newTypes });
                            setChannelTypes(newTypes);
                        }} className="hover:text-red-500" aria-label={isRTL ? 'حذف' : 'Remove'}>&times;</button>
                    </span>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-6">Loading...</div>
            ) : channels.length === 0 ? (
                <div className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'لا توجد قنوات بيع مضافة' : 'No sales channels added yet'}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-start">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                <th className="pb-3 font-medium text-sm">{isRTL ? 'الاسم' : 'Name'}</th>
                                <th className="pb-3 font-medium text-sm">{isRTL ? 'النوع' : 'Type'}</th>
                                <th className="pb-3 font-medium text-sm">{isRTL ? 'التسعير' : 'Pricing'}</th>
                                <th className="pb-3 font-medium text-sm">{isRTL ? 'الحالة' : 'Status'}</th>
                                <th className="pb-3 font-medium text-sm"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {channels.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td className="py-3 text-sm font-medium flex items-center gap-3">
                                        {c.logo_url ? (
                                            <img src={c.logo_url} alt={c.name} className="w-8 h-8 rounded-lg object-cover bg-gray-100" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500">
                                                {c.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            {c.name} <span className="text-xs text-gray-500">({c.code})</span>
                                        </div>
                                    </td>
                                    <td className="py-3 text-sm capitalize">{c.type}</td>
                                    <td className="py-3 text-sm">
                                        {c.pricing_method === 'percentage' ? `+${c.markup_percentage}%` : `+${c.fixed_markup}`}
                                    </td>
                                    <td className="py-3 text-sm">
                                        <span className={`px-2 py-1 rounded text-xs ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {c.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}
                                        </span>
                                    </td>
                                    <td className="py-3 text-sm text-end">
                                        <button onClick={() => openEdit(c)} className="text-blue-500 mx-2 hover:underline">
                                            {isRTL ? 'تعديل' : 'Edit'}
                                        </button>
                                        <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline">
                                            {isRTL ? 'حذف' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modal.isOpen && isMounted && createPortal(
                <div className="fixed inset-0 z-[9999] flex justify-center items-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
                    <div className="bg-white dark:bg-[#111118] w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-scale-up" dir={isRTL ? 'rtl' : 'ltr'}>
                        
                        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 shrink-0 flex justify-between items-center">
                            <h2 className="text-xl font-bold">
                                {modal.type === 'add' ? (isRTL ? 'إضافة قناة جديدة' : 'Add New Channel') : (isRTL ? 'تعديل قناة البيع' : 'Edit Channel')}
                            </h2>
                            <button onClick={() => setModal({ isOpen: false, type: 'add', data: null })} className="text-gray-400 hover:text-red-500 text-2xl leading-none" aria-label={isRTL ? 'إغلاق' : 'Close'}>&times;</button>
                        </div>
                        
                        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
                            <div className="mb-6 flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
                                    {form.logo_url ? (
                                        <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs text-gray-400">{isRTL ? 'شعار' : 'Logo'}</span>
                                    )}
                                    {uploadingLogo && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'صورة الشعار' : 'Logo Image'}</label>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'اسم القناة' : 'Channel Name'}</label>
                                    <input type="text" className="input-field w-full" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'كود القناة' : 'Channel Code'}</label>
                                    <input type="text" className="input-field w-full" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'النوع' : 'Type'}</label>
                                    <input 
                                        type="text" 
                                        list="channel-types-list" 
                                        className="input-field w-full" 
                                        value={form.type} 
                                        onChange={e => setForm({...form, type: e.target.value})} 
                                        placeholder={isRTL ? 'اختر أو اكتب نوعاً جديداً' : 'Select or type a new type'}
                                    />
                                    <datalist id="channel-types-list">
                                        {channelTypes.map((t, idx) => (
                                            <option key={idx} value={t} />
                                        ))}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'طريقة التسعير' : 'Pricing Method'}</label>
                                    <select className="input-field w-full" value={form.pricing_method} onChange={e => setForm({...form, pricing_method: e.target.value})}>
                                        <option value="percentage">Percentage Markup (%)</option>
                                        <option value="fixed">Fixed Amount Markup</option>
                                    </select>
                                </div>

                                {form.pricing_method === 'percentage' ? (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{isRTL ? 'نسبة الزيادة (%)' : 'Markup Percentage (%)'}</label>
                                        <input type="number" step="0.01" className="input-field w-full" value={form.markup_percentage} onChange={e => setForm({...form, markup_percentage: parseFloat(e.target.value)})} />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{isRTL ? 'مبلغ الزيادة' : 'Fixed Markup Amount'}</label>
                                        <input type="number" step="0.01" className="input-field w-full" value={form.fixed_markup} onChange={e => setForm({...form, fixed_markup: parseFloat(e.target.value)})} />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'الترتيب' : 'Sort Order'}</label>
                                    <input type="number" className="input-field w-full" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'الحالة' : 'Status'}</label>
                                    <select className="input-field w-full" value={form.is_active ? '1' : '0'} onChange={e => setForm({...form, is_active: e.target.value === '1'})}>
                                        <option value="1">{isRTL ? 'نشط' : 'Active'}</option>
                                        <option value="0">{isRTL ? 'معطل' : 'Inactive'}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 rounded-b-2xl shrink-0 flex justify-end gap-3">
                            <button className="px-4 py-2 rounded-lg text-sm bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white" onClick={() => setModal({ isOpen: false, type: 'add', data: null })}>
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button className="btn-primary px-6" onClick={handleSave}>
                                {isRTL ? 'حفظ' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
