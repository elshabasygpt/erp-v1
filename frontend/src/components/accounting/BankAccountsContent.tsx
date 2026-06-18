'use client';

import React, { useState, useEffect } from 'react';
import { accountingApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function BankAccountsContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const [banks, setBanks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState({ name: '', account_number: '', bank_name: '', currency: 'SAR', opening_balance: 0 });

    const [selectedBank, setSelectedBank] = useState<any>(null);
    const [reconciliations, setReconciliations] = useState<any[]>([]);
    const [isReconModalOpen, setIsReconModalOpen] = useState(false);
    const [reconForm, setReconForm] = useState({ statement_date: '', statement_balance: 0 });
    const [importFile, setImportFile] = useState<File | null>(null);

    const loadBanks = async () => {
        setLoading(true);
        try {
            const res = await accountingApi.getBankAccounts();
            setBanks(res.data?.data || []);
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBanks();
    }, []);

    const handleCreateBank = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await accountingApi.createBankAccount(form);
            setIsFormOpen(false);
            setForm({ name: '', account_number: '', bank_name: '', currency: 'SAR', opening_balance: 0 });
            loadBanks();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error creating bank account');
        }
    };

    const handleViewReconciliations = async (bank: any) => {
        setSelectedBank(bank);
        try {
            const res = await accountingApi.getReconciliations(bank.id);
            setReconciliations(res.data?.data || []);
            setIsReconModalOpen(true);
        } catch (error) {

        }
    };

    const handleStartReconciliation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBank) return;
        try {
            await accountingApi.startReconciliation(selectedBank.id, reconForm);
            const res = await accountingApi.getReconciliations(selectedBank.id);
            setReconciliations(res.data?.data || []);
            setReconForm({ statement_date: '', statement_balance: 0 });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error starting reconciliation');
        }
    };

    const handleImportTransactions = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBank || !importFile) return;
        try {
            await accountingApi.importBankTransactions(selectedBank.id, importFile);
            toast.success(isRTL ? 'تم استيراد الحركات بنجاح' : 'Transactions imported successfully');
            setImportFile(null);
            // Reload reconciliations if needed
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error importing transactions');
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        {isRTL ? 'الحسابات البنكية والمطابقات' : 'Bank Accounts & Reconciliations'}
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        {isRTL ? 'إدارة حساباتك البنكية، استيراد الكشوفات، ومطابقتها مع قيود النظام' : 'Manage bank accounts, import statements, and reconcile with system entries'}
                    </p>
                </div>
                <button 
                    onClick={() => setIsFormOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition"
                >
                    + {isRTL ? 'حساب بنكي جديد' : 'New Bank Account'}
                </button>
            </div>

            {/* Banks List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center p-8 text-slate-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                ) : banks.length === 0 ? (
                    <div className="col-span-full text-center p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500">
                        {isRTL ? 'لا توجد حسابات بنكية مضافة.' : 'No bank accounts found.'}
                    </div>
                ) : (
                    banks.map(bank => (
                        <div key={bank.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xl border border-blue-100 dark:border-blue-800">
                                    🏦
                                </div>
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md text-xs font-bold font-mono">
                                    {bank.currency}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{bank.name}</h3>
                            <p className="text-slate-500 text-sm mb-4">{bank.bank_name} • {bank.account_number}</p>
                            
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">{isRTL ? 'الرصيد الحالي' : 'Current Balance'}</p>
                                    <p className="font-bold text-lg text-slate-700 dark:text-slate-200">
                                        {parseFloat(bank.current_balance || '0').toLocaleString()}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => handleViewReconciliations(bank)}
                                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition text-blue-600 dark:text-blue-400"
                                >
                                    {isRTL ? 'المطابقات' : 'Reconciliations'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <form onSubmit={handleCreateBank} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="font-bold text-lg">{isRTL ? 'إضافة حساب بنكي' : 'Add Bank Account'}</h2>
                            <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'اسم الحساب (مثال: البنك الأهلي - جاري)' : 'Account Name'}</label>
                                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'اسم البنك' : 'Bank Name'}</label>
                                <input required value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'رقم الحساب / الآيبان' : 'Account Number / IBAN'}</label>
                                <input required value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-left" dir="ltr" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'العملة' : 'Currency'}</label>
                                    <input required value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-center" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'الرصيد الافتتاحي' : 'Opening Balance'}</label>
                                    <input required type="number" step="0.01" value={form.opening_balance} onChange={e => setForm({...form, opening_balance: parseFloat(e.target.value)})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 font-medium text-slate-600">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                            <button type="submit" className="px-6 py-2 font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700">{isRTL ? 'حفظ الحساب' : 'Save Account'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Reconciliations Modal */}
            {isReconModalOpen && selectedBank && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <div>
                                <h2 className="font-bold text-lg">{isRTL ? 'مطابقة الحساب:' : 'Reconciliation:'} {selectedBank.name}</h2>
                                <p className="text-sm text-slate-500 mt-1">{selectedBank.account_number}</p>
                            </div>
                            <button onClick={() => setIsReconModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Import Section */}
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-blue-800 dark:text-blue-300">{isRTL ? 'استيراد كشف حساب (CSV)' : 'Import Bank Statement (CSV)'}</h4>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                        {isRTL ? 'قم برفع ملف الكشف البنكي لاستيراد العمليات ومطابقتها تلقائياً.' : 'Upload CSV statement to import transactions for matching.'}
                                    </p>
                                </div>
                                <form onSubmit={handleImportTransactions} className="flex gap-2 w-full md:w-auto">
                                    <input 
                                        type="file" 
                                        accept=".csv"
                                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                        className="text-sm flex-1 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                                    />
                                    <button type="submit" disabled={!importFile} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap">
                                        {isRTL ? 'رفع الكشف' : 'Upload'}
                                    </button>
                                </form>
                            </div>

                            {/* Start New Reconciliation */}
                            <div>
                                <h3 className="font-bold mb-3">{isRTL ? 'بدء مطابقة جديدة' : 'Start New Reconciliation'}</h3>
                                <form onSubmit={handleStartReconciliation} className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium mb-1 text-slate-500">{isRTL ? 'تاريخ الكشف' : 'Statement Date'}</label>
                                        <input required type="date" value={reconForm.statement_date} onChange={e => setReconForm({...reconForm, statement_date: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium mb-1 text-slate-500">{isRTL ? 'رصيد الإغلاق في الكشف' : 'Statement Ending Balance'}</label>
                                        <input required type="number" step="0.01" value={reconForm.statement_balance} onChange={e => setReconForm({...reconForm, statement_balance: parseFloat(e.target.value)})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                    </div>
                                    <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm whitespace-nowrap transition">
                                        {isRTL ? 'بدء المطابقة' : 'Start'}
                                    </button>
                                </form>
                            </div>

                            <hr className="border-slate-200 dark:border-slate-700" />

                            {/* Reconciliations History */}
                            <div>
                                <h3 className="font-bold mb-4">{isRTL ? 'سجل المطابقات' : 'Reconciliation History'}</h3>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                                            <tr>
                                                <th className={`p-3 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'تاريخ الكشف' : 'Statement Date'}</th>
                                                <th className={`p-3 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'الرصيد' : 'Balance'}</th>
                                                <th className={`p-3 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'الحالة' : 'Status'}</th>
                                                <th className={`p-3 font-semibold text-center`}>{isRTL ? 'إجراء' : 'Action'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reconciliations.length === 0 ? (
                                                <tr><td colSpan={4} className="p-6 text-center text-slate-400">{isRTL ? 'لا يوجد سجل مطابقات' : 'No history found'}</td></tr>
                                            ) : (
                                                reconciliations.map(recon => (
                                                    <tr key={recon.id} className="border-b last:border-0 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className={`p-3 font-medium ${isRTL ? 'text-right' : ''}`}>{recon.statement_date}</td>
                                                        <td className={`p-3 font-bold ${isRTL ? 'text-right' : ''}`}>{parseFloat(recon.statement_balance || '0').toLocaleString()}</td>
                                                        <td className={`p-3 ${isRTL ? 'text-right' : ''}`}>
                                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${recon.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {recon.status === 'completed' ? (isRTL ? 'مكتملة' : 'Completed') : (isRTL ? 'قيد المطابقة' : 'In Progress')}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <button className="text-blue-600 hover:underline text-xs font-medium">
                                                                {isRTL ? 'عرض المطابقة' : 'View Matching'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
