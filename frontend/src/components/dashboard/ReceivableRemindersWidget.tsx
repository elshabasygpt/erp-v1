"use client";
import React, { useState, useEffect } from 'react';
import { reportsApi } from '@/lib/api';
import Link from 'next/link';

interface Props {
    isRTL: boolean;
    formatCurrency: (amount: number) => string;
}

export default function ReceivableRemindersWidget({ isRTL, formatCurrency }: Props) {
    const [reminders, setReminders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReminders = () => {
        setLoading(true);
        reportsApi.getReceivableReminders()
            .then(data => setReminders(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchReminders();
    }, []);

    if (loading) return (
        <div className="glass-card p-6 min-h-[300px] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
    );

    const overdue = (reminders || []).filter(r => r.is_overdue);

    if (!reminders || reminders.length === 0) return null;

    return (
        <div className="glass-card p-5 relative overflow-hidden group">
            {/* Background elements */}
            <div className="absolute -top-10 -end-10 w-40 h-40 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
            
            <div className="flex justify-between items-center mb-5 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">💰</span>
                    <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                        {isRTL ? 'مستحقات العملاء (ذمم)' : 'Receivable Reminders'}
                    </h2>
                </div>
                <div className="flex gap-2">
                    {overdue.length > 0 && (
                        <span className="px-2.5 py-1 text-xs font-bold bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg">
                            {overdue.length} {isRTL ? 'متأخر' : 'Overdue'}
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-3 relative z-10 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {(reminders || []).map((rem, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border ${rem.is_overdue ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-surface-50 dark:bg-surface-800/30 border-surface-200 dark:border-surface-700'} flex items-center justify-between`}>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-surface-900 dark:text-white">{rem.customer_name}</span>
                            <span className="text-xs text-surface-500 mt-0.5">{isRTL ? 'فاتورة #' : 'Inv #'}{rem.invoice_number}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-bold text-surface-900 dark:text-white">{formatCurrency(rem.remaining_amount)}</span>
                            <span className={`text-xs mt-0.5 ${rem.is_overdue ? 'text-red-600 dark:text-red-400 font-bold' : 'text-surface-500'}`}>
                                {rem.is_overdue 
                                    ? (isRTL ? `تأخير ${Math.abs(rem.days_remaining)} يوم` : `${Math.abs(rem.days_remaining)} days late`)
                                    : (rem.days_remaining === 0 ? (isRTL ? 'يستحق اليوم' : 'Due today') : (isRTL ? `بعد ${rem.days_remaining} يوم` : `In ${rem.days_remaining} days`))
                                }
                            </span>
                            <Link href="/dashboard/receivables/collect" className="mt-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/30 transition-colors">
                                {isRTL ? 'تحصيل الآن' : 'Collect Now'}
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
