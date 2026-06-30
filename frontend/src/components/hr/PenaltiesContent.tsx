'use client';

import React, { useState, useMemo } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { hrApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { CardSkeleton } from '@/components/ui/Skeleton';

export default function PenaltiesContent() {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const [tab, setTab] = useState<'rules' | 'report'>('rules');

    // Rules state
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState<any>(null);

    const ruleModalRef = useModalA11y<HTMLDivElement>(showModal, () => setShowModal(false));

    // Form state
    const [form, setForm] = useState({
        late_from_minutes: 1,
        late_to_minutes: 0,
        deduction_type: 'fixed' as 'fixed' | 'per_minute' | 'percentage_of_daily',
        deduction_value: 0,
        grace_minutes: 0,
        label: '',
        label_ar: '',
    });

    // Report state
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const { data: rules = [], isLoading: loadingRules, isError: errorRules, refetch: refetchRules } = useQuery<any[]>({
        queryKey: ['penalty-rules'],
        queryFn: async () => {
            const res = await hrApi.getPenaltyRules();
            return res.data?.data || [];
        },
        enabled: tab === 'rules',
    });

    const { data: report } = useQuery({
        queryKey: ['penalty-report', month, year],
        queryFn: async () => {
            const res = await hrApi.getPenaltyReport({ month, year });
            return res.data?.data || null;
        },
        enabled: tab === 'report',
    });

    const fetchRules = () => queryClient.invalidateQueries({ queryKey: ['penalty-rules'] });

    const handleSaveRule = async () => {
        try {
            if (editingRule) {
                await hrApi.updatePenaltyRule(editingRule.id, form);
                toast.success('تم التحديث');
            } else {
                await hrApi.createPenaltyRule(form);
                toast.success('تمت الإضافة');
            }
            setShowModal(false);
            fetchRules();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm('هل أنت متأكد من الحذف؟')) return;
        try {
            await hrApi.deletePenaltyRule(id);
            toast.success('تم الحذف');
            fetchRules();
        } catch (e) {
            toast.error('Error');
        }
    };

    const previewPenalty = useMemo(() => {
        const example = 30; // دقيقة للمثال
        if (form.deduction_type === 'fixed') return form.deduction_value;
        if (form.deduction_type === 'per_minute') return form.deduction_value * example;
        return null;
    }, [form]);

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">نظام جزاءات التأخير</h1>
            </div>

            <div className="flex gap-4 border-b">
                <button
                    className={`pb-2 px-4 ${tab === 'rules' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : ''}`}
                    onClick={() => setTab('rules')}
                >
                    قواعد الجزاءات (إعدادات)
                </button>
                <button
                    className={`pb-2 px-4 ${tab === 'report' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : ''}`}
                    onClick={() => setTab('report')}
                >
                    تقرير الجزاءات
                </button>
            </div>

            {tab === 'rules' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl">إعدادات قواعد الجزاء على التأخير</h2>
                        <Button onClick={() => {
                            setEditingRule(null);
                            setForm({
                                late_from_minutes: 1, late_to_minutes: 0,
                                deduction_type: 'fixed', deduction_value: 0,
                                grace_minutes: 0, label: '', label_ar: ''
                            });
                            setShowModal(true);
                        }}>+ إضافة قاعدة</Button>
                    </div>

                    <div className="grid gap-4">
                        {loadingRules ? (
                            Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
                        ) : errorRules ? (
                            <div className="col-span-full text-center p-8">
                                <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>تعذّر تحميل البيانات.</p>
                                <button onClick={() => refetchRules()} className="btn-secondary py-1.5 px-4 text-xs">🔄 إعادة المحاولة</button>
                            </div>
                        ) : rules.map(rule => (
                            <Card key={rule.id} className="p-4 flex justify-between items-center border-r-4 border-indigo-500">
                                <div>
                                    <h3 className="font-bold text-lg mb-1">{rule.label_ar || rule.label} ({rule.late_from_minutes}-{rule.late_to_minutes === 0 ? 'فأكثر' : rule.late_to_minutes} دقيقة)</h3>
                                    <p className="text-sm text-gray-600">
                                        النوع: {rule.deduction_type === 'fixed' ? 'مبلغ ثابت' : rule.deduction_type === 'per_minute' ? 'لكل دقيقة' : 'نسبة من اليومي'} | 
                                        القيمة: {rule.deduction_value} | 
                                        السماح: {rule.grace_minutes} دقيقة
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setEditingRule(rule);
                                        setForm({ ...rule });
                                        setShowModal(true);
                                    }}>✏️ تعديل</Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(rule.id)}>🗑️ حذف</Button>
                                </div>
                            </Card>
                        ))}
                        {rules.length === 0 && !loadingRules && !errorRules && <p>لا توجد قواعد مسجلة</p>}
                    </div>

                    {showModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <Card ref={ruleModalRef} role="dialog" aria-modal="true" className="p-6 w-[500px] max-w-full">
                                <h2 className="text-xl font-bold mb-4">{editingRule ? 'تعديل القاعدة' : 'إضافة قاعدة'}</h2>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm mb-1">من دقيقة</label>
                                        <input type="number" className="border p-2 rounded w-full" value={form.late_from_minutes} onChange={e => setForm({...form, late_from_minutes: +e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">إلى دقيقة (0 = مفتوح)</label>
                                        <input type="number" className="border p-2 rounded w-full" value={form.late_to_minutes} onChange={e => setForm({...form, late_to_minutes: +e.target.value})} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm mb-1">نوع الخصم</label>
                                        <select className="border p-2 rounded w-full" value={form.deduction_type} onChange={e => setForm({...form, deduction_type: e.target.value as any})}>
                                            <option value="fixed">مبلغ ثابت</option>
                                            <option value="per_minute">لكل دقيقة</option>
                                            <option value="percentage_of_daily">نسبة من اليومي</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">القيمة</label>
                                        <input type="number" className="border p-2 rounded w-full" value={form.deduction_value} onChange={e => setForm({...form, deduction_value: +e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">دقائق السماح</label>
                                        <input type="number" className="border p-2 rounded w-full" value={form.grace_minutes} onChange={e => setForm({...form, grace_minutes: +e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">الاسم</label>
                                        <input type="text" className="border p-2 rounded w-full" value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">الاسم بالعربي</label>
                                        <input type="text" className="border p-2 rounded w-full" value={form.label_ar} onChange={e => setForm({...form, label_ar: e.target.value})} />
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
                                    {form.deduction_type === 'percentage_of_daily' ? (
                                        <p>مثال: موظف يتأخر → يخصم {form.deduction_value}% من الراتب اليومي</p>
                                    ) : (
                                        <p>مثال: موظف يتأخر 30 دقيقة → جزاء {previewPenalty?.toFixed(2)}</p>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setShowModal(false)}>إلغاء</Button>
                                    <Button className="bg-indigo-600" onClick={handleSaveRule}>حفظ</Button>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {tab === 'report' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                            <select className="border p-2 rounded" value={month} onChange={e => setMonth(+e.target.value)}>
                                {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>شهر {i+1}</option>)}
                            </select>
                            <select className="border p-2 rounded" value={year} onChange={e => setYear(+e.target.value)}>
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <Button onClick={() => window.print()} variant="outline">🖨️ تصدير PDF</Button>
                    </div>

                    {report && (
                        <>
                            <div className="grid grid-cols-4 gap-4">
                                <Card className="p-4 text-center">
                                    <div className="text-sm text-gray-500">أيام تأخير</div>
                                    <div className="text-2xl font-bold">{report.totals.total_late_days} يوم</div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="text-sm text-gray-500">إجمالي الجزاء</div>
                                    <div className="text-2xl font-bold text-red-600">{report.totals.total_penalties}</div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="text-sm text-gray-500">موظفون متأثرون</div>
                                    <div className="text-2xl font-bold">{report.totals.employees_affected} موظف</div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="text-sm text-gray-500">إجمالي دقائق</div>
                                    <div className="text-2xl font-bold text-orange-500">{report.totals.total_late_minutes} دقيقة</div>
                                </Card>
                            </div>

                            <div className="mt-6 space-y-2">
                                {report.by_employee.map((emp: any) => (
                                    <details key={emp.employee_id} className="bg-white border rounded p-4 group">
                                        <summary className="flex justify-between items-center cursor-pointer font-bold list-none">
                                            <span>▶ {emp.employee_name} — <span className="text-sm font-normal text-gray-500">{emp.position || 'بدون مسمى'}</span></span>
                                            <span className="text-red-600">{emp.late_days_count} أيام | {emp.total_penalty} جزاء</span>
                                        </summary>
                                        <div className="mt-4 pl-4 border-r-2 border-gray-200 pr-4 space-y-2">
                                            {emp.records.map((rec: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-sm py-2 border-b last:border-0">
                                                    <span>📅 {rec.date} | 🕒 حضور {rec.check_in} | ⏱️ تأخير {rec.late_minutes} دق</span>
                                                    <span className="flex gap-4 items-center">
                                                        <span className="font-bold text-red-600">جزاء: {rec.penalty_amount}</span>
                                                        {rec.notification_sent ? (
                                                            <span className="text-green-600 text-xs">✅ أُرسل إشعار</span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">⏳ لم يُرسل</span>
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                ))}
                                {report.by_employee.length === 0 && <p className="text-center p-8 bg-gray-50 text-gray-500">لا توجد تأخيرات هذا الشهر</p>}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
