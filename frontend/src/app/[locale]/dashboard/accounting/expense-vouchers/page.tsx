'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useLanguage } from '@/i18n/LanguageContext';
import api, { treasuryApi, expensesApiNew } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Plus, Check, X, FileText, CheckCircle, Clock, DollarSign } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';

const expenseVoucherApi = {
    create: (data: any) => api.post('/expenses/vouchers', data),
    approve: (id: string) => api.post(`/expenses/vouchers/${id}/approve`),
};

interface Safe { id: string; name: string; name_ar?: string; balance?: number; }
interface ExpenseCategory { id: string; name: string; }
interface Voucher {
    id: string;
    reference_number?: string;
    category?: { name: string };
    safe?: { name: string };
    amount: number;
    expense_date: string;
    description?: string;
    status: string;
    posted_at?: string;
}

const emptyForm = { category_id: '', safe_id: '', amount: '', expense_date: new Date().toISOString().split('T')[0], description: '' };

export default function ExpenseVouchersPage() {
    const { isRTL } = useLanguage();
    const [safes, setSafes] = useState<Safe[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const confirm = useConfirm();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [safesRes, catsRes] = await Promise.all([
                treasuryApi.getSafes(),
                expensesApiNew.getCategories(),
            ]);
            setSafes(safesRes.data?.data ?? safesRes.data ?? []);
            setCategories(catsRes.data?.data ?? catsRes.data ?? []);
            // Vouchers may not have a list endpoint yet; show empty
            setVouchers([]);
        } catch {
            setLoadError(true);
            toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!form.category_id || !form.safe_id || !form.amount || !form.expense_date) {
            toast.error(isRTL ? 'جميع الحقول المطلوبة يجب أن تُملأ' : 'All required fields must be filled');
            return;
        }
        setSaving(true);
        try {
            const res = await expenseVoucherApi.create({
                category_id: form.category_id,
                safe_id: form.safe_id,
                amount: parseFloat(form.amount),
                expense_date: form.expense_date,
                description: form.description || undefined,
            });
            const voucher = res.data?.data ?? res.data;
            toast.success(isRTL ? 'تم إنشاء سند المصروف بنجاح' : 'Expense voucher created successfully');
            // Add to local list
            if (voucher) setVouchers(prev => [voucher, ...prev]);
            setForm(emptyForm);
            setShowForm(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشل إنشاء سند المصروف' : 'Failed to create expense voucher'));
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!await confirm(isRTL ? 'هل تريد اعتماد وترحيل هذا السند؟ لا يمكن التراجع عن هذا.' : 'Approve and post this voucher? This cannot be undone.')) return;
        try {
            const res = await expenseVoucherApi.approve(id);
            const updated = res.data?.data ?? res.data;
            toast.success(isRTL ? 'تم اعتماد وترحيل السند بنجاح' : 'Voucher approved and posted successfully');
            setVouchers(prev => prev.map(v => v.id === id ? (updated ?? { ...v, status: 'posted' }) : v));
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشل الاعتماد' : 'Approval failed'));
        }
    };

    const statusBadge = (status: string) => {
        if (status === 'posted' || status === 'approved')
            return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{isRTL ? 'مرحّل' : 'Posted'}</span>;
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock className="w-3 h-3" />{isRTL ? 'معلق' : 'Pending'}</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isRTL ? 'سندات الصرف' : 'Expense Vouchers'}</h1>
                    <p className="text-gray-500 mt-1">{isRTL ? 'إنشاء واعتماد سندات صرف المصروفات مع ترحيل محاسبي' : 'Create and approve expense vouchers with accounting posting'}</p>
                </div>
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'سند صرف جديد' : 'New Expense Voucher'}
                </Button>
            </div>

            {/* Create Form */}
            {showForm && (
                <Card className="p-5 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-orange-500" />
                            {isRTL ? 'إنشاء سند صرف جديد' : 'Create New Expense Voucher'}
                        </h3>
                        <button onClick={() => setShowForm(false)} aria-label={isRTL ? 'إغلاق' : 'Close'}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            {isRTL ? 'سند الصرف يحتاج إلى اعتماد قبل الترحيل المحاسبي. بعد الإنشاء، اضغط "اعتماد وترحيل" لإتمام القيد.' : 'The expense voucher needs approval before accounting posting. After creating it, click "Approve & Post" to complete the journal entry.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">{isRTL ? 'فئة المصروف *' : 'Expense Category *'}</label>
                            <select className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                                <option value="">{isRTL ? '-- اختر الفئة --' : '-- Select Category --'}</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">{isRTL ? 'الخزينة / الصندوق *' : 'Treasury / Cash Box *'}</label>
                            <select className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.safe_id} onChange={e => setForm(f => ({ ...f, safe_id: e.target.value }))}>
                                <option value="">{isRTL ? '-- اختر الخزينة --' : '-- Select Treasury --'}</option>
                                {safes.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name_ar || s.name}{s.balance != null ? ` (${s.balance.toLocaleString()})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">{isRTL ? 'المبلغ *' : 'Amount *'}</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input type="number" min="0.01" step="0.01"
                                    className="border rounded pl-9 pr-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                    placeholder="0.00" />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">{isRTL ? 'تاريخ المصروف *' : 'Expense Date *'}</label>
                            <input type="date"
                                className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium mb-1 block">{isRTL ? 'الوصف / البيان' : 'Description'}</label>
                            <textarea rows={2}
                                className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600 resize-none"
                                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder={isRTL ? 'وصف اختياري للمصروف...' : 'Optional description for the expense...'} />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <Button onClick={handleCreate} disabled={saving} className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'إنشاء السند' : 'Create Voucher')}
                        </Button>
                        <Button variant="outline" onClick={() => setShowForm(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    </div>
                </Card>
            )}

            {/* Vouchers List */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">{isRTL ? 'سندات الصرف' : 'Expense Vouchers'} ({vouchers.length})</h3>
                </div>
                {loading ? (
                    <table className="w-full text-left">
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <tr key={`sk-${i}`}>
                                    {Array.from({ length: 8 }).map((__, j) => (
                                        <td key={j} className="px-4 py-3"><Skeleton className="w-3/4 h-4" /></td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : loadError ? (
                    <div className="p-12 text-center">
                        <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                            {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                        </p>
                        <button onClick={() => loadData()} className="btn-secondary py-1.5 px-4 text-xs">
                            🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                        </button>
                    </div>
                ) : vouchers.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>{isRTL ? 'لا توجد سندات صرف. أنشئ سنداً جديداً للبدء.' : 'No expense vouchers. Create a new one to get started.'}</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'رقم السند' : 'Voucher No.'}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'الفئة' : 'Category'}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'الخزينة' : 'Treasury'}</th>
                                <th className="px-4 py-3 font-medium text-gray-500 text-right">{isRTL ? 'المبلغ' : 'Amount'}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'التاريخ' : 'Date'}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'الحالة' : 'Status'}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'البيان' : 'Description'}</th>
                                <th className="px-4 py-3 font-medium text-gray-500 text-right">{isRTL ? 'إجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {vouchers.map(v => (
                                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-4 py-3 font-mono text-sm">{v.reference_number ?? v.id.slice(0, 8)}</td>
                                    <td className="px-4 py-3 text-sm">{v.category?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-sm">{v.safe?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                        {v.amount?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{v.expense_date}</td>
                                    <td className="px-4 py-3">{statusBadge(v.status)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{v.description ?? '—'}</td>
                                    <td className="px-4 py-3 text-right">
                                        {v.status !== 'posted' && v.status !== 'approved' && (
                                            <Button size="sm" variant="outline" onClick={() => handleApprove(v.id)}
                                                className="text-green-600 border-green-300 hover:bg-green-50 flex items-center gap-1">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                {isRTL ? 'اعتماد وترحيل' : 'Approve & Post'}
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
}
