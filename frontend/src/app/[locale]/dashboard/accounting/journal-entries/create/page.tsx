"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { accountingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Calculator } from 'lucide-react';
import Link from 'next/link';

interface JournalLine {
    id: string; // temp id for UI
    account_id: string;
    debit: string;
    credit: string;
    description: string;
}

export default function CreateJournalEntryPage() {
    const { isRTL, locale } = useLanguage();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);

    const [header, setHeader] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
    });

    const [lines, setLines] = useState<JournalLine[]>([
        { id: '1', account_id: '', debit: '', credit: '', description: '' },
        { id: '2', account_id: '', debit: '', credit: '', description: '' },
    ]);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            // we use the flat list of accounts for the dropdown
            const res = await accountingApi.getChartOfAccounts();
            setAccounts(res.data?.data || res.data || []);
        } catch (err) {
            toast.error('Failed to load accounts');
        }
    };

    const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setHeader(prev => ({ ...prev, [name]: value }));
    };

    const handleLineChange = (index: number, field: keyof JournalLine, value: string) => {
        const newLines = [...lines];
        
        // If user enters a debit, clear credit and vice versa
        if (field === 'debit' && value !== '' && value !== '0') {
            newLines[index].credit = '';
        } else if (field === 'credit' && value !== '' && value !== '0') {
            newLines[index].debit = '';
        }

        newLines[index][field] = value;
        setLines(newLines);
    };

    const addLine = () => {
        setLines([...lines, { id: Date.now().toString(), account_id: '', debit: '', credit: '', description: '' }]);
    };

    const removeLine = (index: number) => {
        if (lines.length <= 2) {
            toast.error(isRTL ? 'يجب أن يحتوي القيد على سطرين على الأقل' : 'Journal entry must have at least 2 lines');
            return;
        }
        const newLines = lines.filter((_, i) => i !== index);
        setLines(newLines);
    };

    // Calculations
    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    const outOfBalance = Math.abs(totalDebit - totalCredit);
    const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

    const handleSubmit = async () => {
        // Validation
        if (!header.date || !header.description) {
            toast.error(isRTL ? 'الرجاء إدخال التاريخ والوصف' : 'Please enter date and description');
            return;
        }

        const validLines = lines.filter(l => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
        
        if (validLines.length < 2) {
            toast.error(isRTL ? 'الرجاء إدخال تفاصيل القيد' : 'Please enter valid entry lines');
            return;
        }

        if (!isBalanced) {
            toast.error(isRTL ? 'القيد غير متزن!' : 'Journal entry is not balanced!');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...header,
                lines: validLines.map(l => ({
                    account_id: l.account_id,
                    debit: parseFloat(l.debit) || 0,
                    credit: parseFloat(l.credit) || 0,
                    description: l.description
                }))
            };

            await accountingApi.createJournalEntry(payload);
            toast.success(isRTL ? 'تم إنشاء القيد بنجاح' : 'Journal entry created successfully');
            router.push(`/${locale}/dashboard/accounting/journal-entries`);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create journal entry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`p-6 max-w-7xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header section */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href={`/${locale}/dashboard/accounting/journal-entries`} className="p-2 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-full transition">
                        <ArrowLeft className={isRTL ? 'rotate-180' : ''} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{isRTL ? 'قيد يومية جديد' : 'New Journal Entry'}</h1>
                        <p className="text-surface-500 text-sm">
                            {isRTL ? 'إدخال قيد محاسبي يدوي مزدوج' : 'Create a manual double-entry journal record'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleSubmit} 
                        disabled={loading || !isBalanced}
                        className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-surface-300 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2"
                    >
                        <Save size={18} />
                        {loading ? '...' : (isRTL ? 'حفظ وترحيل' : 'Save & Post')}
                    </button>
                </div>
            </div>

            {/* Form Section */}
            <div className="space-y-6">
                {/* Header Information */}
                <div className="bg-white dark:bg-surface-900 p-6 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800">
                    <h2 className="text-sm font-bold uppercase text-surface-400 mb-4 tracking-wider">{isRTL ? 'تفاصيل القيد' : 'Entry Details'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium mb-1.5">{isRTL ? 'التاريخ' : 'Date'} *</label>
                            <input 
                                type="date" 
                                name="date"
                                value={header.date}
                                onChange={handleHeaderChange}
                                className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500 transition"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الوصف / البيان' : 'Description / Memo'} *</label>
                            <input 
                                type="text" 
                                name="description"
                                value={header.description}
                                onChange={handleHeaderChange}
                                placeholder={isRTL ? 'مثال: إثبات مصروف إيجار شهر يونيو' : 'e.g. Record June Rent Expense'}
                                className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500 transition"
                            />
                        </div>
                    </div>
                </div>

                {/* Lines Grid */}
                <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex justify-between items-center bg-surface-50 dark:bg-surface-800/50">
                        <h2 className="text-sm font-bold uppercase text-surface-500 tracking-wider flex items-center gap-2">
                            <Calculator size={16} />
                            {isRTL ? 'أسطر القيد (مدين/دائن)' : 'Entry Lines (Debit/Credit)'}
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-surface-500 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
                                <tr>
                                    <th className="px-4 py-3 w-10 text-center">#</th>
                                    <th className="px-4 py-3 w-1/3">{isRTL ? 'الحساب' : 'Account'} *</th>
                                    <th className="px-4 py-3 w-1/4">{isRTL ? 'البيان' : 'Description'}</th>
                                    <th className="px-4 py-3 w-32">{isRTL ? 'مدين' : 'Debit'}</th>
                                    <th className="px-4 py-3 w-32">{isRTL ? 'دائن' : 'Credit'}</th>
                                    <th className="px-4 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line, index) => (
                                    <tr key={line.id} className="border-b border-surface-100 dark:border-surface-800/50 group focus-within:bg-blue-50/30 dark:focus-within:bg-blue-900/10 transition-colors">
                                        <td className="px-4 py-3 text-center text-surface-400 font-medium">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <select 
                                                value={line.account_id}
                                                onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}
                                                className="w-full p-2 bg-transparent border-none rounded outline-none focus:ring-2 focus:ring-violet-500/50 hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer font-medium"
                                            >
                                                <option value="" disabled>{isRTL ? 'اختر حساباً...' : 'Select Account...'}</option>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.code} - {isRTL ? acc.name_ar : acc.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="text"
                                                value={line.description}
                                                onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                                placeholder={isRTL ? 'بيان اختياري' : 'Optional memo'}
                                                className="w-full p-2 bg-transparent border-none rounded outline-none focus:ring-2 focus:ring-violet-500/50 hover:bg-surface-50 dark:hover:bg-surface-800"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.debit}
                                                onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full p-2 bg-transparent border-none rounded outline-none focus:ring-2 focus:ring-violet-500/50 hover:bg-surface-50 dark:hover:bg-surface-800 text-right font-mono text-emerald-600 dark:text-emerald-400 placeholder:text-surface-300"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.credit}
                                                onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full p-2 bg-transparent border-none rounded outline-none focus:ring-2 focus:ring-violet-500/50 hover:bg-surface-50 dark:hover:bg-surface-800 text-right font-mono text-rose-600 dark:text-rose-400 placeholder:text-surface-300"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => removeLine(index)}
                                                className="p-2 text-surface-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                tabIndex={-1}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-surface-50 dark:bg-surface-800/50 border-t-2 border-surface-200 dark:border-surface-700">
                                <tr>
                                    <td colSpan={3} className="px-4 py-4">
                                        <button 
                                            onClick={addLine}
                                            className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1 hover:underline"
                                        >
                                            <Plus size={16} />
                                            {isRTL ? 'إضافة سطر' : 'Add Line'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                                        {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-base">
                                        {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Balance Status Bar */}
                    <div className={`p-4 text-center font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                        isBalanced 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                    }`}>
                        {isBalanced ? (
                            <>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {isRTL ? 'القيد متزن' : 'Journal entry is balanced'}
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                {isRTL ? `فرق الرصيد: ${outOfBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR` : `Out of balance by: ${outOfBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR`}
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
