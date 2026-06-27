'use client';

import { useState, useEffect } from 'react';
import api, { treasuryApi, expensesApiNew } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Plus, Check, X, FileText, CheckCircle, Clock, DollarSign } from 'lucide-react';

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
    const [safes, setSafes] = useState<Safe[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
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
            toast.error('فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!form.category_id || !form.safe_id || !form.amount || !form.expense_date) {
            toast.error('جميع الحقول المطلوبة يجب أن تُملأ');
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
            toast.success('تم إنشاء سند المصروف بنجاح');
            // Add to local list
            if (voucher) setVouchers(prev => [voucher, ...prev]);
            setForm(emptyForm);
            setShowForm(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'فشل إنشاء سند المصروف');
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('هل تريد اعتماد وترحيل هذا السند؟ لا يمكن التراجع عن هذا.')) return;
        try {
            const res = await expenseVoucherApi.approve(id);
            const updated = res.data?.data ?? res.data;
            toast.success('تم اعتماد وترحيل السند بنجاح');
            setVouchers(prev => prev.map(v => v.id === id ? (updated ?? { ...v, status: 'posted' }) : v));
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'فشل الاعتماد');
        }
    };

    const statusBadge = (status: string) => {
        if (status === 'posted' || status === 'approved')
            return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" />مرحّل</span>;
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock className="w-3 h-3" />معلق</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">سندات الصرف / Expense Vouchers</h1>
                    <p className="text-gray-500 mt-1">إنشاء واعتماد سندات صرف المصروفات مع ترحيل محاسبي</p>
                </div>
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    سند صرف جديد
                </Button>
            </div>

            {/* Create Form */}
            {showForm && (
                <Card className="p-5 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-orange-500" />
                            إنشاء سند صرف جديد
                        </h3>
                        <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            سند الصرف يحتاج إلى اعتماد قبل الترحيل المحاسبي. بعد الإنشاء، اضغط "اعتماد وترحيل" لإتمام القيد.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">فئة المصروف *</label>
                            <select className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                                <option value="">-- اختر الفئة --</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">الخزينة / الصندوق *</label>
                            <select className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.safe_id} onChange={e => setForm(f => ({ ...f, safe_id: e.target.value }))}>
                                <option value="">-- اختر الخزينة --</option>
                                {safes.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name_ar || s.name}{s.balance != null ? ` (${s.balance.toLocaleString()})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">المبلغ *</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input type="number" min="0.01" step="0.01"
                                    className="border rounded pl-9 pr-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                    placeholder="0.00" />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">تاريخ المصروف *</label>
                            <input type="date"
                                className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium mb-1 block">الوصف / البيان</label>
                            <textarea rows={2}
                                className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600 resize-none"
                                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="وصف اختياري للمصروف..." />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <Button onClick={handleCreate} disabled={saving} className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            {saving ? 'جاري الحفظ...' : 'إنشاء السند'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
                    </div>
                </Card>
            )}

            {/* Vouchers List */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">سندات الصرف ({vouchers.length})</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
                ) : vouchers.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>لا توجد سندات صرف. أنشئ سنداً جديداً للبدء.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-500">رقم السند</th>
                                <th className="px-4 py-3 font-medium text-gray-500">الفئة</th>
                                <th className="px-4 py-3 font-medium text-gray-500">الخزينة</th>
                                <th className="px-4 py-3 font-medium text-gray-500 text-right">المبلغ</th>
                                <th className="px-4 py-3 font-medium text-gray-500">التاريخ</th>
                                <th className="px-4 py-3 font-medium text-gray-500">الحالة</th>
                                <th className="px-4 py-3 font-medium text-gray-500">البيان</th>
                                <th className="px-4 py-3 font-medium text-gray-500 text-right">إجراءات</th>
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
                                                اعتماد وترحيل
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
