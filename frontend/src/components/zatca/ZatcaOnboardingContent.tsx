'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zatcaApi } from '@/lib/api';

export default function ZatcaOnboardingContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const queryClient = useQueryClient();
    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const { data: queriedStatus, isLoading: statusLoading } = useQuery({
        queryKey: ['zatca', 'onboarding-status'],
        queryFn: async () => {
            const res = await zatcaApi.getOnboardingStatus();
            return res.data?.data?.zatca_status || 'not_enrolled';
        },
    });

    const submitOtpMutation = useMutation({
        mutationFn: (otpValue: string) => zatcaApi.submitOtp(otpValue),
        onSuccess: () => {
            setSuccess(isRTL ? 'تمت عملية الربط بنجاح!' : 'Onboarding completed successfully!');
            setOtp('');
            queryClient.invalidateQueries({ queryKey: ['zatca', 'onboarding-status'] });
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || (isRTL ? 'فشلت عملية الربط. يرجى التأكد من الرمز والمحاولة مرة أخرى.' : 'Onboarding failed. Please check the OTP and try again.'));
        },
    });

    const status = statusLoading ? 'loading' : (submitOtpMutation.isError ? 'failed' : (queriedStatus || 'not_enrolled'));
    const isSubmitting = submitOtpMutation.isPending;

    const handleSubmitOtp = (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.trim().length < 4) {
            setError(isRTL ? 'الرجاء إدخال رمز صحيح (OTP)' : 'Please enter a valid OTP');
            return;
        }
        setError(null);
        setSuccess(null);
        submitOtpMutation.mutate(otp.trim());
    };

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {isRTL ? 'إعدادات ربط هيئة الزكاة والضريبة والجمارك (ZATCA)' : 'ZATCA Onboarding Setup'}
                </h1>
                <p className="text-slate-500 text-sm">
                    {isRTL 
                        ? 'قم بإدخال رمز التحقق (OTP) الصادر من منصة فاتورة لربط نظامك بالهيئة وإصدار فواتير إلكترونية متوافقة.'
                        : 'Enter the OTP generated from FATOORA portal to onboard your system and issue compliant electronic invoices.'}
                </p>
            </div>

            {/* Status Card */}
            <div className={`p-6 rounded-2xl border ${
                status === 'enrolled' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' :
                status === 'failed' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'
            }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                        status === 'enrolled' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-300' :
                        status === 'failed' ? 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-300' :
                        'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                        {status === 'enrolled' ? '✅' : status === 'failed' ? '❌' : '⏳'}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                            {isRTL ? 'حالة الربط:' : 'Onboarding Status:'}
                        </h3>
                        <p className={`font-semibold ${
                            status === 'enrolled' ? 'text-emerald-600 dark:text-emerald-400' :
                            status === 'failed' ? 'text-red-600 dark:text-red-400' :
                            'text-slate-600 dark:text-slate-400'
                        }`}>
                            {status === 'loading' && (isRTL ? 'جاري التحقق...' : 'Checking...')}
                            {status === 'enrolled' && (isRTL ? 'مربوط ومفعل (متوافق مع المرحلة الثانية)' : 'Enrolled and Active (Phase 2 Compliant)')}
                            {status === 'not_enrolled' && (isRTL ? 'غير مربوط (يرجى إكمال الربط)' : 'Not Enrolled (Please complete onboarding)')}
                            {status === 'failed' && (isRTL ? 'فشل الربط (يرجى المحاولة مجدداً)' : 'Onboarding Failed (Please try again)')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Error / Success Messages */}
            {error && (
                <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
                    {success}
                </div>
            )}

            {/* Onboarding Form */}
            {status !== 'enrolled' && status !== 'loading' && (
                <form onSubmit={handleSubmitOtp} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                            {isRTL ? 'رمز التفعيل من منصة فاتورة (OTP)' : 'FATOORA Portal OTP'}
                        </label>
                        <input
                            type="text"
                            className="w-full p-4 text-center text-2xl tracking-widest font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="123456"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            disabled={isSubmitting}
                            required
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            {isRTL 
                                ? 'ملاحظة: هذا الرمز صالح لمدة ساعة واحدة فقط ويمكن استخدامه لربط جهاز واحد.'
                                : 'Note: This OTP is valid for 1 hour only and can be used to onboard a single device.'}
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !otp}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all ${
                            isSubmitting || !otp ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 shadow-md shadow-emerald-500/20'
                        }`}
                    >
                        {isSubmitting 
                            ? (isRTL ? 'جاري الاتصال بالهيئة...' : 'Connecting to ZATCA...') 
                            : (isRTL ? 'تنفيذ عملية الربط' : 'Complete Onboarding')}
                    </button>
                </form>
            )}

            {/* Instructions */}
            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
                    <span>ℹ️</span>
                    {isRTL ? 'كيفية الحصول على رمز التفعيل (OTP)' : 'How to get the OTP?'}
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                    <li>{isRTL ? 'قم بتسجيل الدخول إلى بوابة فاتورة التابعة لهيئة الزكاة والضريبة والجمارك.' : 'Login to the FATOORA portal provided by ZATCA.'}</li>
                    <li>{isRTL ? 'اذهب إلى قسم "تأهيل الأجهزة" (Onboard Devices).' : 'Go to the "Onboard Devices" section.'}</li>
                    <li>{isRTL ? 'اختر "طلب جهاز جديد" (Request New Device).' : 'Select "Request New Device".'}</li>
                    <li>{isRTL ? 'حدد عدد الأجهزة بـ 1 وانقر على توليد الرمز.' : 'Set number of devices to 1 and click Generate.'}</li>
                    <li>{isRTL ? 'انسخ الرمز المعروض وألصقه في الحقل أعلاه.' : 'Copy the displayed OTP and paste it in the field above.'}</li>
                </ol>
            </div>
        </div>
    );
}
