'use client';

import { useState } from 'react';
import { useRegionalSettings, type Country } from '@/providers/RegionalSettingsProvider';
import { settingsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface RegionalSettingsSectionProps {
    isRTL: boolean;
}

const COUNTRIES = [
    {
        code: 'SA' as Country,
        flag: '🇸🇦',
        nameAr: 'المملكة العربية السعودية',
        nameEn: 'Saudi Arabia',
        currency: 'SAR',
        currencyNameAr: 'ريال سعودي',
        currencyNameEn: 'Saudi Riyal',
        symbol: 'ر.س',
        taxRate: 15,
        taxNameAr: 'ضريبة القيمة المضافة (VAT)',
        taxNameEn: 'Value Added Tax (VAT)',
        taxNumLabelAr: 'الرقم الضريبي (ZATCA)',
        taxNumLabelEn: 'VAT Number (ZATCA)',
        taxNumPlaceholder: '300000000000003',
        taxNumHintAr: '15 رقماً يبدأ وينتهي بـ 3',
        taxNumHintEn: '15 digits, starts and ends with 3',
        dateFormat: 'DD/MM/YYYY',
        calendarAr: 'الميلادي / الهجري',
        calendarEn: 'Gregorian / Hijri',
        accentColor: '#16a34a',
        bgColor: 'rgba(22,163,74,0.08)',
        borderColor: 'rgba(22,163,74,0.3)',
    },
    {
        code: 'EG' as Country,
        flag: '🇪🇬',
        nameAr: 'جمهورية مصر العربية',
        nameEn: 'Arab Republic of Egypt',
        currency: 'EGP',
        currencyNameAr: 'جنيه مصري',
        currencyNameEn: 'Egyptian Pound',
        symbol: 'ج.م',
        taxRate: 14,
        taxNameAr: 'ضريبة القيمة المضافة (VAT)',
        taxNameEn: 'Value Added Tax (VAT)',
        taxNumLabelAr: 'الرقم الضريبي (مصلحة الضرائب)',
        taxNumLabelEn: 'Tax Registration Number (ETA)',
        taxNumPlaceholder: '123456789',
        taxNumHintAr: '9 أرقام (مصلحة الضرائب المصرية)',
        taxNumHintEn: '9 digits (Egyptian Tax Authority)',
        dateFormat: 'DD/MM/YYYY',
        calendarAr: 'الميلادي',
        calendarEn: 'Gregorian',
        accentColor: '#dc2626',
        bgColor: 'rgba(220,38,38,0.07)',
        borderColor: 'rgba(220,38,38,0.25)',
    },
] as const;

export default function RegionalSettingsSection({ isRTL }: RegionalSettingsSectionProps) {
    const { country, setCountry } = useRegionalSettings();
    const [taxNumber, setTaxNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const selected = COUNTRIES.find(c => c.code === country) || COUNTRIES[0];

    const handleCountryChange = (code: Country) => {
        if (code === country) return;
        setCountry(code);
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsApi.updateSettings({
                country: selected.code,
                base_currency: selected.currency,
                tax_rate: String(selected.taxRate),
                ...(taxNumber ? { tax_registration_number: taxNumber } : {}),
            });
            setSaved(true);
            toast.success(isRTL ? 'تم حفظ الإعدادات الإقليمية' : 'Regional settings saved');
            setTimeout(() => setSaved(false), 3000);
        } catch {
            toast.error(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            <div
                className="px-6 py-4 flex items-center gap-3"
                style={{ borderBottom: '1px solid var(--border-default)', background: 'rgba(99,102,241,0.06)' }}
            >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(99,102,241,0.15)' }}>
                    🌍
                </div>
                <div>
                    <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'الإعدادات الإقليمية والعملة' : 'Regional Settings & Currency'}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'اختر الدولة لضبط العملة والضريبة والقوانين المحلية' : 'Select country to configure currency, tax rates and local compliance'}
                    </p>
                </div>
                <div className="ms-auto">
                    <span
                        className="px-3 py-1.5 rounded-lg text-sm font-bold"
                        style={{ background: selected.bgColor, color: selected.accentColor, border: `1px solid ${selected.borderColor}` }}
                    >
                        {selected.flag} {selected.currency}
                    </span>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Country Selector */}
                <div>
                    <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                        {isRTL ? 'اختر الدولة' : 'Select Country'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {COUNTRIES.map((c) => {
                            const isActive = country === c.code;
                            return (
                                <button
                                    key={c.code}
                                    onClick={() => handleCountryChange(c.code)}
                                    className="p-4 rounded-xl border-2 text-start transition-all duration-200 hover:scale-[1.02] relative"
                                    style={{
                                        borderColor: isActive ? c.accentColor : 'var(--border-default)',
                                        background: isActive ? c.bgColor : 'var(--bg-surface-secondary)',
                                    }}
                                >
                                    {isActive && (
                                        <span
                                            className="absolute top-2 end-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                            style={{ background: c.accentColor }}
                                        >
                                            ✓
                                        </span>
                                    )}
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-3xl">{c.flag}</span>
                                        <div>
                                            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {isRTL ? c.nameAr : c.nameEn}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {isRTL ? c.currencyNameAr : c.currencyNameEn} — {c.symbol}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2 rounded-lg" style={{ background: 'var(--bg-body)' }}>
                                            <p style={{ color: 'var(--text-muted)' }}>{isRTL ? 'العملة' : 'Currency'}</p>
                                            <p className="font-bold mt-0.5" style={{ color: c.accentColor }}>{c.currency}</p>
                                        </div>
                                        <div className="p-2 rounded-lg" style={{ background: 'var(--bg-body)' }}>
                                            <p style={{ color: 'var(--text-muted)' }}>{isRTL ? 'نسبة الضريبة' : 'Tax Rate'}</p>
                                            <p className="font-bold mt-0.5" style={{ color: c.accentColor }}>{c.taxRate}%</p>
                                        </div>
                                        <div className="p-2 rounded-lg" style={{ background: 'var(--bg-body)' }}>
                                            <p style={{ color: 'var(--text-muted)' }}>{isRTL ? 'نظام الضريبة' : 'Tax System'}</p>
                                            <p className="font-semibold mt-0.5 text-[11px]" style={{ color: 'var(--text-primary)' }}>
                                                {isRTL ? c.taxNameAr : c.taxNameEn}
                                            </p>
                                        </div>
                                        <div className="p-2 rounded-lg" style={{ background: 'var(--bg-body)' }}>
                                            <p style={{ color: 'var(--text-muted)' }}>{isRTL ? 'التقويم' : 'Calendar'}</p>
                                            <p className="font-semibold mt-0.5 text-[11px]" style={{ color: 'var(--text-primary)' }}>
                                                {isRTL ? c.calendarAr : c.calendarEn}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Active Country Details */}
                <div
                    className="p-4 rounded-xl space-y-4"
                    style={{ background: selected.bgColor, border: `1px solid ${selected.borderColor}` }}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{selected.flag}</span>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {isRTL
                                ? `الإعدادات المفعّلة: ${selected.nameAr}`
                                : `Active Settings: ${selected.nameEn}`}
                        </p>
                    </div>

                    {/* Tax Registration Number */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                            {isRTL ? selected.taxNumLabelAr : selected.taxNumLabelEn}
                            <span className="ms-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                                ({isRTL ? selected.taxNumHintAr : selected.taxNumHintEn})
                            </span>
                        </label>
                        <input
                            type="text"
                            className="input-field w-full max-w-sm"
                            value={taxNumber}
                            onChange={e => setTaxNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder={selected.taxNumPlaceholder}
                            dir="ltr"
                        />
                    </div>

                    {/* Summary row */}
                    <div className="flex flex-wrap gap-3">
                        {[
                            {
                                icon: '💱',
                                labelAr: 'العملة الأساسية',
                                labelEn: 'Base Currency',
                                value: `${selected.currency} (${selected.symbol})`,
                            },
                            {
                                icon: '📊',
                                labelAr: 'نسبة الضريبة',
                                labelEn: 'Tax Rate',
                                value: `${selected.taxRate}%`,
                            },
                            {
                                icon: '📅',
                                labelAr: 'صيغة التاريخ',
                                labelEn: 'Date Format',
                                value: selected.dateFormat,
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                                style={{ background: 'var(--bg-body)', border: '1px solid var(--border-light)' }}
                            >
                                <span>{item.icon}</span>
                                <div>
                                    <p style={{ color: 'var(--text-muted)' }}>{isRTL ? item.labelAr : item.labelEn}</p>
                                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary"
                    >
                        {saving
                            ? (isRTL ? 'جاري الحفظ...' : 'Saving...')
                            : (isRTL ? '💾 حفظ الإعدادات الإقليمية' : '💾 Save Regional Settings')}
                    </button>
                    {saved && (
                        <span className="text-sm font-medium" style={{ color: '#10b981' }}>
                            ✅ {isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully!'}
                        </span>
                    )}
                </div>

                {/* Note about ZATCA */}
                {country === 'SA' && (
                    <div
                        className="flex items-start gap-2 p-3 rounded-lg text-xs"
                        style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}
                    >
                        <span className="text-base mt-0.5">ℹ️</span>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {isRTL
                                ? 'لأنك اخترت السعودية، ستجد أسفل هذه الصفحة إعدادات ZATCA الخاصة بالفاتورة الإلكترونية الإلزامية.'
                                : 'Since you selected Saudi Arabia, you will find ZATCA e-invoicing settings below on this page.'}
                        </p>
                    </div>
                )}
                {country === 'EG' && (
                    <div
                        className="flex items-start gap-2 p-3 rounded-lg text-xs"
                        style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}
                    >
                        <span className="text-base mt-0.5">ℹ️</span>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {isRTL
                                ? 'الإعدادات المصرية مفعّلة: الجنيه المصري (EGP) كعملة أساسية، ضريبة القيمة المضافة 14%، ومنظومة الفاتورة الإلكترونية (مصلحة الضرائب المصرية).'
                                : 'Egyptian settings active: EGP as base currency, 14% VAT, and Egyptian Tax Authority (ETA) e-invoicing system.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
