import { getDictionary, type Locale } from '@/i18n/config';

export default async function SettingsPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    const isRTL = params.locale === 'ar';

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-white">{dict.common.settings}</h1>
                <p className="text-surface-200/50 text-sm mt-1">
                    {isRTL ? 'إدارة إعدادات الحساب والنظام' : 'Manage account and system settings'}
                </p>
            </div>

            {/* Settings Sections */}
            <div className="space-y-4">
                {/* Company Info */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">{isRTL ? 'معلومات الشركة' : 'Company Information'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-surface-200/60 mb-1.5">{isRTL ? 'اسم الشركة' : 'Company Name'}</label>
                            <input type="text" className="input-field" defaultValue="My Trading Company" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-200/60 mb-1.5">{isRTL ? 'الرقم الضريبي' : 'Tax Number'}</label>
                            <input type="text" className="input-field" defaultValue="300000000000003" />
                        </div>
                        <button className="btn-primary">{dict.common.save}</button>
                    </div>
                </div>

                {/* Language */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">{dict.common.language}</h3>
                    <div className="flex gap-4">
                        <a href="/en/dashboard/settings" className={`px-6 py-3 rounded-xl border text-sm font-medium transition-all ${params.locale === 'en' ? 'bg-primary-600/20 border-primary-500/30 text-primary-400' : 'border-white/10 text-surface-200/60 hover:text-white'}`}>
                            🇬🇧 {dict.common.english}
                        </a>
                        <a href="/ar/dashboard/settings" className={`px-6 py-3 rounded-xl border text-sm font-medium transition-all font-arabic ${params.locale === 'ar' ? 'bg-primary-600/20 border-primary-500/30 text-primary-400' : 'border-white/10 text-surface-200/60 hover:text-white'}`}>
                            🇸🇦 {dict.common.arabic}
                        </a>
                    </div>
                </div>

                {/* Subscription Info */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">{isRTL ? 'الاشتراك' : 'Subscription'}</h3>
                    <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-xl border border-white/5">
                        <div>
                            <p className="text-white font-semibold">{isRTL ? 'الخطة الاحترافية' : 'Professional Plan'}</p>
                            <p className="text-sm text-surface-200/40">{isRTL ? 'ينتهي في: 2026-03-23' : 'Expires: 2026-03-23'}</p>
                        </div>
                        <span className="badge badge-success">{isRTL ? 'نشط' : 'Active'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
