'use client';

import { useState } from 'react';

interface ZatcaSettingsSectionProps {
    dict: any;
    locale: string;
}

const DEFAULT_SETTINGS = {
    vatNumber: '300000000000003',
    crNumber: '1010000000',
    building: '1234',
    street: 'شارع الملك فهد',
    district: 'العليا',
    city: 'الرياض',
    zipCode: '12214',
    country: 'SA',
    invoicePrefix: 'INV',
    businessType: 'mixed',
};

function validateVat(vat: string): boolean {
    return /^3\d{13}3$/.test(vat);
}

export default function ZatcaSettingsSection({ dict, locale }: ZatcaSettingsSectionProps) {
    const isRTL = locale === 'ar';
    const tz = dict.zatca || {};

    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [saved, setSaved] = useState(false);
    const [vatError, setVatError] = useState('');

    const update = (key: keyof typeof DEFAULT_SETTINGS, value: string) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
        setSaved(false);
        if (key === 'vatNumber') {
            setVatError(value && !validateVat(value) ? (tz.vatNumberInvalid || 'Invalid VAT number') : '');
        }
    };

    const handleSave = () => {
        if (!validateVat(settings.vatNumber)) {
            setVatError(tz.vatNumberInvalid || 'Invalid VAT number');
            return;
        }
        setVatError('');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const isVatValid = validateVat(settings.vatNumber);

    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            <div
                className="px-6 py-4 flex items-center gap-3"
                style={{ borderBottom: '1px solid var(--border-default)', background: 'rgba(99,102,241,0.06)' }}
            >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(99,102,241,0.15)' }}>
                    🧾
                </div>
                <div>
                    <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{tz.title || 'e-Invoicing (ZATCA)'}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tz.subtitle || 'ZATCA compliance settings'}</p>
                </div>
                <div className="ms-auto flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                        ✓ {tz.phase1 || 'Phase 1'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                        ⚡ {tz.phase2 || 'Phase 2'}
                    </span>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* VAT Number + CR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                            {tz.vatNumber || 'VAT Number'} *
                            <span className="ms-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                                ({tz.vatNumberHint || '15 digits'})
                            </span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                maxLength={15}
                                className="input-field w-full pe-10"
                                value={settings.vatNumber}
                                onChange={(e) => update('vatNumber', e.target.value.replace(/\D/g, ''))}
                                placeholder="300000000000003"
                                dir="ltr"
                            />
                            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-lg">
                                {isVatValid ? '✅' : settings.vatNumber ? '❌' : ''}
                            </span>
                        </div>
                        {vatError && <p className="text-xs mt-1 text-red-400">{vatError}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                            {tz.crNumber || 'Commercial Register'}
                        </label>
                        <input
                            type="text"
                            className="input-field w-full"
                            value={settings.crNumber}
                            onChange={(e) => update('crNumber', e.target.value)}
                            placeholder="1010000000"
                            dir="ltr"
                        />
                    </div>
                </div>

                {/* National Address */}
                <div>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{tz.nationalAddress || 'National Address'}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                            { key: 'building', label: tz.building || 'Building #', placeholder: '1234', dir: 'ltr' },
                            { key: 'street', label: tz.street || 'Street', placeholder: 'King Fahd Road', dir: isRTL ? 'rtl' : 'ltr' },
                            { key: 'district', label: tz.district || 'District', placeholder: 'Al-Olaya', dir: isRTL ? 'rtl' : 'ltr' },
                            { key: 'city', label: tz.city || 'City', placeholder: 'Riyadh', dir: isRTL ? 'rtl' : 'ltr' },
                            { key: 'zipCode', label: tz.zipCode || 'ZIP Code', placeholder: '12214', dir: 'ltr' },
                            { key: 'country', label: tz.country || 'Country', placeholder: 'SA', dir: 'ltr' },
                        ].map((field) => (
                            <div key={field.key}>
                                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{field.label}</label>
                                <input
                                    type="text"
                                    className="input-field w-full py-2 text-sm"
                                    value={(settings as any)[field.key]}
                                    onChange={(e) => update(field.key as any, e.target.value)}
                                    placeholder={field.placeholder}
                                    dir={field.dir as any}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Invoice Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                            {tz.invoicePrefix || 'Invoice Prefix'}
                        </label>
                        <input
                            type="text"
                            className="input-field w-full"
                            value={settings.invoicePrefix}
                            onChange={(e) => update('invoicePrefix', e.target.value.toUpperCase())}
                            placeholder="INV"
                            dir="ltr"
                            maxLength={6}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? `مثال: ${settings.invoicePrefix}-2024-0001` : `Example: ${settings.invoicePrefix}-2024-0001`}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                            {tz.businessType || 'Business Type'}
                        </label>
                        <select
                            className="input-field w-full"
                            value={settings.businessType}
                            onChange={(e) => update('businessType', e.target.value)}
                        >
                            <option value="b2b">{tz.b2b || 'B2B'}</option>
                            <option value="b2c">{tz.b2c || 'B2C'}</option>
                            <option value="mixed">{tz.mixed || 'Mixed'}</option>
                        </select>
                    </div>
                </div>

                {/* Compliance Status */}
                <div className="p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'حالة التوافق مع ZATCA' : 'ZATCA Compliance Status'}</p>
                            <div className="flex gap-4 mt-2">
                                {[
                                    { label: isRTL ? 'الرقم الضريبي' : 'VAT Number', ok: isVatValid },
                                    { label: isRTL ? 'السجل التجاري' : 'CR Number', ok: settings.crNumber.length >= 10 },
                                    { label: isRTL ? 'العنوان الوطني' : 'National Address', ok: !!settings.city && !!settings.street },
                                    { label: isRTL ? 'بادئة الفاتورة' : 'Invoice Prefix', ok: settings.invoicePrefix.length > 0 },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <span className={item.ok ? 'text-green-400' : 'text-red-400'}>
                                            {item.ok ? '✓' : '✗'}
                                        </span>
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'المرحلة المفعّلة' : 'Active Phase'}</p>
                            <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>1</span>
                            <span className="text-xs ms-1" style={{ color: 'var(--text-muted)' }}>/ 2</span>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between">
                    {saved && (
                        <span className="text-sm font-medium" style={{ color: '#10b981' }}>
                            ✅ {tz.settingsSaved || 'Settings saved!'}
                        </span>
                    )}
                    <div className="ms-auto">
                        <button onClick={handleSave} className="btn-primary">
                            💾 {tz.saveSettings || 'Save ZATCA Settings'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
