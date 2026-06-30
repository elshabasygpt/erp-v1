"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { accountingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

interface AccountBalance {
    account_id: string;
    code: string;
    name: string;
    name_ar: string;
    type: string;
    debit: number;
    credit: number;
    balance: number;
}

const TYPE_COLORS: Record<string, string> = {
    asset:     '#10b981',
    liability: '#ef4444',
    equity:    '#8b5cf6',
    revenue:   '#10b981',
    expense:   '#f59e0b',
};

export default function OpeningBalancesPage() {
    const { isRTL } = useLanguage();

    const [balances, setBalances] = useState<AccountBalance[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState<'account' | 'customer' | 'supplier'>('account');

    const [form, setForm] = useState({
        account_id:  '',
        customer_id: '',
        supplier_id: '',
        debit:  '',
        credit: '',
        amount: '',
        notes:  '',
    });

    const load = useCallback(async () => {
        try {
            const [balRes, accRes] = await Promise.all([
                accountingApi.getOpeningBalances(),
                accountingApi.getChartOfAccounts(),
            ]);
            setBalances(balRes.data?.data || balRes.data || []);
            setAccounts(accRes.data?.data || accRes.data || []);
        } catch { toast.error(isRTL ? 'فشل التحميل' : 'Load failed'); }
        finally  { setLoading(false); }
    }, [isRTL]);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        setSaving(true);
        try {
            if (formType === 'account') {
                await accountingApi.setAccountOpeningBalance({
                    account_id: form.account_id,
                    debit:  form.debit  ? Number(form.debit)  : undefined,
                    credit: form.credit ? Number(form.credit) : undefined,
                    notes:  form.notes || undefined,
                });
            } else if (formType === 'customer') {
                await accountingApi.setCustomerOpeningBalance({
                    customer_id: form.customer_id,
                    amount: Number(form.amount),
                });
            } else {
                await accountingApi.setSupplierOpeningBalance({
                    supplier_id: form.supplier_id,
                    amount: Number(form.amount),
                });
            }
            toast.success(isRTL ? '✅ تم ترحيل الرصيد الافتتاحي' : '✅ Opening balance posted');
            setShowForm(false);
            setForm({ account_id: '', customer_id: '', supplier_id: '', debit: '', credit: '', amount: '', notes: '' });
            await load();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || (isRTL ? 'فشل' : 'Failed'));
        } finally { setSaving(false); }
    };

    const fmt = (n: number) => n?.toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 });

    // Totals by type
    const totalsByType = balances.reduce((acc: Record<string, { debit: number; credit: number }>, b) => {
        if (!acc[b.type]) acc[b.type] = { debit: 0, credit: 0 };
        acc[b.type].debit  += b.debit;
        acc[b.type].credit += b.credit;
        return acc;
    }, {});

    const totalDebit  = balances.reduce((s, b) => s + b.debit,  0);
    const totalCredit = balances.reduce((s, b) => s + b.credit, 0);
    const balanced    = Math.abs(totalDebit - totalCredit) < 0.01;

    if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;

    return (
        <div className="space-y-6 p-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        🔓 {isRTL ? 'الأرصدة الافتتاحية' : 'Opening Balances'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'ترحيل الأرصدة الافتتاحية للحسابات والعملاء والموردين'
                                : 'Post opening balances for GL accounts, customers, and suppliers'}
                    </p>
                </div>
                <button onClick={() => { setShowForm(true); setFormType('account'); }} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'ترحيل رصيد' : 'Post Balance'}
                </button>
            </div>

            {/* Balance check banner */}
            <div className={`p-4 rounded-xl flex items-center gap-3 ${balanced ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                <span className="text-2xl">{balanced ? '✅' : '⚠️'}</span>
                <div>
                    <p className="font-semibold text-sm" style={{ color: balanced ? '#10b981' : '#f59e0b' }}>
                        {balanced
                            ? (isRTL ? 'الأرصدة متوازنة' : 'Balances are in balance')
                            : (isRTL ? 'الأرصدة غير متوازنة — تحقق من القيود' : 'Out of balance — review entries')}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'مجموع المدين' : 'Total Debit'}: {fmt(totalDebit)}
                        &nbsp;&nbsp;|&nbsp;&nbsp;
                        {isRTL ? 'مجموع الدائن' : 'Total Credit'}: {fmt(totalCredit)}
                    </p>
                </div>
            </div>

            {/* Type breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(totalsByType).map(([type, totals]) => (
                    <div key={type} className="stat-card text-center">
                        <p className="text-xs mb-1 font-semibold" style={{ color: TYPE_COLORS[type] ?? '#64748b' }}>
                            {isRTL
                                ? type === 'asset' ? 'أصول' : type === 'liability' ? 'خصوم' : type === 'equity' ? 'حقوق ملكية' : type === 'revenue' ? 'إيرادات' : 'مصروفات'
                                : type.charAt(0).toUpperCase() + type.slice(1)}
                        </p>
                        <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                            {fmt(totals.debit - totals.credit)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Balances table */}
            <div className="glass-card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table text-sm">
                        <thead>
                            <tr>
                                <th>{isRTL ? 'الكود' : 'Code'}</th>
                                <th>{isRTL ? 'اسم الحساب' : 'Account'}</th>
                                <th>{isRTL ? 'النوع' : 'Type'}</th>
                                <th className="text-end">{isRTL ? 'مدين' : 'Debit'}</th>
                                <th className="text-end">{isRTL ? 'دائن' : 'Credit'}</th>
                                <th className="text-end">{isRTL ? 'الرصيد' : 'Balance'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {balances.filter(b => b.debit > 0 || b.credit > 0).map(b => (
                                <tr key={b.account_id}>
                                    <td className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{b.code}</td>
                                    <td style={{ color: 'var(--text-primary)' }}>{isRTL ? b.name_ar || b.name : b.name}</td>
                                    <td>
                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                            style={{ background: `${TYPE_COLORS[b.type] ?? '#64748b'}20`, color: TYPE_COLORS[b.type] ?? '#64748b' }}>
                                            {isRTL
                                                ? b.type === 'asset' ? 'أصل' : b.type === 'liability' ? 'خصم' : b.type === 'equity' ? 'ملكية' : b.type === 'revenue' ? 'إيراد' : 'مصروف'
                                                : b.type}
                                        </span>
                                    </td>
                                    <td className="text-end text-xs" style={{ color: b.debit > 0 ? '#10b981' : 'var(--text-muted)' }}>
                                        {b.debit > 0 ? fmt(b.debit) : '—'}
                                    </td>
                                    <td className="text-end text-xs" style={{ color: b.credit > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                        {b.credit > 0 ? fmt(b.credit) : '—'}
                                    </td>
                                    <td className="text-end font-bold" style={{ color: b.balance >= 0 ? '#10b981' : '#ef4444' }}>
                                        {fmt(Math.abs(b.balance))} {b.balance < 0 ? (isRTL ? 'د' : 'Cr') : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-input)', fontWeight: 'bold' }}>
                                <td colSpan={3} className="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {isRTL ? 'المجموع' : 'Total'}
                                </td>
                                <td className="text-end text-sm" style={{ color: '#10b981' }}>{fmt(totalDebit)}</td>
                                <td className="text-end text-sm" style={{ color: '#ef4444' }}>{fmt(totalCredit)}</td>
                                <td className="text-end text-sm" style={{ color: balanced ? '#10b981' : '#f59e0b' }}>
                                    {fmt(Math.abs(totalDebit - totalCredit))}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                    {balances.filter(b => b.debit > 0 || b.credit > 0).length === 0 && (
                        <div className="text-center py-12">
                            <span className="text-4xl block mb-3">🔓</span>
                            <p style={{ color: 'var(--text-muted)' }}>
                                {isRTL ? 'لا توجد أرصدة افتتاحية بعد' : 'No opening balances posted yet'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                🔓 {isRTL ? 'ترحيل رصيد افتتاحي' : 'Post Opening Balance'}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Type selector */}
                            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-default)' }}>
                                {([
                                    { val: 'account',  label: isRTL ? '📒 حساب'  : '📒 Account'  },
                                    { val: 'customer', label: isRTL ? '👤 عميل'   : '👤 Customer' },
                                    { val: 'supplier', label: isRTL ? '🏪 مورد'   : '🏪 Supplier' },
                                ] as const).map(opt => (
                                    <button key={opt.val} onClick={() => setFormType(opt.val)}
                                        className="flex-1 py-2 text-sm font-semibold transition"
                                        style={formType === opt.val
                                            ? { background: '#10b981', color: '#fff' }
                                            : { background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {formType === 'account' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                                            {isRTL ? 'الحساب *' : 'Account *'}
                                        </label>
                                        <select className="select-field w-full py-2 text-sm" value={form.account_id}
                                            onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                                            <option value="">{isRTL ? '-- اختر --' : '-- Select --'}</option>
                                            {accounts.map((a: any) => (
                                                <option key={a.id} value={a.id}>{a.code} — {isRTL ? a.name_ar || a.name : a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                                                {isRTL ? 'مدين' : 'Debit'}
                                            </label>
                                            <input type="number" min="0" className="input-field w-full py-2 text-sm" dir="ltr"
                                                value={form.debit} onChange={e => setForm(f => ({ ...f, debit: e.target.value, credit: '' }))} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                                                {isRTL ? 'دائن' : 'Credit'}
                                            </label>
                                            <input type="number" min="0" className="input-field w-full py-2 text-sm" dir="ltr"
                                                value={form.credit} onChange={e => setForm(f => ({ ...f, credit: e.target.value, debit: '' }))} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                                            {isRTL ? 'ملاحظات' : 'Notes'}
                                        </label>
                                        <input className="input-field w-full py-2 text-sm" value={form.notes}
                                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                                    </div>
                                </>
                            )}

                            {(formType === 'customer' || formType === 'supplier') && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                                            {formType === 'customer' ? (isRTL ? 'معرف العميل' : 'Customer ID') : (isRTL ? 'معرف المورد' : 'Supplier ID')}
                                        </label>
                                        <input className="input-field w-full py-2 text-sm" dir="ltr"
                                            placeholder="UUID..."
                                            value={formType === 'customer' ? form.customer_id : form.supplier_id}
                                            onChange={e => setForm(f => formType === 'customer'
                                                ? { ...f, customer_id: e.target.value }
                                                : { ...f, supplier_id: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                                            {isRTL ? 'المبلغ (موجب = مدين، سالب = دائن)' : 'Amount (positive = owe us, negative = we owe)'}
                                        </label>
                                        <input type="number" className="input-field w-full py-2 text-sm" dir="ltr"
                                            value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: '1px solid var(--border-default)' }}>
                            <button onClick={() => setShowForm(false)} className="btn-secondary" disabled={saving}>
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button onClick={save} className="btn-primary" disabled={saving}>
                                {saving ? '...' : (isRTL ? 'ترحيل' : 'Post')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
