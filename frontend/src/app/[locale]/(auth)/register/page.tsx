'use client';

import { useState } from 'react';
import Link from 'next/link';

interface RegisterPageProps {
    params: { locale: string };
}

export default function RegisterPage({ params }: RegisterPageProps) {
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', password_confirmation: '', phone: '',
    });
    const [loading, setLoading] = useState(false);
    const locale = params.locale;
    const isRTL = locale === 'ar';

    const dict = {
        title: isRTL ? 'إنشاء حساب جديد' : 'Create your account',
        name: isRTL ? 'الاسم الكامل' : 'Full Name',
        email: isRTL ? 'البريد الإلكتروني' : 'Email address',
        password: isRTL ? 'كلمة المرور' : 'Password',
        confirmPassword: isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password',
        phone: isRTL ? 'رقم الهاتف' : 'Phone Number',
        submit: isRTL ? 'تسجيل' : 'Sign Up',
        hasAccount: isRTL ? 'لديك حساب بالفعل؟' : 'Already have an account?',
        login: isRTL ? 'دخول' : 'Sign In',
        appName: isRTL ? 'نظام المحاسبة السحابي' : 'SaaS Accounting',
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => setLoading(false), 1500);
    };

    const update = (field: string, value: string) =>
        setFormData((prev) => ({ ...prev, [field]: value }));

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-950 relative overflow-hidden px-6 py-12">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md animate-slide-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-500/30 mb-4">
                        <span className="text-primary-400 font-bold text-xl">$</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">{dict.appName}</h1>
                </div>

                <div className="glass-card p-8">
                    <h2 className="text-xl font-semibold text-white mb-6">{dict.title}</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-surface-200/60 mb-1.5">{dict.name}</label>
                            <input type="text" value={formData.name} onChange={(e) => update('name', e.target.value)} className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-200/60 mb-1.5">{dict.email}</label>
                            <input type="email" value={formData.email} onChange={(e) => update('email', e.target.value)} className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-200/60 mb-1.5">{dict.phone}</label>
                            <input type="tel" value={formData.phone} onChange={(e) => update('phone', e.target.value)} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-200/60 mb-1.5">{dict.password}</label>
                            <input type="password" value={formData.password} onChange={(e) => update('password', e.target.value)} className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-200/60 mb-1.5">{dict.confirmPassword}</label>
                            <input type="password" value={formData.password_confirmation} onChange={(e) => update('password_confirmation', e.target.value)} className="input-field" required />
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-center disabled:opacity-50 mt-2">
                            {loading ? (isRTL ? 'جاري التسجيل...' : 'Creating account...') : dict.submit}
                        </button>
                    </form>

                    <p className="text-center text-sm text-surface-200/40 mt-5">
                        {dict.hasAccount}{' '}
                        <Link href={`/${locale}/login`} className="text-primary-400 hover:text-primary-300 font-medium">{dict.login}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
