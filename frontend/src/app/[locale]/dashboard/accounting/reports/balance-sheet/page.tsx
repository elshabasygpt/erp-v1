"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { accountingApi } from '@/lib/api';
import { Landmark, Search, Printer } from 'lucide-react';
import dayjs from 'dayjs';
import Skeleton from '@/components/ui/Skeleton';

interface StatementLine {
    account: { id?: string; code?: string; name?: string; name_ar?: string; type?: string };
    balance: number;
}

interface BalanceSheetData {
    as_of: string;
    assets: { items: StatementLine[]; total: number };
    liabilities: { items: StatementLine[]; total: number };
    equity: { items: StatementLine[]; total: number };
    total_liabilities_and_equity: number;
}

function Section({
    title,
    lines,
    total,
    totalLabel,
    isRTL,
    headerClass,
}: {
    title: string;
    lines: StatementLine[];
    total: number;
    totalLabel: string;
    isRTL: boolean;
    headerClass: string;
}) {
    return (
        <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
            <div className={`px-6 py-3 border-b border-surface-200 dark:border-surface-800 font-semibold ${headerClass}`}>
                {title}
            </div>
            {lines.length === 0 ? (
                <p className="px-6 py-6 text-center text-surface-500 text-sm">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
            ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <tbody>
                        {lines.map((line, idx) => (
                            <tr key={line.account?.id || idx} className="border-b border-surface-200 dark:border-surface-800">
                                <td className="px-6 py-3 font-mono text-surface-500 w-24">{line.account?.code || '-'}</td>
                                <td className="px-6 py-3">{isRTL ? (line.account?.name_ar || line.account?.name) : (line.account?.name || line.account?.name_ar)}</td>
                                <td className="px-6 py-3 text-end font-mono font-medium">
                                    {line.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <div className="px-6 py-3 border-t border-surface-200 dark:border-surface-800 flex justify-between font-bold">
                <span>{totalLabel}</span>
                <span className="font-mono">{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
        </div>
    );
}

export default function BalanceSheetPage() {
    const { isRTL } = useLanguage();
    const [asOfInput, setAsOfInput] = useState(dayjs().format('YYYY-MM-DD'));
    const [asOf, setAsOf] = useState(asOfInput);

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['accounting', 'balance-sheet', asOf],
        queryFn: async () => {
            const res = await accountingApi.getBalanceSheet(asOf);
            return (res.data?.data || res.data) as BalanceSheetData;
        },
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setAsOf(asOfInput);
    };

    const totalAssets = data?.assets.total ?? 0;
    const totalLiabEquity = data?.total_liabilities_and_equity ?? 0;
    const isBalanced = Math.abs(totalAssets - totalLiabEquity) < 0.01;

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                        <Landmark className="text-primary-600" />
                        {isRTL ? 'الميزانية العمومية' : 'Balance Sheet'}
                    </h1>
                    <p className="text-surface-500 text-sm">
                        {isRTL ? 'الأصول والخصوم وحقوق الملكية كما في تاريخ محدد' : 'Assets, liabilities and equity as of a given date'}
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

            {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={`sk-${i}`} className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 p-6 space-y-3">
                            {Array.from({ length: 6 }).map((__, j) => (
                                <Skeleton key={j} className="w-full h-5" />
                            ))}
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 px-6 py-16 text-center">
                    <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                        {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                    </p>
                    <button onClick={() => refetch()} className="btn-secondary py-1.5 px-4 text-xs">
                        🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Section
                            title={isRTL ? 'الأصول' : 'Assets'}
                            lines={data?.assets.items || []}
                            total={totalAssets}
                            totalLabel={isRTL ? 'إجمالي الأصول' : 'Total Assets'}
                            isRTL={isRTL}
                            headerClass="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                        />
                        <div className="space-y-6">
                            <Section
                                title={isRTL ? 'الخصوم' : 'Liabilities'}
                                lines={data?.liabilities.items || []}
                                total={data?.liabilities.total ?? 0}
                                totalLabel={isRTL ? 'إجمالي الخصوم' : 'Total Liabilities'}
                                isRTL={isRTL}
                                headerClass="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                            />
                            <Section
                                title={isRTL ? 'حقوق الملكية' : 'Equity'}
                                lines={data?.equity.items || []}
                                total={data?.equity.total ?? 0}
                                totalLabel={isRTL ? 'إجمالي حقوق الملكية' : 'Total Equity'}
                                isRTL={isRTL}
                                headerClass="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border-2 border-primary-500 p-5 flex flex-col sm:flex-row justify-between items-center gap-2">
                        <span className="text-lg font-bold">{isRTL ? 'إجمالي الخصوم وحقوق الملكية' : 'Total Liabilities & Equity'}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-mono font-bold">
                                {totalLiabEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isBalanced ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                {isBalanced ? (isRTL ? '✓ متوازن' : '✓ Balanced') : (isRTL ? '⚠ غير متوازن' : '⚠ Out of balance')}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
