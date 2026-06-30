"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { accountingApi } from '@/lib/api';
import { Scale, Search, Printer } from 'lucide-react';
import dayjs from 'dayjs';
import Skeleton from '@/components/ui/Skeleton';

interface TrialBalanceRow {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    type: string;
    total_debit: number;
    total_credit: number;
}

export default function TrialBalancePage() {
    const { isRTL } = useLanguage();
    const [asOfInput, setAsOfInput] = useState(dayjs().format('YYYY-MM-DD'));
    const [asOf, setAsOf] = useState(asOfInput);

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['accounting', 'trial-balance', asOf],
        queryFn: async () => {
            const res = await accountingApi.getTrialBalance(asOf);
            const rows = res.data?.data || res.data || [];
            return (rows as any[]).map((r) => ({
                ...r,
                total_debit: parseFloat(r.total_debit || 0),
                total_credit: parseFloat(r.total_credit || 0),
            })) as TrialBalanceRow[];
        },
    });

    const rows = data || [];
    const totalDebit = rows.reduce((sum, r) => sum + r.total_debit, 0);
    const totalCredit = rows.reduce((sum, r) => sum + r.total_credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setAsOf(asOfInput);
    };

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                        <Scale className="text-primary-600" />
                        {isRTL ? 'ميزان المراجعة' : 'Trial Balance'}
                    </h1>
                    <p className="text-surface-500 text-sm">
                        {isRTL ? 'إجمالي المدين والدائن لكل حساب حتى تاريخ محدد' : 'Total debits and credits per account as of a given date'}
                    </p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-medium rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                >
                    <Printer size={18} />
                    <span className="hidden sm:inline">{isRTL ? 'طباعة' : 'Print'}</span>
                </button>
            </div>

            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 p-5 mb-6">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'كما في تاريخ' : 'As of Date'}</label>
                        <input
                            type="date"
                            required
                            value={asOfInput}
                            onChange={(e) => setAsOfInput(e.target.value)}
                            className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-primary-500"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isFetching}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition flex items-center justify-center gap-2"
                    >
                        <Search size={18} />
                        {isRTL ? 'عرض' : 'View'}
                    </button>
                </form>
            </div>

            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
                {!isLoading && rows.length > 0 && (
                    <div className="flex items-center justify-end gap-2 px-5 py-3 border-b border-surface-200 dark:border-surface-800">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isBalanced ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                            {isBalanced ? (isRTL ? '✓ متوازن' : '✓ Balanced') : (isRTL ? '⚠ غير متوازن' : '⚠ Out of balance')}
                        </span>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-500 border-b border-surface-200 dark:border-surface-800 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4 text-start">{isRTL ? 'الكود' : 'Code'}</th>
                                <th className="px-6 py-4 text-start">{isRTL ? 'اسم الحساب' : 'Account'}</th>
                                <th className="px-6 py-4 text-start">{isRTL ? 'النوع' : 'Type'}</th>
                                <th className="px-6 py-4 text-end">{isRTL ? 'مدين' : 'Debit'}</th>
                                <th className="px-6 py-4 text-end">{isRTL ? 'دائن' : 'Credit'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={`sk-${i}`} className="border-b border-surface-200 dark:border-surface-800">
                                        {Array.from({ length: 5 }).map((__, j) => (
                                            <td key={j} className="px-6 py-4"><Skeleton className="w-3/4 h-4" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : error ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                                            {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                                        </p>
                                        <button onClick={() => refetch()} className="btn-secondary py-1.5 px-4 text-xs">
                                            🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                                        </button>
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-surface-500">
                                        {isRTL ? 'لا توجد بيانات لهذا التاريخ' : 'No data for this date'}
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => (
                                    <tr key={row.id} className="border-b border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-surface-600 dark:text-surface-300">{row.code}</td>
                                        <td className="px-6 py-4 font-medium">{isRTL ? row.name_ar : row.name}</td>
                                        <td className="px-6 py-4 text-surface-500 capitalize">{row.type}</td>
                                        <td className="px-6 py-4 text-end font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                            {row.total_debit > 0 ? row.total_debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-end font-mono font-medium text-rose-600 dark:text-rose-400">
                                            {row.total_credit > 0 ? row.total_credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {rows.length > 0 && (
                            <tfoot className="bg-surface-50 dark:bg-surface-800/50 border-t-2 border-surface-300 dark:border-surface-700 font-bold">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-end">{isRTL ? 'الإجمالي' : 'Total'}</td>
                                    <td className="px-6 py-4 text-end font-mono text-emerald-700 dark:text-emerald-400">
                                        {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-end font-mono text-rose-700 dark:text-rose-400">
                                        {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
