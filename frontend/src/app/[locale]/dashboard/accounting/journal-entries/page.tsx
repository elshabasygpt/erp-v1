"use client";

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { accountingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Eye, Search } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function JournalEntriesPage() {
    const { isRTL } = useLanguage();
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        setLoading(true);
        try {
            const res = await accountingApi.getJournalEntries();
            setEntries(res.data?.data?.data || res.data?.data || []);
        } catch (err) {
            toast.error('Failed to load journal entries');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1">{isRTL ? 'القيود اليومية' : 'Journal Entries'}</h1>
                    <p className="text-surface-500 text-sm">
                        {isRTL ? 'إدارة قيود اليومية المحاسبية المزدوجة' : 'Manage double-entry manual journal entries.'}
                    </p>
                </div>
                <Link href={`/${isRTL ? 'ar' : 'en'}/dashboard/accounting/journal-entries/create`}>
                    <button className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2">
                        <Plus size={18} />
                        {isRTL ? 'إنشاء قيد جديد' : 'Create Entry'}
                    </button>
                </Link>
            </div>

            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
                {/* Filters could go here */}

                {loading ? (
                    <div className="p-12 text-center text-surface-500">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-500 border-b border-surface-200 dark:border-surface-800 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">{isRTL ? 'رقم القيد' : 'Entry #'}</th>
                                    <th className="px-6 py-4">{isRTL ? 'التاريخ' : 'Date'}</th>
                                    <th className="px-6 py-4">{isRTL ? 'الوصف' : 'Description'}</th>
                                    <th className="px-6 py-4 text-right">{isRTL ? 'الإجمالي (مدين/دائن)' : 'Total Amount'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                                    <th className="px-6 py-4 w-16"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                                            {isRTL ? 'لا توجد قيود مسجلة' : 'No journal entries found'}
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map(entry => {
                                        const total = entry.lines?.reduce((sum: number, line: any) => sum + parseFloat(line.debit || 0), 0) || 0;
                                        
                                        return (
                                            <tr key={entry.id} className="border-b border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-semibold text-violet-600 dark:text-violet-400">
                                                    {entry.entry_number}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {format(new Date(entry.date), 'dd MMM yyyy', { locale: isRTL ? ar : undefined })}
                                                </td>
                                                <td className="px-6 py-4 truncate max-w-[300px]">
                                                    {entry.description}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-medium">
                                                    SAR {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {entry.is_posted ? (
                                                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                                                            {isRTL ? 'مُرحّل' : 'Posted'}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                                                            {isRTL ? 'مسودة' : 'Draft'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {/* We can add a View Modal later, for now just an icon */}
                                                    <button className="p-2 text-surface-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition">
                                                        <Eye size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
