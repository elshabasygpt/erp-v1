"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useLanguage } from '@/i18n/LanguageContext';
import { treasuryApi, customersApi, suppliersApi, accountingApi } from '@/lib/api';
import toast from 'react-hot-toast';

type Tab = 'safes' | 'vouchers' | 'transactions';

export default function TreasuryPage() {
    const { isRTL, locale } = useLanguage();
    const confirm = useConfirm();
    const [tab, setTab] = useState<Tab>('safes');
    const [safes, setSafes] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Voucher form state
    const [voucherForm, setVoucherForm] = useState({ type: 'receipt', party_type: 'customer', party_id: '', safe_id: '', amount: '', notes: '', date: new Date().toISOString().split('T')[0] });
    const [voucherSuccess, setVoucherSuccess] = useState('');

    // Transfer form state
    const [transferForm, setTransferForm] = useState({ from_safe_id: '', to_safe_id: '', amount: '', fee_amount: '', fee_percentage: '', description: '' });
    
    // New safe form
    const [newSafeForm, setNewSafeForm] = useState({ name: '', name_ar: '', type: 'cash', account_id: '', bank_account_id: '', balance: '' });

    // Edit safe form
    const [editingSafe, setEditingSafe] = useState<any>(null);

    // Transactions Modal
    const [selectedSafe, setSelectedSafe] = useState<any>(null);
    const [safeTransactions, setSafeTransactions] = useState<any[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    const fetchSafes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await treasuryApi.getSafes();
            setSafes(res.data?.data || res.data || []);
        } catch { setSafes([]); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchSafes(); }, [fetchSafes]);
    useEffect(() => {
        customersApi.getCustomers({ limit: 100 }).then(r => setCustomers(r.data?.data || [])).catch(() => {});
        suppliersApi.getSuppliers({ limit: 100 }).then(r => setSuppliers(r.data?.data || [])).catch(() => {});
        accountingApi.getChartOfAccounts().then(r => {
            const raw = r.data?.data || r.data || [];
            // Extract leaf accounts
            const leaves: any[] = [];
            const extract = (accs: any[]) => {
                accs.forEach(a => {
                    if (!a.is_group) leaves.push(a);
                    if (a.children && a.children.length) extract(a.children);
                });
            };
            extract(raw);
            // Fallback if not tree
            setAccounts(leaves.length > 0 ? leaves : raw.filter((a: any) => !a.is_group));
        }).catch(() => {});
        accountingApi.getBankAccounts().then(r => setBankAccounts(r.data?.data || r.data || [])).catch(() => {});
    }, []);

    const handleCreateSafe = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await treasuryApi.createSafe({ ...newSafeForm, account_id: newSafeForm.account_id || null, bank_account_id: newSafeForm.bank_account_id || null, balance: parseFloat(newSafeForm.balance || '0') });
            setNewSafeForm({ name: '', name_ar: '', type: 'cash', account_id: '', bank_account_id: '', balance: '' });
            fetchSafes();
        } catch {
            toast.error(isRTL ? 'حدث خطأ في إضافة الخزينة' : 'Error creating safe');
        }
    };

    const handleUpdateSafe = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await treasuryApi.updateSafe(editingSafe.id, editingSafe);
            toast.success(isRTL ? 'تم التعديل بنجاح' : 'Safe updated successfully');
            setEditingSafe(null);
            fetchSafes();
        } catch {
            toast.error(isRTL ? 'حدث خطأ' : 'Error updating safe');
        }
    };

    const handleDeleteSafe = async (safe: any) => {
        if (!await confirm(isRTL ? `هل أنت متأكد من حذف ${safe.name_ar || safe.name}؟` : `Are you sure you want to delete ${safe.name}?`)) return;
        try {
            await treasuryApi.deleteSafe(safe.id);
            toast.success(isRTL ? 'تم الحذف بنجاح' : 'Safe deleted successfully');
            fetchSafes();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || (isRTL ? 'لا يمكن الحذف' : 'Cannot delete safe'));
        }
    };

    const handleVoucherSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await treasuryApi.createVoucher({
                type: voucherForm.type,
                customer_id: voucherForm.party_type === 'customer' ? voucherForm.party_id : null,
                supplier_id: voucherForm.party_type === 'supplier' ? voucherForm.party_id : null,
                safe_id: voucherForm.safe_id,
                amount: parseFloat(voucherForm.amount),
                notes: voucherForm.notes,
                date: voucherForm.date,
            });
            setVoucherSuccess(isRTL ? 'تم إنشاء السند بنجاح!' : 'Voucher created successfully!');
            setVoucherForm({ type: 'receipt', party_type: 'customer', party_id: '', safe_id: '', amount: '', notes: '', date: new Date().toISOString().split('T')[0] });
            fetchSafes();
            setTimeout(() => setVoucherSuccess(''), 3000);
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Error creating voucher'); }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await treasuryApi.transfer({ ...transferForm, amount: parseFloat(transferForm.amount), fee_amount: transferForm.fee_amount ? parseFloat(transferForm.fee_amount) : 0 });
            setTransferForm({ from_safe_id: '', to_safe_id: '', amount: '', fee_amount: '', fee_percentage: '', description: '' });
            fetchSafes();
            toast.success(isRTL ? 'تم التحويل بنجاح' : 'Transfer completed!');
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Error'); }
    };

    const handleTransferAmountChange = (val: string) => {
        setTransferForm(f => {
            const amountNum = parseFloat(val) || 0;
            const feePctNum = parseFloat(f.fee_percentage) || 0;
            let newFeeAmount = f.fee_amount;
            if (f.fee_percentage !== '') {
                newFeeAmount = (amountNum * (feePctNum / 100)).toFixed(2);
            }
            return { ...f, amount: val, fee_amount: newFeeAmount };
        });
    };

    const handleFeePercentageChange = (val: string) => {
        setTransferForm(f => {
            const amountNum = parseFloat(f.amount) || 0;
            const feePctNum = parseFloat(val) || 0;
            const newFeeAmount = val === '' ? '' : (amountNum * (feePctNum / 100)).toFixed(2);
            return { ...f, fee_percentage: val, fee_amount: newFeeAmount };
        });
    };

    const handleFeeAmountChange = (val: string) => {
        setTransferForm(f => {
            const amountNum = parseFloat(f.amount) || 0;
            const feeAmountNum = parseFloat(val) || 0;
            let newFeePct = f.fee_percentage;
            if (amountNum > 0 && val !== '') {
                newFeePct = ((feeAmountNum / amountNum) * 100).toFixed(2);
            } else if (val === '') {
                newFeePct = '';
            }
            return { ...f, fee_amount: val, fee_percentage: newFeePct };
        });
    };

    const viewTransactions = async (safe: any) => {
        setSelectedSafe(safe);
        setLoadingTransactions(true);
        setSafeTransactions([]);
        try {
            const res = await treasuryApi.getSafeTransactions(safe.id, 1);
            setSafeTransactions(Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []));
        } catch {
            toast.error(isRTL ? 'حدث خطأ في جلب الحركات' : 'Error fetching transactions');
        } finally {
            setLoadingTransactions(false);
        }
    };

    const parties = voucherForm.party_type === 'customer' ? customers : suppliers;
    const totalBalance = safes.reduce((s, safe) => s + parseFloat(safe.balance || 0), 0);

    const tabs = [
        { key: 'safes', ar: 'الخزائن والبنوك', en: 'Safes & Banks' },
        { key: 'vouchers', ar: 'سندات القبض والصرف', en: 'Payment Vouchers' },
        { key: 'transactions', ar: 'تحويل الأموال', en: 'Fund Transfer' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600">
                    {isRTL ? 'الخزينة والبنوك' : 'Treasury & Cash Management'}
                </h1>
                <p className="text-slate-500 mt-1 text-sm">{isRTL ? 'إدارة الخزائن وسندات القبض والصرف' : 'Manage safes, vouchers and fund transfers'}</p>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-lg">
                    <p className="text-sm opacity-80">{isRTL ? 'إجمالي السيولة' : 'Total Liquidity'}</p>
                    <h2 className="text-3xl font-bold mt-1">{totalBalance.toFixed(2)}</h2>
                    <p className="text-xs mt-2 opacity-60">{safes.length} {isRTL ? 'خزينة/حساب' : 'safe(s)/account(s)'}</p>
                </div>
                {safes.map((safe: any) => (
                    <div key={safe.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                            <span>{safe.type === 'bank' ? '🏦' : '💵'}</span>
                            <span>{isRTL ? safe.name_ar || safe.name : safe.name}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{parseFloat(safe.balance).toFixed(2)}</h3>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as Tab)}
                            className={`px-5 py-3 text-sm font-medium transition border-b-2 ${tab === t.key ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                            {isRTL ? t.ar : t.en}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* --- Safes Tab --- */}
                    {tab === 'safes' && (
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* List */}
                            <div>
                                <h3 className="font-semibold mb-4">{isRTL ? 'الخزائن والحسابات البنكية' : 'Safes & Bank Accounts'}</h3>
                                <div className="space-y-3">
                                    {safes.map((safe: any) => (
                                        <div key={safe.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{safe.type === 'bank' ? '🏦' : (safe.type === 'wallet' ? '📱' : '💵')}</span>
                                                <div>
                                                    <p className="font-medium text-sm">{isRTL ? safe.name_ar || safe.name : safe.name}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{safe.type}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="font-bold text-emerald-600">{parseFloat(safe.balance).toFixed(2)}</span>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingSafe(safe)} className="text-xs text-amber-500 hover:underline">{isRTL ? 'تعديل' : 'Edit'}</button>
                                                    <button onClick={() => handleDeleteSafe(safe)} className="text-xs text-red-500 hover:underline">{isRTL ? 'حذف' : 'Delete'}</button>
                                                    <button onClick={() => viewTransactions(safe)} className="text-xs text-blue-500 hover:underline">{isRTL ? 'كشف الحساب' : 'Statement'}</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {safes.length === 0 && <p className="text-slate-400 text-sm text-center py-6">{isRTL ? 'لا توجد خزائن' : 'No safes yet'}</p>}
                                </div>
                            </div>

                            {/* New Safe */}
                            <div>
                                <h3 className="font-semibold mb-4">{isRTL ? 'إضافة خزينة/حساب بنكي' : 'Add Safe / Bank Account'}</h3>
                                <form onSubmit={handleCreateSafe} className="space-y-3">
                                    <input required placeholder={isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'} value={newSafeForm.name} onChange={e => setNewSafeForm(f => ({...f, name: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                    <input placeholder={isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'} value={newSafeForm.name_ar} onChange={e => setNewSafeForm(f => ({...f, name_ar: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                    <div className="grid grid-cols-2 gap-3">
                                        <select value={newSafeForm.type} onChange={e => setNewSafeForm(f => ({...f, type: e.target.value}))} className="p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                            <option value="cash">{isRTL ? 'نقدي' : 'Cash'}</option>
                                            <option value="bank">{isRTL ? 'بنكي' : 'Bank'}</option>
                                            <option value="wallet">{isRTL ? 'محفظة إلكترونية' : 'Mobile Wallet'}</option>
                                        </select>
                                        {newSafeForm.type !== 'bank' && (
                                            <input type="number" min="0" step="0.01" placeholder={isRTL ? 'الرصيد الابتدائي' : 'Opening Balance'} value={newSafeForm.balance} onChange={e => setNewSafeForm(f => ({...f, balance: e.target.value}))} className="p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                        )}
                                        {newSafeForm.type === 'bank' && (
                                            <div className="p-2.5 border rounded-lg bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm text-slate-500 flex items-center justify-center text-center">
                                                {isRTL ? 'يُحسب من الحساب البنكي' : 'Calculated from Bank'}
                                            </div>
                                        )}
                                    </div>
                                    {newSafeForm.type === 'bank' && (
                                        <select value={newSafeForm.bank_account_id} onChange={e => setNewSafeForm(f => ({...f, bank_account_id: e.target.value, account_id: ''}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                            <option value="">{isRTL ? '-- ربط بالحساب البنكي (اختياري) --' : '-- Link to Bank Account (Optional) --'}</option>
                                            {bankAccounts.filter((ba: any) => !safes.some((s: any) => s.bank_account_id === ba.id)).map((a: any) => <option key={a.id} value={a.id}>{a.bank_name ? `${a.bank_name} - ` : ''}{isRTL ? a.name_ar || a.name : a.name}</option>)}
                                        </select>
                                    )}
                                    {(newSafeForm.type === 'wallet' || newSafeForm.type === 'cash') && (
                                        <select value={newSafeForm.account_id} onChange={e => setNewSafeForm(f => ({...f, account_id: e.target.value, bank_account_id: ''}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                            <option value="">{isRTL ? '-- ربط بحساب دفتري في شجرة الحسابات (اختياري) --' : '-- Link to Ledger Account (Optional) --'}</option>
                                            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {isRTL ? a.name_ar || a.name : a.name}</option>)}
                                        </select>
                                    )}
                                    <button type="submit" className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium">
                                        {isRTL ? '+ إضافة خزينة' : '+ Add Safe'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* --- Vouchers Tab --- */}
                    {tab === 'vouchers' && (
                        <div className="max-w-2xl mx-auto">
                            <h3 className="font-semibold mb-5">{isRTL ? 'إنشاء سند قبض / صرف' : 'Create Receipt / Payment Voucher'}</h3>
                            {voucherSuccess && (
                                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl border border-green-200 text-sm font-medium">{voucherSuccess}</div>
                            )}
                            <form onSubmit={handleVoucherSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'نوع السند' : 'Voucher Type'}</label>
                                        <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                            {[['receipt', isRTL ? 'قبض' : 'Receipt'], ['payment', isRTL ? 'صرف' : 'Payment']].map(([v, l]) => (
                                                <button key={v} type="button" onClick={() => setVoucherForm(f => ({...f, type: v}))}
                                                    className={`flex-1 py-2.5 text-sm font-medium transition ${voucherForm.type === v ? (v === 'receipt' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'}`}>
                                                    {l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الجهة' : 'Party Type'}</label>
                                        <select value={voucherForm.party_type} onChange={e => setVoucherForm(f => ({...f, party_type: e.target.value, party_id: ''}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                            <option value="customer">{isRTL ? 'عميل' : 'Customer'}</option>
                                            <option value="supplier">{isRTL ? 'مورد' : 'Supplier'}</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{voucherForm.party_type === 'customer' ? (isRTL ? 'العميل' : 'Customer') : (isRTL ? 'المورد' : 'Supplier')} *</label>
                                    <select required value={voucherForm.party_id} onChange={e => setVoucherForm(f => ({...f, party_id: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                        <option value="">{isRTL ? '--  اختر --' : '-- Select --'}</option>
                                        {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الخزينة/الحساب' : 'Safe / Account'} *</label>
                                        <select required value={voucherForm.safe_id} onChange={e => setVoucherForm(f => ({...f, safe_id: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                            <option value="">{isRTL ? '-- اختر --' : '-- Select --'}</option>
                                            {safes.map((s: any) => <option key={s.id} value={s.id}>{isRTL ? s.name_ar || s.name : s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'المبلغ' : 'Amount'} *</label>
                                        <input required type="number" min="0.01" step="0.01" value={voucherForm.amount} onChange={e => setVoucherForm(f => ({...f, amount: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'التاريخ' : 'Date'}</label>
                                    <input type="date" value={voucherForm.date} onChange={e => setVoucherForm(f => ({...f, date: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'البيان' : 'Description / Notes'}</label>
                                    <textarea value={voucherForm.notes} onChange={e => setVoucherForm(f => ({...f, notes: e.target.value}))} rows={2} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                </div>

                                <button type="submit" className={`w-full py-3 text-white rounded-xl font-semibold transition shadow-sm ${voucherForm.type === 'receipt' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    {voucherForm.type === 'receipt' ? (isRTL ? '→ إنشاء سند قبض' : '→ Create Receipt Voucher') : (isRTL ? '← إنشاء سند صرف' : '← Create Payment Voucher')}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* --- Transfer Tab --- */}
                    {tab === 'transactions' && (
                        <div className="max-w-lg mx-auto">
                            <h3 className="font-semibold mb-5">{isRTL ? 'تحويل بين الخزائن' : 'Transfer Between Safes'}</h3>
                            <form onSubmit={handleTransfer} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'من الخزينة' : 'From Safe'} *</label>
                                    <select required value={transferForm.from_safe_id} onChange={e => setTransferForm(f => ({...f, from_safe_id: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                        <option value="">{isRTL ? '-- اختر --' : '-- Select --'}</option>
                                        {safes.map((s: any) => <option key={s.id} value={s.id}>{isRTL ? s.name_ar || s.name : s.name} ({parseFloat(s.balance).toFixed(2)})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'إلى الخزينة' : 'To Safe'} *</label>
                                    <select required value={transferForm.to_safe_id} onChange={e => setTransferForm(f => ({...f, to_safe_id: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                        <option value="">{isRTL ? '-- اختر --' : '-- Select --'}</option>
                                        {safes.filter(s => s.id !== transferForm.from_safe_id).map((s: any) => <option key={s.id} value={s.id}>{isRTL ? s.name_ar || s.name : s.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'المبلغ المحول' : 'Amount'} *</label>
                                        <input required type="number" min="0.01" step="0.01" value={transferForm.amount} onChange={e => handleTransferAmountChange(e.target.value)} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                    </div>
                                    <div>
                                        <label className="flex justify-between items-center mb-1.5">
                                            <span className="block text-sm font-medium text-orange-600 dark:text-orange-400">{isRTL ? 'رسوم التحويل' : 'Transfer Fees'}</span>
                                            <span className="text-xs text-slate-500 font-normal">{isRTL ? 'نسبة أو مبلغ' : 'Amount or %'}</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="relative w-1/3">
                                                <input type="number" min="0" step="0.01" value={transferForm.fee_percentage} onChange={e => handleFeePercentageChange(e.target.value)} placeholder="%" className="w-full p-2.5 pr-7 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm" dir="ltr"/>
                                                <span className="absolute right-2.5 top-2.5 text-slate-400 text-sm">%</span>
                                            </div>
                                            <div className="relative flex-1">
                                                <input type="number" min="0" step="0.01" value={transferForm.fee_amount} onChange={e => handleFeeAmountChange(e.target.value)} placeholder="0.00" className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'البيان' : 'Description'}</label>
                                    <input value={transferForm.description} onChange={e => setTransferForm(f => ({...f, description: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                </div>
                                <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition">
                                    {isRTL ? '⇄ تنفيذ التحويل' : '⇄ Execute Transfer'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Transactions Modal */}
            {selectedSafe && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                        <div className="p-5 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <div>
                                <h2 className="text-lg font-bold">{isRTL ? 'كشف حساب' : 'Statement'} - {isRTL ? selectedSafe.name_ar || selectedSafe.name : selectedSafe.name}</h2>
                                <p className="text-sm text-slate-500 mt-1">{isRTL ? 'الرصيد الحالي:' : 'Current Balance:'} <span className="font-bold text-emerald-600">{parseFloat(selectedSafe.balance).toFixed(2)}</span></p>
                            </div>
                            <button onClick={() => setSelectedSafe(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl leading-none" aria-label={isRTL ? 'إغلاق' : 'Close'}>&times;</button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1">
                            {loadingTransactions ? (
                                <div className="p-10 text-center text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                            ) : (
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                                        <tr>
                                            <th className="p-3 font-medium text-slate-500">{isRTL ? 'التاريخ' : 'Date'}</th>
                                            <th className="p-3 font-medium text-slate-500">{isRTL ? 'النوع' : 'Type'}</th>
                                            <th className="p-3 font-medium text-slate-500">{isRTL ? 'البيان' : 'Description'}</th>
                                            <th className="p-3 font-medium text-slate-500 text-right">{isRTL ? 'المبلغ' : 'Amount'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {safeTransactions.map(tx => (
                                            <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 text-xs rounded-lg font-medium ${tx.type === 'deposit' || tx.type === 'transfer_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-slate-700 dark:text-slate-300">{tx.description}</td>
                                                <td className={`p-3 font-bold text-right ${tx.type === 'deposit' || tx.type === 'transfer_in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {tx.type === 'deposit' || tx.type === 'transfer_in' ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                        {safeTransactions.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-slate-400">{isRTL ? 'لا توجد حركات' : 'No transactions found'}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-right">
                            <button onClick={() => setSelectedSafe(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-medium">
                                {isRTL ? 'إغلاق' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Safe Modal */}
            {editingSafe && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="p-5 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <h2 className="text-lg font-bold">{isRTL ? 'تعديل خزينة/حساب' : 'Edit Safe/Account'}</h2>
                            <button onClick={() => setEditingSafe(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl leading-none" aria-label={isRTL ? 'إغلاق' : 'Close'}>&times;</button>
                        </div>
                        <form onSubmit={handleUpdateSafe} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'}</label>
                                <input required value={editingSafe.name} onChange={e => setEditingSafe({...editingSafe, name: e.target.value})} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'}</label>
                                <input value={editingSafe.name_ar || ''} onChange={e => setEditingSafe({...editingSafe, name_ar: e.target.value})} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'النوع' : 'Type'}</label>
                                    <select value={editingSafe.type} onChange={e => setEditingSafe({...editingSafe, type: e.target.value})} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                        <option value="cash">{isRTL ? 'نقدي' : 'Cash'}</option>
                                        <option value="bank">{isRTL ? 'بنكي' : 'Bank'}</option>
                                        <option value="wallet">{isRTL ? 'محفظة إلكترونية' : 'Mobile Wallet'}</option>
                                    </select>
                                </div>
                                {editingSafe.type !== 'bank' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الرصيد الابتدائي' : 'Opening Balance'}</label>
                                        <input type="number" min="0" step="0.01" value={editingSafe.balance} onChange={e => setEditingSafe({...editingSafe, balance: e.target.value})} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                    </div>
                                )}
                                {editingSafe.type === 'bank' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الرصيد الابتدائي' : 'Opening Balance'}</label>
                                        <div className="w-full p-2.5 border rounded-lg bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm text-slate-500 flex items-center">
                                            {isRTL ? 'يُحسب من الحساب البنكي' : 'Calculated from Bank'}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {editingSafe.type === 'bank' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الحساب البنكي (اختياري)' : 'Bank Account (Optional)'}</label>
                                    <select value={editingSafe.bank_account_id || ''} onChange={e => setEditingSafe({...editingSafe, bank_account_id: e.target.value, account_id: null})} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                        <option value="">{isRTL ? '-- اختر الحساب البنكي --' : '-- Select Bank Account --'}</option>
                                        {bankAccounts.filter((ba: any) => !safes.some((s: any) => s.bank_account_id === ba.id && s.id !== editingSafe.id)).map((a: any) => <option key={a.id} value={a.id}>{a.bank_name ? `${a.bank_name} - ` : ''}{isRTL ? a.name_ar || a.name : a.name}</option>)}
                                    </select>
                                </div>
                            )}
                            {(editingSafe.type === 'wallet' || editingSafe.type === 'cash') && (
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الحساب الدفتري (اختياري)' : 'Ledger Account (Optional)'}</label>
                                    <select value={editingSafe.account_id || ''} onChange={e => setEditingSafe({...editingSafe, account_id: e.target.value, bank_account_id: null})} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                        <option value="">{isRTL ? '-- اختر الحساب الدفتري --' : '-- Select Ledger Account --'}</option>
                                        {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {isRTL ? a.name_ar || a.name : a.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium">
                                    {isRTL ? 'حفظ' : 'Save'}
                                </button>
                                <button type="button" onClick={() => setEditingSafe(null)} className="flex-1 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-medium">
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
