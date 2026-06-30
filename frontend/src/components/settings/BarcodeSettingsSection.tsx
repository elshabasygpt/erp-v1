'use client';

import React, { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function BarcodeSettingsSection({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    
    const [form, setForm] = useState({
        barcode_default_type: '1D',
        barcode_default_size: '50x25',
        barcode_show_company: true,
        barcode_show_name: true,
        barcode_show_price: true,
        barcode_show_sku: true,
        barcode_show_value: true,
    });

    useEffect(() => {
        settingsApi.getSettings()
            .then(res => {
                const data = res.data?.data || res.data || {};
                let parsedSettings: any = {};
                try {
                    parsedSettings = data.barcode_settings ? JSON.parse(data.barcode_settings) : {};
                } catch (e) {}

                setForm({
                    barcode_default_type: parsedSettings.barcode_default_type || '1D',
                    barcode_default_size: parsedSettings.barcode_default_size || '50x25',
                    barcode_show_company: parsedSettings.barcode_show_company ?? true,
                    barcode_show_name: parsedSettings.barcode_show_name ?? true,
                    barcode_show_price: parsedSettings.barcode_show_price ?? true,
                    barcode_show_sku: parsedSettings.barcode_show_sku ?? true,
                    barcode_show_value: parsedSettings.barcode_show_value ?? true,
                });
            })
            .catch(() => {});
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await settingsApi.updateSettings({
                barcode_settings: JSON.stringify(form)
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            toast.error(isRTL ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-card p-6">
            <div className="mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
                    {isRTL ? 'إعدادات طباعة الباركود' : 'Barcode Printing Settings'}
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'تحكم في شكل وتصميم ملصقات الباركود الافتراضية' : 'Control the default layout and design of barcode labels'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {isRTL ? 'نوع الباركود الافتراضي' : 'Default Barcode Type'}
                    </label>
                    <select
                        className="select-field w-full"
                        value={form.barcode_default_type}
                        onChange={(e) => setForm({ ...form, barcode_default_type: e.target.value })}
                    >
                        <option value="1D">1D (Code 128)</option>
                        <option value="QR">2D (QR Code)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {isRTL ? 'مقاس الملصق الافتراضي' : 'Default Label Size'}
                    </label>
                    <select
                        className="select-field w-full"
                        value={form.barcode_default_size}
                        onChange={(e) => setForm({ ...form, barcode_default_size: e.target.value })}
                    >
                        <option value="50x25">50mm x 25mm</option>
                        <option value="40x20">40mm x 20mm</option>
                        <option value="38x25">38mm x 25mm</option>
                        <option value="A4">A4 (ورق عادي)</option>
                    </select>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                        checked={form.barcode_show_name}
                        onChange={(e) => setForm({ ...form, barcode_show_name: e.target.checked })}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'إظهار اسم المنتج على الملصق' : 'Show product name on label'}
                    </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                        checked={form.barcode_show_company}
                        onChange={(e) => setForm({ ...form, barcode_show_company: e.target.checked })}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'إظهار اسم الشركة على الملصق' : 'Show company name on label'}
                    </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                        checked={form.barcode_show_price}
                        onChange={(e) => setForm({ ...form, barcode_show_price: e.target.checked })}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'إظهار سعر المنتج على الملصق' : 'Show product price on label'}
                    </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                        checked={form.barcode_show_sku}
                        onChange={(e) => setForm({ ...form, barcode_show_sku: e.target.checked })}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'إظهار رمز SKU كسطر منفصل' : 'Show SKU as a separate line'}
                    </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                        checked={form.barcode_show_value}
                        onChange={(e) => setForm({ ...form, barcode_show_value: e.target.checked })}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'إظهار الرقم أسفل الباركود مباشرة' : 'Show number directly under barcode'}
                    </span>
                </label>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : dict.common.save}
                </button>
                {saved && (
                    <span className="text-sm font-medium text-green-500 animate-fade-in flex items-center gap-1">
                        ✓ {isRTL ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully'}
                    </span>
                )}
            </div>
        </div>
    );
}
