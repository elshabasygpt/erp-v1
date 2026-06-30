"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useLanguage } from '@/i18n/LanguageContext';
import { accountingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, BarChart2, ChevronDown, ChevronRight, Check } from 'lucide-react';
import dayjs from 'dayjs';
import { CardSkeleton } from '@/components/ui/Skeleton';

interface Budget {
    id: string;
    name: string;
    fiscal_year: string;
    period_start: string;
    period_end: string;
    status: 'draft' | 'approved' | 'closed';
    notes?: string;
    items_count?: number;
}

interface VarianceItem {
    account_id: string;
    account_code: string;
    account_name: string;
    account_name_ar: string;
    account_type: string;
    budgeted: number;
    actual: number;
    variance: number;
    variance_pct: number | null;
}

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const;

const STATUS_COLORS: Record<string, string> = {
    draft:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    approved: 'bg-green-500/10 text-green-400 border-green-500/30',
    closed:   'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

export default function BudgetsPage() {
    const { isRTL } = useLanguage();
    const confirm = useConfirm();

    const [budgets, setBudgets]         = useState<Budget[]>([]);
    const [loading, setLoading]         = useState(true);
    const [loadError, setLoadError]     = useState(false);
    const [showForm, setShowForm]       = useState(false);
    const [editId, setEditId]           = useState<string | null>(null);
    const [varianceBudget, setVarianceBudget] = useState<string | null>(null);
    const [varianceData, setVarianceData]     = useState<any>(null);
    const [varianceLoading, setVarianceLoading] = useState(false);
    const [accounts, setAccounts]       = useState<any[]>([]);
    const [saving, setSaving]           = useState(false);

    const emptyForm = {
        name: '', fiscal_year: String(new Date().getFullYear()),
        period_start: `${new Date().getFullYear()}-01-01`,
        period_end:   `${new Date().getFullYear()}-12-31`,
        notes: '',
        items: [] as Array<{ account_id: string; notes: string } & Record<string, number>>,
    };
    const [form, setForm] = useState(emptyForm);

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const [budgetsRes, accountsRes] = await Promise.all([
                accountingApi.getBudgets(),
                accountingApi.getChartOfAccounts(),
            ]);
            setBudgets(budgetsRes.data?.data || budgetsRes.data || []);
            setAccounts(accountsRes.data?.data || accountsRes.data || []);
        } catch { setLoadError(true); toast.error(isRTL ? 'فشل التحميل' : 'Load failed'); }
        finally  { setLoading(false); }
    }, [isRTL]);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
    const openEdit = async (b: Budget) => {
        try {
            const res = await accountingApi.getBudget(b.id);
            const data = res.data?.data || res.data;
            setForm({
                name: data.name, fiscal_year: data.fiscal_year,
                period_start: data.period_start, period_end: data.period_end,
                notes: data.notes || '',
                items: (data.items || []).map((it: any) => ({
                    account_id: it.account_id, notes: it.notes || '',
                    jan: it.jan, feb: it.feb, mar: it.mar, apr: it.apr,
                    may: it.may, jun: it.jun, jul: it.jul, aug: it.aug,
                    sep: it.sep, oct: it.oct, nov: it.nov, dec: it.dec,
                })),
            });
            setEditId(b.id);
            setShowForm(true);
        } catch { toast.error(isRTL ? 'فشل التحميل' : 'Load failed'); }
    };

    const addItem = () => {
        const baseMonths: Record<string, number> = {};
        MONTHS.forEach(m => { baseMonths[m] = 0; });
        setForm(f => ({ ...f, items: [...f.items, { account_id: accounts[0]?.id || '', notes: '', ...baseMonths } as { account_id: string; notes: string } & Record<string, number>] }));
    };
    const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
    const updateItem = (i: number, field: string, value: any) =>
        setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [field]: value } : it) }));

    const save = async () => {
        if (!form.name) return;
        setSaving(true);
        try {
            const payload = {
                ...form,
                items: form.items.map(it => {
                    const months: Record<string, number> = {};
                    MONTHS.forEach(m => { months[m] = Number(it[m] || 0); });
                    return { account_id: it.account_id, notes: it.notes, ...months };
                }),
            };
            if (editId) {
                await accountingApi.updateBudget(editId, payload);
                toast.success(isRTL ? '✅ تم التحديث' : '✅ Updated');
            } else {
                await accountingApi.createBudget(payload);
                toast.success(isRTL ? '✅ تم الإنشاء' : '✅ Created');
            }
            setShowForm(false);
            await load();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || (isRTL ? 'فشل الحفظ' : 'Save failed'));
        } finally { setSaving(false); }
    };

    const deleteBudget = async (id: string) => {
        if (!await confirm(isRTL ? 'حذف الميزانية؟' : 'Delete budget?')) return;
        try {
            await accountingApi.deleteBudget(id);
            setBudgets(b => b.filter(x => x.id !== id));
            toast.success('🗑️');
        } catch (e: any) {
            toast.error(e?.response?.data?.message || (isRTL ? 'فشل الحذف' : 'Delete failed'));
        }
    };

    const approveBudget = async (id: string) => {
        try {
            await accountingApi.approveBudget(id);
            setBudgets(b => b.map(x => x.id === id ? { ...x, status: 'approved' } : x));
            toast.success(isRTL ? '✅ تمت الموافقة' : '✅ Approved');
        } catch { toast.error(isRTL ? 'فشل' : 'Failed'); }
    };

    const loadVariance = async (id: string) => {
        if (varianceBudget === id) { setVarianceBudget(null); return; }
        setVarianceBudget(id);
        setVarianceLoading(true);
        try {
            const res = await accountingApi.getBudgetVariance(id);
            setVarianceData(res.data?.data || res.data);
        } catch { toast.error(isRTL ? 'فشل تحميل التقرير' : 'Variance load failed'); }
        finally { setVarianceLoading(false); }
    };

    const statusLabel = (s: string) => {
        if (isRTL) return s === 'draft' ? 'مسودة' : s === 'approved' ? 'معتمدة' : 'مغلقة';
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    return (
        <div className="space-y-6 p-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        📊 {isRTL ? 'الميزانية التقديرية' : 'Budgets'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'إنشاء وإدارة الميزانيات ومقارنتها بالفعلي' : 'Create and manage budgets, compare with actuals'}
                    </p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'ميزانية جديدة' : 'New Budget'}
                </button>
            </div>

            {/* Budget list */}
            <div className="space-y-4">
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                    </div>
                )}

                {!loading && loadError && (
                    <div className="glass-card p-12 text-center">
                        <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                            {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                        </p>
                        <button onClick={() => load()} className="btn-secondary py-1.5 px-4 text-xs">
                            🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                        </button>
                    </div>
                )}

                {!loading && !loadError && budgets.length === 0 && (
                    <div className="glass-card p-12 text-center">
                        <span className="text-5xl block mb-3">📊</span>
                        <p style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'لا توجد ميزانيات بعد' : 'No budgets yet'}
                        </p>
                        <button onClick={openCreate} className="btn-primary mt-4">
                            {isRTL ? 'أنشئ ميزانيتك الأولى' : 'Create your first budget'}
                        </button>
                    </div>
                )}

                {!loading && !loadError && budgets.map(b => (
                    <div key={b.id} className="glass-card p-0 overflow-hidden">
                        <div className="p-4 flex items-center gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{b.name}</h3>
                                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[b.status]}`}>
                                        {statusLabel(b.status)}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                                        {b.fiscal_year}
                                    </span>
                                </div>
                                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    {dayjs(b.period_start).format('DD MMM YYYY')} → {dayjs(b.period_end).format('DD MMM YYYY')}
                                    {b.items_count !== undefined && <span className="ms-3">· {b.items_count} {isRTL ? 'بند' : 'items'}</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => loadVariance(b.id)} title={isRTL ? 'تقرير الانحراف' : 'Variance Report'}
                                    className="btn-icon text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border"
                                    style={{ borderColor: 'rgba(139,92,246,0.3)' }}>
                                    <BarChart2 className="w-4 h-4" />
                                    {isRTL ? 'انحراف' : 'Variance'}
                                    {varianceBudget === b.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                                {b.status === 'draft' && (
                                    <button onClick={() => approveBudget(b.id)} title={isRTL ? 'اعتماد' : 'Approve'}
                                        className="btn-icon text-green-400 hover:text-green-300">
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                                {b.status !== 'closed' && (
                                    <button onClick={() => openEdit(b)} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                                )}
                                {b.status === 'draft' && (
                                    <button onClick={() => deleteBudget(b.id)} className="btn-icon hover:!text-red-400">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Variance panel */}
                        {varianceBudget === b.id && (
                            <div style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-card)' }} className="p-4">
                                {varianceLoading ? (
                                    <div className="text-center py-4 text-slate-400">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</div>
                                ) : varianceData ? (
                                    <>
                                        {/* Summary cards */}
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            {[
                                                { label: isRTL ? 'المخطط' : 'Budgeted', val: varianceData.summary?.total_budgeted, color: '#0ea5e9' },
                                                { label: isRTL ? 'الفعلي' : 'Actual',   val: varianceData.summary?.total_actual,   color: '#10b981' },
                                                { label: isRTL ? 'الانحراف' : 'Variance', val: varianceData.summary?.total_variance, color: varianceData.summary?.total_variance >= 0 ? '#10b981' : '#ef4444' },
                                            ].map((s, i) => (
                                                <div key={i} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-input)' }}>
                                                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                                                    <p className="text-lg font-bold" style={{ color: s.color }}>
                                                        {Number(s.val || 0).toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 0 })}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Detail table */}
                                        <div className="overflow-x-auto">
                                            <table className="data-table text-sm">
                                                <thead>
                                                    <tr>
                                                        <th>{isRTL ? 'الحساب' : 'Account'}</th>
                                                        <th className="text-end">{isRTL ? 'المخطط' : 'Budgeted'}</th>
                                                        <th className="text-end">{isRTL ? 'الفعلي' : 'Actual'}</th>
                                                        <th className="text-end">{isRTL ? 'الانحراف' : 'Variance'}</th>
                                                        <th className="text-end">{isRTL ? 'النسبة' : '%'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(varianceData.items || []).map((item: VarianceItem) => (
                                                        <tr key={item.account_id}>
                                                            <td>
                                                                <span className="text-xs text-slate-500 me-2">{item.account_code}</span>
                                                                {isRTL ? item.account_name_ar : item.account_name}
                                                            </td>
                                                            <td className="text-end" style={{ color: 'var(--text-secondary)' }}>
                                                                {item.budgeted.toLocaleString()}
                                                            </td>
                                                            <td className="text-end" style={{ color: 'var(--text-secondary)' }}>
                                                                {item.actual.toLocaleString()}
                                                            </td>
                                                            <td className="text-end font-semibold" style={{ color: item.variance >= 0 ? '#10b981' : '#ef4444' }}>
                                                                {item.variance > 0 ? '+' : ''}{item.variance.toLocaleString()}
                                                            </td>
                                                            <td className="text-end text-xs" style={{ color: 'var(--text-muted)' }}>
                                                                {item.variance_pct !== null ? `${item.variance_pct}%` : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-4xl my-6 rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                {editId ? (isRTL ? '✏️ تعديل ميزانية' : '✏️ Edit Budget') : (isRTL ? '➕ ميزانية جديدة' : '➕ New Budget')}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="btn-icon" aria-label={isRTL ? 'إغلاق' : 'Close'}>✕</button>
                        </div>
                        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                            {/* Basic info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'اسم الميزانية *' : 'Budget Name *'}
                                    </label>
                                    <input className="input-field w-full py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'السنة المالية' : 'Fiscal Year'}
                                    </label>
                                    <input className="input-field w-full py-2 text-sm" value={form.fiscal_year} onChange={e => setForm(f => ({ ...f, fiscal_year: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'من تاريخ' : 'Period Start'}
                                    </label>
                                    <input type="date" className="input-field w-full py-2 text-sm" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'إلى تاريخ' : 'Period End'}
                                    </label>
                                    <input type="date" className="input-field w-full py-2 text-sm" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        {isRTL ? 'بنود الميزانية' : 'Budget Items'}
                                    </h3>
                                    <button onClick={addItem} className="btn-secondary text-xs flex items-center gap-1">
                                        <Plus className="w-3 h-3" /> {isRTL ? 'إضافة بند' : 'Add Item'}
                                    </button>
                                </div>
                                {form.items.length === 0 && (
                                    <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'أضف بنوداً للميزانية' : 'Add budget line items'}
                                    </p>
                                )}
                                <div className="space-y-3">
                                    {form.items.map((item, i) => (
                                        <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <select className="select-field flex-1 py-1.5 text-sm"
                                                    value={item.account_id}
                                                    onChange={e => updateItem(i, 'account_id', e.target.value)}>
                                                    {accounts.map((a: any) => (
                                                        <option key={a.id} value={a.id}>{a.code} — {isRTL ? a.name_ar || a.name : a.name}</option>
                                                    ))}
                                                </select>
                                                <button onClick={() => removeItem(i)} className="btn-icon hover:!text-red-400 flex-shrink-0">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
                                                {MONTHS.map(m => (
                                                    <div key={m} className="col-span-1">
                                                        <label className="block text-[10px] text-center mb-0.5" style={{ color: 'var(--text-muted)' }}>
                                                            {m.toUpperCase()}
                                                        </label>
                                                        <input type="number" min="0" className="input-field w-full py-1 text-xs text-center px-1"
                                                            value={item[m] || 0}
                                                            onChange={e => updateItem(i, m, Number(e.target.value))} />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-2 text-xs text-end" style={{ color: 'var(--text-muted)' }}>
                                                {isRTL ? 'المجموع: ' : 'Total: '}
                                                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                                    {MONTHS.reduce((s, m) => s + Number(item[m] || 0), 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: '1px solid var(--border-default)' }}>
                            <button onClick={() => setShowForm(false)} className="btn-secondary" disabled={saving}>
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button onClick={save} className="btn-primary" disabled={saving}>
                                {saving ? '...' : (isRTL ? 'حفظ' : 'Save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
