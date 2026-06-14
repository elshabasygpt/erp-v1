"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { subscriptionApi } from '@/lib/api';

export default function SubscriptionPage() {
    const { isRTL } = useLanguage();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);

    const loadData = async () => {
        try {
            const res = await subscriptionApi.getCurrent();
            setData(res.data?.data || res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleUpgrade = async (planId: string) => {
        if (!confirm(isRTL ? 'تأكيد الترقية إلى هذه الباقة؟' : 'Confirm upgrade to this plan?')) return;
        setUpgrading(true);
        try {
            await subscriptionApi.checkout({ plan_id: planId, payment_method: 'credit_card' });
            alert(isRTL ? 'تمت الترقية بنجاح!' : 'Upgraded successfully!');
            loadData();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error upgrading');
        } finally {
            setUpgrading(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-500">Loading...</div>;

    const currentPlan = data?.available_plans?.find((p: any) => p.id === data?.subscription?.plan_id);
    const daysLeft = data?.subscription?.ends_at 
        ? Math.ceil((new Date(data.subscription.ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        : 0;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header / Current Status */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>
                </div>
                
                <h1 className="text-3xl font-bold mb-2">
                    {isRTL ? 'إدارة الاشتراك' : 'Subscription Management'}
                </h1>
                <p className="text-slate-400 mb-8 max-w-lg">
                    {isRTL 
                        ? 'تحكم في باقتك الحالية، استعرض الفواتير، ورقي حسابك للاستفادة من مميزات متقدمة كالتصنيع والتحليلات.' 
                        : 'Control your current plan, view invoices, and upgrade to unlock advanced features like manufacturing and AI analytics.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                        <div className="text-slate-300 text-sm mb-1">{isRTL ? 'الباقة الحالية' : 'Current Plan'}</div>
                        <div className="text-2xl font-bold text-amber-400">{currentPlan?.name || (isRTL ? 'غير محدد' : 'None')}</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                        <div className="text-slate-300 text-sm mb-1">{isRTL ? 'الحالة' : 'Status'}</div>
                        <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${data?.subscription?.status === 'active' ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                            <span className="text-xl font-bold capitalize">{data?.subscription?.status || 'Inactive'}</span>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                        <div className="text-slate-300 text-sm mb-1">{isRTL ? 'أيام متبقية' : 'Days Left'}</div>
                        <div className="text-2xl font-bold">{daysLeft > 0 ? daysLeft : 0} <span className="text-sm font-normal text-slate-400">{isRTL ? 'يوم' : 'days'}</span></div>
                    </div>
                </div>
            </div>

            {/* Plans Grid */}
            <div>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">{isRTL ? 'اختر الباقة المناسبة لنمو أعمالك' : 'Choose the right plan for your business growth'}</h2>
                    <p className="text-slate-500">{isRTL ? 'يمكنك الترقية في أي وقت' : 'You can upgrade at any time'}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {data?.available_plans?.map((plan: any) => {
                        const isActive = plan.id === data?.subscription?.plan_id;
                        return (
                            <div key={plan.id} className={`bg-white dark:bg-slate-800 rounded-3xl p-8 border-2 transition-all duration-300 flex flex-col ${isActive ? 'border-amber-500 shadow-amber-500/20 shadow-xl scale-105' : 'border-slate-200 dark:border-slate-700 hover:border-amber-300'}`}>
                                {isActive && (
                                    <div className="bg-amber-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full self-start mb-4">
                                        {isRTL ? 'باقتك الحالية' : 'Current Plan'}
                                    </div>
                                )}
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <div className="mb-6 flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold">{plan.price}</span>
                                    <span className="text-slate-500 font-medium">SAR / {isRTL ? 'شهرياً' : 'month'}</span>
                                </div>
                                
                                <ul className="space-y-4 mb-8 flex-1">
                                    {['Users: ' + plan.max_users, 'Branches: ' + plan.max_branches, 'Full Accounting', 'Basic Inventory'].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button 
                                    onClick={() => handleUpgrade(plan.id)}
                                    disabled={isActive || upgrading}
                                    className={`w-full py-4 rounded-xl font-bold transition-all ${isActive ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 shadow-lg'}`}>
                                    {isActive ? (isRTL ? 'مُفعل' : 'Active') : (upgrading ? '...' : (isRTL ? 'ترقية الآن' : 'Upgrade Now'))}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Payment History Placeholder */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold mb-4">{isRTL ? 'سجل الفواتير' : 'Billing History'}</h3>
                <div className="text-center py-8 text-slate-500">
                    {isRTL ? 'لا توجد فواتير سابقة' : 'No previous invoices found'}
                </div>
            </div>
        </div>
    );
}
