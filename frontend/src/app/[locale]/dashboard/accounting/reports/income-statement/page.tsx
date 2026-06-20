"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { accountingApi } from '@/lib/api';
import { TrendingUp, Search, Printer } from 'lucide-react';
import dayjs from 'dayjs';

interface StatementLine {
    account: { id?: string; code?: string; name?: string; name_ar?: string; type?: string };
    balance: number;
}

interface IncomeStatementData {
    period: { from: string; to: string };
    revenues: StatementLine[];
    expenses: StatementLine[];
    total_revenue: number;
    total_expenses: number;
    net_income: number;
}

function LinesTable({ lines, isRTL, accentClass }: { lines: StatementLine[]; isRTL: boolean; accentClass: string }) {
    if (lines.length === 0) {
        return <p className="px-6 py-6 text-center text-surface-500 text-sm">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>;
    }
    return (
        <table className="w-full text-left text-sm whitespace-nowrap">
            <tbody>
                {lines.map((line, idx) => (
                    <tr key={line.account?.id || idx} className="border-b border-surface-200 dark:border-surface-800">
                        <td className="px-6 py-3 font-mono text-surface-500 w-24">{line.account?.code || '-'}</td>
                        <td className="px-6 py-3">{isRTL ? (line.account?.name_ar || line.account?.name) : (line.account?.name || line.account?.name_ar)}</td>
                        <td className={`px-6 py-3 text-end font-mono font-medium ${accentClass}`}>
                            {line.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function IncomeStatementPage() {
    const { isRTL } = useLanguage();
    const [fromInput, setFromInput] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [toInput, setToInput] = useState(dayjs().format('YYYY-MM-DD'));
    const [range, setRange] = useState({ from: fromInput, to: toInput });

    const { data, isLoading, isFetching, error } = useQuery({
        queryKey: ['accounting', 'income-statement', range.from, range.to],
        queryFn: async () => {
            const res = await accountingApi.getIncomeStatement(range);
            return (res.data?.data || res.data) as IncomeStatementData;
        },
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setRange({ from: fromInput, to: toInput });
    };

    const netIncome = data?.net_income ?? 0;

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                        <TrendingUp className="text-primary-600" />
                        {isRTL ? 'قائمة الدخل' : 'Income Statement'}
                    </h1>
                    <p className="text-surface-500 text-sm">
                        {isRTL ? 'الإيرادات والمصروفات وصافي الربح خلال فترة محددة' : 'Revenues, expenses and net income for a given period'}
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
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'من تاريخ' : 'From Date'}</label>
                        <input
                            type="date"
                            required
                            value={fromInput}
                            onChange={(e) => setFromInput(e.target.value)}
                            className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'إلى تاريخ' : 'To Date'}</label>
                        <input
                            type="date"
                            required
                            value={toInput}
                            onChange={(e) => setToInput(e.target.value)}
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
                <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 px-6 py-16 text-center text-surface-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                        {isRTL ? 'جاري جلب البيانات...' : 'Fetching data...'}
                    </div>
                </div>
            ) : error ? (
                <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 px-6 py-16 text-center text-rose-500">
                    {isRTL ? 'فشل تحميل التقرير' : 'Failed to load report'}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
                        <div className="px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-surface-200 dark:border-surface-800 font-semibold text-emerald-700 dark:text-emerald-400">
                            {isRTL ? 'الإيرادات' : 'Revenues'}
                        </div>
                        <LinesTable lines={data?.revenues || []} isRTL={isRTL} accentClass="text-emerald-600 dark:text-emerald-400" />
                        <div className="px-6 py-3 border-t border-surface-200 dark:border-surface-800 flex justify-between font-bold">
                            <span>{isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}</span>
                            <span className="font-mono text-emerald-700 dark:text-emerald-400">
                                {(data?.total_revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
                        <div className="px-6 py-3 bg-rose-50 dark:bg-rose-900/20 border-b border-surface-200 dark:border-surface-800 font-semibold text-rose-700 dark:text-rose-400">
                            {isRTL ? 'المصروفات' : 'Expenses'}
                        </div>
                        <LinesTable lines={data?.expenses || []} isRTL={isRTL} accentClass="text-rose-600 dark:text-rose-400" />
                        <div className="px-6 py-3 border-t border-surface-200 dark:border-surface-800 flex justify-between font-bold">
                            <span>{isRTL ? 'إجمالي المصروفات' : 'Total Expenses'}</span>
                            <span className="font-mono text-rose-700 dark:text-rose-400">
                                {(data?.total_expenses ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border-2 border-primary-500 p-5 flex justify-between items-center">
                        <span className="text-lg font-bold">{isRTL ? 'صافي الربح / الخسارة' : 'Net Income / Loss'}</span>
                        <span className={`text-xl font-mono font-bold ${netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
