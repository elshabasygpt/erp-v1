"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { treasuryApi, customersApi, suppliersApi } from '@/lib/api';

type Tab = 'safes' | 'vouchers' | 'transactions';

export default function TreasuryPage() {
    const { isRTL, locale } = useLanguage();
    const [tab, setTab] = useState<Tab>('safes');
    const [safes, setSafes] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Voucher form state
    const [voucherForm, setVoucherForm] = useState({ type: 'receipt', party_type: 'customer', party_id: '', safe_id: '', amount: '', notes: '', date: new Date().toISOString().split('T')[0] });
    const [voucherSuccess, setVoucherSuccess] = useState('');

    // Transfer form state
    const [transferForm, setTransferForm] = useState({ from_safe_id: '', to_safe_id: '', amount: '', description: '' });
    
    // New safe form
    const [newSafeForm, setNewSafeForm] = useState({ name: '', name_ar: '', type: 'cash', balance: '' });

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
    }, []);

    const handleCreateSafe = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await treasuryApi.createSafe({ ...newSafeForm, balance: parseFloat(newSafeForm.balance || '0') });
            setNewSafeForm({ name: '', name_ar: '', type: 'cash', balance: '' });
            fetchSafes();
        } catch (err: any) { alert(err?.response?.data?.message || 'Error'); }
    };

    const handleVoucherSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await treasuryApi.createVoucher({
                voucher_type: voucherForm.type,
                party_type: voucherForm.party_type,
                party_id: voucherForm.party_id,
                safe_id: voucherForm.safe_id,
                amount: parseFloat(voucherForm.amount),
                notes: voucherForm.notes,
                date: voucherForm.date,
            });
            setVoucherSuccess(isRTL ? 'تم إنشاء السند بنجاح!' : 'Voucher created successfully!');
            setVoucherForm({ type: 'receipt', party_type: 'customer', party_id: '', safe_id: '', amount: '', notes: '', date: new Date().toISOString().split('T')[0] });
            fetchSafes();
            setTimeout(() => setVoucherSuccess(''), 3000);
        } catch (err: any) { alert(err?.response?.data?.message || 'Error creating voucher'); }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await treasuryApi.transfer({ ...transferForm, amount: parseFloat(transferForm.amount) });
            setTransferForm({ from_safe_id: '', to_safe_id: '', amount: '', description: '' });
            fetchSafes();
            alert(isRTL ? 'تم التحويل بنجاح' : 'Transfer completed!');
        } catch (err: any) { alert(err?.response?.data?.message || 'Error'); }
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-lg">
                    <p className="text-sm opacity-80">{isRTL ? 'إجمالي السيولة' : 'Total Liquidity'}</p>
                    <h2 className="text-3xl font-bold mt-1">{totalBalance.toFixed(2)}</h2>
                    <p className="text-xs mt-2 opacity-60">{safes.length} {isRTL ? 'خزينة/حساب' : 'safe(s)/account(s)'}</p>
                </div>
                {safes.slice(0, 2).map((safe: any) => (
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
                                                <span className="text-2xl">{safe.type === 'bank' ? '🏦' : '💵'}</span>
                                                <div>
                                                    <p className="font-medium text-sm">{isRTL ? safe.name_ar || safe.name : safe.name}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{safe.type}</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-emerald-600">{parseFloat(safe.balance).toFixed(2)}</span>
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
                                        </select>
                                        <input type="number" min="0" step="0.01" placeholder={isRTL ? 'الرصيد الابتدائي' : 'Opening Balance'} value={newSafeForm.balance} onChange={e => setNewSafeForm(f => ({...f, balance: e.target.value}))} className="p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                    </div>
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
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'المبلغ' : 'Amount'} *</label>
                                    <input required type="number" min="0.01" step="0.01" value={transferForm.amount} onChange={e => setTransferForm(f => ({...f, amount: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
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
        </div>
    );
}
