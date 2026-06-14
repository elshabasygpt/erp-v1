'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { settingsApi } from '@/lib/api';
import ZatcaSettingsSection from '@/components/settings/ZatcaSettingsSection';
import SalesChannelsSettings from '@/components/settings/SalesChannelsSettings';
import { useSidebar, type SidebarMode } from '@/providers/SidebarProvider';

export default function SettingsPage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'ar';
    const isRTL = locale === 'ar';
    const [dict, setDict] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const { mode: sidebarMode, setMode: setSidebarMode } = useSidebar();
    const [form, setForm] = useState({
        company_name: '',
        phone: '',
        email: '',
        website: '',
    });

    useEffect(() => {
        import(`@/i18n/dictionaries/${locale}.json`).then(m => setDict(m.default));
    }, [locale]);

    // Load settings from API, fallback to defaults
    useEffect(() => {
        settingsApi.getSettings()
            .then(res => {
                const data = res.data?.data || res.data || {};
                setForm({
                    company_name: data.company_name || (isRTL ? 'شركتي التجارية' : 'My Trading Company'),
                    phone: data.phone || '+966 11 000 0000',
                    email: data.email || 'info@company.com',
                    website: data.website || 'www.company.com',
                });
            })
            .catch(() => {
                // Backend not available — use defaults
                setForm({
                    company_name: isRTL ? 'شركتي التجارية' : 'My Trading Company',
                    phone: '+966 11 000 0000',
                    email: 'info@company.com',
                    website: 'www.company.com',
                });
            });
    }, [isRTL]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await settingsApi.updateSettings(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            alert(isRTL ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    if (!dict) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="auth-spinner" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>{dict.common.settings}</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'إدارة إعدادات الحساب والنظام' : 'Manage account and system settings'}
                </p>
            </div>

            <div className="space-y-5">
                {/* ── Company Info ── */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
                        {isRTL ? 'معلومات الشركة' : 'Company Information'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                {isRTL ? 'اسم الشركة' : 'Company Name'}
                            </label>
                            <input
                                type="text"
                                className="input-field w-full"
                                value={form.company_name}
                                onChange={e => setForm({ ...form, company_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                {isRTL ? 'رقم الهاتف' : 'Phone Number'}
                            </label>
                            <input
                                type="text"
                                className="input-field w-full"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                {isRTL ? 'البريد الإلكتروني' : 'Email'}
                            </label>
                            <input
                                type="email"
                                className="input-field w-full"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                {isRTL ? 'الموقع الإلكتروني' : 'Website'}
                            </label>
                            <input
                                type="text"
                                className="input-field w-full"
                                value={form.website}
                                onChange={e => setForm({ ...form, website: e.target.value })}
                                dir="ltr"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                        <button className="btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : dict.common.save}
                        </button>
                        {saved && (
                            <span className="text-sm font-medium text-green-500 animate-fade-in flex items-center gap-1">
                                ✓ {isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully'}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Sales Channels ── */}
                <SalesChannelsSettings isRTL={isRTL} />

                {/* ── ZATCA / e-Invoicing ── */}
                <ZatcaSettingsSection dict={dict} locale={locale as any} />

                {/* ── Sidebar Style ── */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>
                        {isRTL ? 'شكل القائمة الجانبية' : 'Sidebar Style'}
                    </h3>
                    <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'اختر طريقة عرض القائمة الجانبية التي تناسبك' : 'Choose how the sidebar looks and behaves'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Full */}
                        {([
                            {
                                key: 'full' as SidebarMode,
                                icon: (
                                    <div className="flex gap-1">
                                        <div className="w-5 h-8 rounded" style={{ background: 'var(--color-primary)', opacity: 0.8 }} />
                                        <div className="flex-1 h-8 rounded" style={{ background: 'var(--border-default)' }} />
                                    </div>
                                ),
                                titleAr: 'شكل كامل',
                                titleEn: 'Full Sidebar',
                                descAr: 'قائمة واسعة تظهر الأيقونات والنصوص دائماً',
                                descEn: 'Wide sidebar with icons and labels always visible',
                            },
                            {
                                key: 'mini' as SidebarMode,
                                icon: (
                                    <div className="flex gap-1">
                                        <div className="w-2 h-8 rounded" style={{ background: 'var(--color-primary)', opacity: 0.8 }} />
                                        <div className="flex-1 h-8 rounded" style={{ background: 'var(--border-default)' }} />
                                    </div>
                                ),
                                titleAr: 'شكل مصغّر',
                                titleEn: 'Mini Sidebar',
                                descAr: 'قائمة ضيقة بأيقونات فقط لتوفير مساحة أكبر',
                                descEn: 'Collapsed sidebar with icons only for more screen space',
                            },
                            {
                                key: 'hover' as SidebarMode,
                                icon: (
                                    <div className="flex gap-1 items-center">
                                        <div className="w-2 h-8 rounded" style={{ background: 'var(--color-primary)', opacity: 0.5 }} />
                                        <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
                                        </svg>
                                        <div className="flex-1 h-8 rounded" style={{ background: 'var(--border-default)' }} />
                                    </div>
                                ),
                                titleAr: 'تمرير الماوس',
                                titleEn: 'Hover to Expand',
                                descAr: 'مصغّرة افتراضياً وتتوسع عند التمرير عليها',
                                descEn: 'Collapsed by default, expands on mouse hover',
                            },
                        ] as const).map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setSidebarMode(opt.key)}
                                className={`p-4 rounded-xl border-2 text-start transition-all duration-200 hover:scale-[1.02]`}
                                style={{
                                    borderColor: sidebarMode === opt.key ? 'var(--color-primary)' : 'var(--border-default)',
                                    background: sidebarMode === opt.key ? 'rgba(99,102,241,0.07)' : 'var(--bg-surface-secondary)',
                                }}
                            >
                                <div className="mb-3">{opt.icon}</div>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        {isRTL ? opt.titleAr : opt.titleEn}
                                    </p>
                                    {sidebarMode === opt.key && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                                            style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary)' }}>
                                            {isRTL ? 'محدد' : 'Active'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? opt.descAr : opt.descEn}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Language ── */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>{dict.common.language}</h3>
                    <div className="flex gap-4">
                        <a href="/en/dashboard/settings" className={`px-6 py-3 rounded-xl border text-sm font-medium transition-all ${locale === 'en' ? 'bg-primary-600/20 border-primary-500/30 text-primary-400' : ''}`}
                            style={locale !== 'en' ? { borderColor: 'var(--border-default)', color: 'var(--text-secondary)' } : {}}>
                            🇬🇧 {dict.common.english}
                        </a>
                        <a href="/ar/dashboard/settings" className={`px-6 py-3 rounded-xl border text-sm font-medium transition-all font-arabic ${locale === 'ar' ? 'bg-primary-600/20 border-primary-500/30 text-primary-400' : ''}`}
                            style={locale !== 'ar' ? { borderColor: 'var(--border-default)', color: 'var(--text-secondary)' } : {}}>
                            🇸🇦 {dict.common.arabic}
                        </a>
                    </div>
                </div>

                {/* ── Subscription ── */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>{isRTL ? 'الاشتراك' : 'Subscription'}</h3>
                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)' }}>
                        <div>
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'الخطة الاحترافية' : 'Professional Plan'}</p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'اشتراك نشط' : 'Active subscription'}</p>
                        </div>
                        <span className="badge badge-success">{isRTL ? 'نشط' : 'Active'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
