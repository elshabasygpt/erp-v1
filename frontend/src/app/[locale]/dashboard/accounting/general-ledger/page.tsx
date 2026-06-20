"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { accountingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { FileText, Search, Printer, Download } from 'lucide-react';
import dayjs from 'dayjs';

export default function GeneralLedgerPage() {
    const { isRTL } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    
    // Filters
    const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
    const [selectedAccountId, setSelectedAccountId] = useState('');

    // Results
    const [ledgerData, setLedgerData] = useState<any[]>([]);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [closingBalance, setClosingBalance] = useState(0);
    const [totalDebit, setTotalDebit] = useState(0);
    const [totalCredit, setTotalCredit] = useState(0);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const res = await accountingApi.getAccountsTree();
            const tree = res.data?.data || res.data || [];
            const flatAccounts: any[] = [];
            const flatten = (nodes: any[]) => {
                nodes.forEach(node => {
                    // Only allow leaf nodes (no children) or any node depending on requirement. Usually GL is for leaf nodes.
                    if (!node.children || node.children.length === 0) {
                        flatAccounts.push(node);
                    } else {
                        flatAccounts.push(node); // In this case we push all
                        flatten(node.children);
                    }
                });
            };
            flatten(tree);
            setAccounts(flatAccounts);
        } catch (error) {
            toast.error(isRTL ? 'فشل تحميل الحسابات' : 'Failed to load accounts');
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setLoading(true);
        try {
            const res = await accountingApi.getGeneralLedger({
                from: fromDate,
                to: toDate,
                account_id: selectedAccountId || undefined,
            });
            
            const data = res.data?.data || res.data || [];
            
            // Expected format depends on backend. We assume an array of lines.
            // If the backend returns opening balance separated, we adapt.
            setLedgerData(data.lines || data);
            
            // Re-calculate totals from the returned data
            let debit = 0;
            let credit = 0;
            const lines = data.lines || data;
            
            lines.forEach((line: any) => {
                debit += parseFloat(line.debit || 0);
                credit += parseFloat(line.credit || 0);
            });
            
            setTotalDebit(debit);
            setTotalCredit(credit);
            
            // Set opening and closing if provided by backend, else 0
            setOpeningBalance(data.opening_balance || 0);
            setClosingBalance(data.closing_balance || (data.opening_balance || 0) + debit - credit);

        } catch (error: any) {
            toast.error(error.response?.data?.message || (isRTL ? 'فشل جلب التقرير' : 'Failed to load report'));
            setLedgerData([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                        <FileText className="text-primary-600" />
                        {isRTL ? 'دفتر الأستاذ العام' : 'General Ledger'}
                    </h1>
                    <p className="text-surface-500 text-sm">
                        {isRTL ? 'استعراض وتتبع حركات الحسابات خلال فترة محددة' : 'View and track account transactions over a specific period'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-medium rounded-lg shadow-sm transition flex items-center justify-center gap-2">
                        <Printer size={18} />
                        <span className="hidden sm:inline">{isRTL ? 'طباعة' : 'Print'}</span>
                    </button>
                    <button className="px-4 py-2 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-medium rounded-lg shadow-sm transition flex items-center justify-center gap-2">
                        <Download size={18} />
                        <span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 p-5 mb-6">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الحساب (اختياري)' : 'Account (Optional)'}</label>
                        <select 
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-primary-500"
                        >
                            <option value="">{isRTL ? 'جميع الحسابات' : 'All Accounts'}</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.code} - {isRTL ? acc.name_ar : acc.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'من تاريخ' : 'From Date'}</label>
                        <input 
                            type="date" 
                            required
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-primary-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1.5">{isRTL ? 'إلى تاريخ' : 'To Date'}</label>
                            <input 
                                type="date" 
                                required
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-primary-500"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="bg-primary-600 hover:bg-primary-700 text-white p-2.5 rounded-lg font-medium shadow-sm transition flex items-center justify-center mt-6 min-w-[3rem]"
                        >
                            <Search size={20} />
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
                {/* Summary Header */}
                {(ledgerData.length > 0 || loading) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800">
                        <div>
                            <p className="text-xs text-surface-500 mb-1">{isRTL ? 'الرصيد الافتتاحي' : 'Opening Balance'}</p>
                            <p className="font-mono font-semibold text-lg">{openingBalance.toLocaleString('en-US', {minimumFractionDigits:2})}</p>
                        </div>
                        <div>
                            <p className="text-xs text-surface-500 mb-1">{isRTL ? 'إجمالي المدين' : 'Total Debit'}</p>
                            <p className="font-mono font-semibold text-lg text-emerald-600 dark:text-emerald-400">{totalDebit.toLocaleString('en-US', {minimumFractionDigits:2})}</p>
                        </div>
                        <div>
                            <p className="text-xs text-surface-500 mb-1">{isRTL ? 'إجمالي الدائن' : 'Total Credit'}</p>
                            <p className="font-mono font-semibold text-lg text-rose-600 dark:text-rose-400">{totalCredit.toLocaleString('en-US', {minimumFractionDigits:2})}</p>
                        </div>
                        <div>
                            <p className="text-xs text-surface-500 mb-1">{isRTL ? 'الرصيد الختامي' : 'Closing Balance'}</p>
                            <p className={`font-mono font-bold text-lg ${closingBalance < 0 ? 'text-red-600' : 'text-primary-600 dark:text-primary-400'}`}>
                                {closingBalance.toLocaleString('en-US', {minimumFractionDigits:2})}
                            </p>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-500 border-b border-surface-200 dark:border-surface-800 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4 text-start">{isRTL ? 'التاريخ' : 'Date'}</th>
                                <th className="px-6 py-4 text-start">{isRTL ? 'رقم القيد' : 'Entry #'}</th>
                                <th className="px-6 py-4 text-start">{isRTL ? 'الحساب' : 'Account'}</th>
                                <th className="px-6 py-4 text-start">{isRTL ? 'الوصف' : 'Description'}</th>
                                <th className="px-6 py-4 text-end">{isRTL ? 'مدين' : 'Debit'}</th>
                                <th className="px-6 py-4 text-end">{isRTL ? 'دائن' : 'Credit'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                            {isRTL ? 'جاري جلب البيانات...' : 'Fetching data...'}
                                        </div>
                                    </td>
                                </tr>
                            ) : ledgerData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                                        {isRTL ? 'لم يتم العثور على حركات في هذه الفترة' : 'No transactions found in this period'}
                                    </td>
                                </tr>
                            ) : (
                                ledgerData.map((line: any, index: number) => (
                                    <tr key={line.id || index} className="border-b border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                        <td className="px-6 py-4 text-surface-600 dark:text-surface-300">
                                            {dayjs(line.journalEntry?.date || line.date).format('YYYY-MM-DD')}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-primary-600 hover:underline cursor-pointer">
                                            #{line.journalEntry?.entry_number || line.entry_number || line.journal_entry_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium">{line.account?.code}</span>
                                            <span className="mx-2 text-surface-400">-</span>
                                            <span>{isRTL ? line.account?.name_ar : line.account?.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-surface-600 dark:text-surface-400 max-w-xs truncate" title={line.description}>
                                            {line.description || line.journalEntry?.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-end font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                            {parseFloat(line.debit || 0) > 0 ? parseFloat(line.debit).toLocaleString('en-US', {minimumFractionDigits: 2}) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-end font-mono font-medium text-rose-600 dark:text-rose-400">
                                            {parseFloat(line.credit || 0) > 0 ? parseFloat(line.credit).toLocaleString('en-US', {minimumFractionDigits: 2}) : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
