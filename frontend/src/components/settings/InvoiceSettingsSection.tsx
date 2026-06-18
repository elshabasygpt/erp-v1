'use client';

import React, { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function InvoiceSettingsSection({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    
    const [form, setForm] = useState({
        invoice_default_size: 'A4',
        invoice_show_logo: true,
        invoice_show_buyer: true,
        invoice_show_qr: true,
        invoice_footer_text: '',
    });

    useEffect(() => {
        settingsApi.getSettings()
            .then(res => {
                const data = res.data?.data || res.data || {};
                let parsedSettings: any = {};
                try {
                    parsedSettings = data.invoice_settings ? JSON.parse(data.invoice_settings) : {};
                } catch (e) {}

                setForm({
                    invoice_default_size: parsedSettings.invoice_default_size || 'A4',
                    invoice_show_logo: parsedSettings.invoice_show_logo ?? true,
                    invoice_show_buyer: parsedSettings.invoice_show_buyer ?? true,
                    invoice_show_qr: parsedSettings.invoice_show_qr ?? true,
                    invoice_footer_text: parsedSettings.invoice_footer_text || '',
                });
            })
            .catch(() => {});
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await settingsApi.updateSettings({
                invoice_settings: JSON.stringify(form)
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
                    {isRTL ? 'إعدادات طباعة الفواتير' : 'Invoice Printing Settings'}
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'تحكم في شكل وتصميم وتخطيط فواتير المبيعات' : 'Control the layout and design of sales invoices'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {isRTL ? 'مقاس الفاتورة الافتراضي' : 'Default Invoice Size'}
                    </label>
                    <select
                        className="select-field w-full"
                        value={form.invoice_default_size}
                        onChange={(e) => setForm({ ...form, invoice_default_size: e.target.value })}
                    >
                        <option value="A4">A4 (ورق عادي - مفصلة)</option>
                        <option value="80mm">80mm (رول طابعة حرارية - مبسطة)</option>
                    </select>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                        checked={form.invoice_show_logo}
                        onChange={(e) => setForm({ ...form, invoice_show_logo: e.target.checked })}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'إظهار شعار الشركة أعلى الفاتورة' : 'Show company logo on top'}
                    </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                        checked={form.invoice_show_buyer}
                        onChange={(e) => setForm({ ...form, invoice_show_buyer: e.target.checked })}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'إظهار بيانات العميل (المشتري)' : 'Show buyer information'}
                    </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                        checked={form.invoice_show_qr}
                        onChange={(e) => setForm({ ...form, invoice_show_qr: e.target.checked })}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'إظهار رمز QR التابع لهيئة الزكاة والدخل (ZATCA)' : 'Show ZATCA QR Code'}
                    </span>
                </label>
            </div>

            <div className="mt-6">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {isRTL ? 'النص المخصص أسفل الفاتورة (Footer)' : 'Custom Footer Text'}
                </label>
                <textarea
                    rows={2}
                    className="input-field w-full"
                    placeholder={isRTL ? 'مثال: البضاعة المباعة لا ترد ولا تستبدل بعد 3 أيام' : 'e.g., Items cannot be returned after 3 days'}
                    value={form.invoice_footer_text}
                    onChange={(e) => setForm({ ...form, invoice_footer_text: e.target.value })}
                />
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
