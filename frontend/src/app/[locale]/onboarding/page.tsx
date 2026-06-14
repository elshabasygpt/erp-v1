"use client";

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

const STEPS = [
    { id: 'company', en: 'Company Info', ar: 'بيانات الشركة' },
    { id: 'industry', en: 'Business Type', ar: 'نوع النشاط' },
    { id: 'setup', en: 'Quick Setup', ar: 'الإعداد السريع' },
    { id: 'done', en: 'Ready!', ar: 'انطلق!' },
];

export default function OnboardingWizard() {
    const params = useParams();
    const locale = (params?.locale as string) || 'en';
    const isRTL = locale === 'ar';
    const router = useRouter();

    const [step, setStep] = useState(0);
    const [data, setData] = useState({
        company_name: '',
        company_name_ar: '',
        vat_number: '',
        phone: '',
        industry: '',
        employees: '',
        currency: 'SAR',
        warehouses: ['المستودع الرئيسي'],
    });

    const industries = [
        { id: 'retail', en: 'Retail', ar: 'تجزئة', icon: '🏪' },
        { id: 'wholesale', en: 'Wholesale', ar: 'جملة', icon: '🏭' },
        { id: 'import_export', en: 'Import/Export', ar: 'استيراد وتصدير', icon: '🚢' },
        { id: 'food', en: 'Food & Beverage', ar: 'أغذية ومشروبات', icon: '🍽️' },
        { id: 'electronics', en: 'Electronics', ar: 'إلكترونيات', icon: '📱' },
        { id: 'other', en: 'Other', ar: 'أخرى', icon: '📦' },
    ];

    const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
    const handleBack = () => setStep(s => Math.max(s - 1, 0));

    const handleFinish = async () => {
        // TODO: Call API to save company settings
        router.push(`/${locale}/dashboard`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-2xl relative z-10">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-4">
                        ✨ {isRTL ? 'مرحباً بك في POS-11' : 'Welcome to POS-11'}
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {isRTL ? 'هيا نضبط نظامك في 2 دقيقة' : "Let's set up your system in 2 minutes"}
                    </h1>
                    <p className="text-slate-400">
                        {isRTL ? 'لا تقلق — يمكنك تغيير كل شيء لاحقاً' : "Don't worry — you can change everything later"}
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s.id}>
                            <div className={`flex items-center gap-2 ${i <= step ? 'text-amber-400' : 'text-slate-600'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                                    i < step ? 'bg-amber-500 border-amber-500 text-white' :
                                    i === step ? 'border-amber-500 text-amber-400' :
                                    'border-slate-700 text-slate-600'
                                }`}>
                                    {i < step ? '✓' : i + 1}
                                </div>
                                <span className="hidden md:block text-xs font-medium">
                                    {isRTL ? s.ar : s.en}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 max-w-12 ${i < step ? 'bg-amber-500' : 'bg-slate-700'}`}></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Card */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">

                    {/* Step 0: Company Info */}
                    {step === 0 && (
                        <div className="space-y-5">
                            <h2 className="text-xl font-bold text-white mb-6">
                                {isRTL ? '🏢 بيانات شركتك' : '🏢 Your Company Info'}
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1.5">{isRTL ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)'}</label>
                                    <input
                                        value={data.company_name_ar}
                                        onChange={e => setData({...data, company_name_ar: e.target.value})}
                                        placeholder="مثال: شركة الخير للتجارة"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition"
                                        dir="rtl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1.5">{isRTL ? 'اسم الشركة (إنجليزي)' : 'Company Name (English)'}</label>
                                    <input
                                        value={data.company_name}
                                        onChange={e => setData({...data, company_name: e.target.value})}
                                        placeholder="Al-Khair Trading Co."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition"
                                    />
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1.5">
                                        {isRTL ? 'الرقم الضريبي (VAT)' : 'VAT Number'}
                                        <span className="text-xs text-slate-500 ms-1">{isRTL ? '(15 رقم)' : '(15 digits)'}</span>
                                    </label>
                                    <input
                                        value={data.vat_number}
                                        onChange={e => setData({...data, vat_number: e.target.value})}
                                        placeholder="300000000000003"
                                        maxLength={15}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1.5">{isRTL ? 'رقم الجوال' : 'Phone Number'}</label>
                                    <input
                                        value={data.phone}
                                        onChange={e => setData({...data, phone: e.target.value})}
                                        placeholder="+966 5X XXX XXXX"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Industry */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                {isRTL ? '🏭 ما نوع نشاطك التجاري؟' : '🏭 What type of business are you?'}
                            </h2>
                            <p className="text-slate-400 text-sm mb-6">
                                {isRTL ? 'سنضبط النظام بناءً على اختيارك' : "We'll configure the system based on your choice"}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {industries.map(ind => (
                                    <button
                                        key={ind.id}
                                        onClick={() => setData({...data, industry: ind.id})}
                                        className={`p-4 rounded-2xl border-2 text-center transition-all ${
                                            data.industry === ind.id
                                                ? 'border-amber-500 bg-amber-500/10 text-white'
                                                : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600'
                                        }`}
                                    >
                                        <div className="text-3xl mb-2">{ind.icon}</div>
                                        <div className="text-sm font-medium">{isRTL ? ind.ar : ind.en}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Quick Setup */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <h2 className="text-xl font-bold text-white mb-6">
                                {isRTL ? '⚡ الإعداد السريع' : '⚡ Quick Setup'}
                            </h2>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">{isRTL ? 'عدد الموظفين تقريباً' : 'Approx. Number of Employees'}</label>
                                <div className="flex flex-wrap gap-2">
                                    {[['1-5', '1-5'], ['6-20', '6-20'], ['21-50', '21-50'], ['50+', '50+']].map(([v, l]) => (
                                        <button
                                            key={v}
                                            onClick={() => setData({...data, employees: v})}
                                            className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${data.employees === v ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">{isRTL ? 'المستودعات / الفروع' : 'Warehouses / Branches'}</label>
                                <div className="space-y-2">
                                    {data.warehouses.map((w, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input
                                                value={w}
                                                onChange={e => {
                                                    const updated = [...data.warehouses];
                                                    updated[i] = e.target.value;
                                                    setData({...data, warehouses: updated});
                                                }}
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition text-sm"
                                            />
                                            {data.warehouses.length > 1 && (
                                                <button onClick={() => setData({...data, warehouses: data.warehouses.filter((_, j) => j !== i)})} className="px-3 text-red-400 hover:text-red-300">✕</button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setData({...data, warehouses: [...data.warehouses, '']})}
                                        className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-1"
                                    >
                                        + {isRTL ? 'إضافة مستودع/فرع' : 'Add warehouse/branch'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Done */}
                    {step === 3 && (
                        <div className="text-center py-4 space-y-4">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-4xl">
                                🎉
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                {isRTL ? 'نظامك جاهز!' : "Your system is ready!"}
                            </h2>
                            <p className="text-slate-400 max-w-md mx-auto">
                                {isRTL
                                    ? 'تم إعداد نظامك بنجاح. يمكنك الآن البدء ببيع أول منتج أو استكشاف الوحدات المختلفة.'
                                    : 'Your system is all set. You can now sell your first product or explore the different modules.'}
                            </p>
                            <div className="grid grid-cols-3 gap-3 mt-6 text-sm">
                                {[
                                    { icon: '📦', ar: 'أضف منتجاتك', en: 'Add Products', link: 'inventory' },
                                    { icon: '🛒', ar: 'أول عملية بيع', en: 'First Sale', link: 'pos' },
                                    { icon: '📊', ar: 'شاهد التقارير', en: 'View Reports', link: 'reports' },
                                ].map(item => (
                                    <div key={item.link} className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4 hover:border-amber-500/50 transition cursor-pointer">
                                        <div className="text-2xl mb-2">{item.icon}</div>
                                        <div className="font-medium text-white text-xs">{isRTL ? item.ar : item.en}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={handleBack}
                            className={`px-5 py-2.5 rounded-xl text-slate-400 hover:text-white transition text-sm font-medium ${step === 0 ? 'invisible' : ''}`}
                        >
                            {isRTL ? '← رجوع' : '← Back'}
                        </button>

                        {step < STEPS.length - 1 ? (
                            <button
                                onClick={handleNext}
                                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-amber-500/20"
                            >
                                {isRTL ? 'التالي ←' : 'Next →'}
                            </button>
                        ) : (
                            <button
                                onClick={handleFinish}
                                className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-500/20"
                            >
                                {isRTL ? '🚀 انطلق!' : '🚀 Get Started!'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-600 text-xs mt-6">
                    {isRTL ? 'بإتمام الإعداد توافق على' : 'By completing setup you agree to our'}
                    {' '}<span className="text-slate-400 underline cursor-pointer">{isRTL ? 'شروط الخدمة' : 'Terms of Service'}</span>
                </p>
            </div>
        </div>
    );
}
