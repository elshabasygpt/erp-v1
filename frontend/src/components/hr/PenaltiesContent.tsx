'use client';

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { hrApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { CardSkeleton } from '@/components/ui/Skeleton';

export default function PenaltiesContent() {
    const { isRTL } = useLanguage();
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
                toast.success(isRTL ? 'تم التحديث' : 'Updated');
            } else {
                await hrApi.createPenaltyRule(form);
                toast.success(isRTL ? 'تمت الإضافة' : 'Added');
            }
            setShowModal(false);
            fetchRules();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) return;
        try {
            await hrApi.deletePenaltyRule(id);
            toast.success(isRTL ? 'تم الحذف' : 'Deleted');
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
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{isRTL ? 'نظام جزاءات التأخير' : 'Late Penalty System'}</h1>
            </div>

            <div className="flex gap-4 border-b">
                <button
                    className={`pb-2 px-4 ${tab === 'rules' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : ''}`}
                    onClick={() => setTab('rules')}
                >
                    {isRTL ? 'قواعد الجزاءات (إعدادات)' : 'Penalty Rules (Settings)'}
                </button>
                <button
                    className={`pb-2 px-4 ${tab === 'report' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : ''}`}
                    onClick={() => setTab('report')}
                >
                    {isRTL ? 'تقرير الجزاءات' : 'Penalty Report'}
                </button>
            </div>

            {tab === 'rules' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl">{isRTL ? 'إعدادات قواعد الجزاء على التأخير' : 'Late Penalty Rule Settings'}</h2>
                        <Button onClick={() => {
                            setEditingRule(null);
                            setForm({
                                late_from_minutes: 1, late_to_minutes: 0,
                                deduction_type: 'fixed', deduction_value: 0,
                                grace_minutes: 0, label: '', label_ar: ''
                            });
                            setShowModal(true);
                        }}>{isRTL ? '+ إضافة قاعدة' : '+ Add Rule'}</Button>
                    </div>

                    <div className="grid gap-4">
                        {loadingRules ? (
                            Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
                        ) : errorRules ? (
                            <div className="col-span-full text-center p-8">
                                <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>{isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}</p>
                                <button onClick={() => refetchRules()} className="btn-secondary py-1.5 px-4 text-xs">{isRTL ? '🔄 إعادة المحاولة' : '🔄 Retry'}</button>
                            </div>
                        ) : rules.map(rule => (
                            <Card key={rule.id} className="p-4 flex justify-between items-center border-r-4 border-indigo-500">
                                <div>
                                    <h3 className="font-bold text-lg mb-1">{rule.label_ar || rule.label} ({rule.late_from_minutes}-{rule.late_to_minutes === 0 ? (isRTL ? 'فأكثر' : 'or more') : rule.late_to_minutes} {isRTL ? 'دقيقة' : 'min'})</h3>
                                    <p className="text-sm text-gray-600">
                                        {isRTL ? 'النوع' : 'Type'}: {rule.deduction_type === 'fixed' ? (isRTL ? 'مبلغ ثابت' : 'Fixed amount') : rule.deduction_type === 'per_minute' ? (isRTL ? 'لكل دقيقة' : 'Per minute') : (isRTL ? 'نسبة من اليومي' : 'Percentage of daily')} |
                                        {isRTL ? 'القيمة' : 'Value'}: {rule.deduction_value} |
                                        {isRTL ? 'السماح' : 'Grace'}: {rule.grace_minutes} {isRTL ? 'دقيقة' : 'min'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setEditingRule(rule);
                                        setForm({ ...rule });
                                        setShowModal(true);
                                    }}>{isRTL ? '✏️ تعديل' : '✏️ Edit'}</Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(rule.id)}>{isRTL ? '🗑️ حذف' : '🗑️ Delete'}</Button>
                                </div>
                            </Card>
                        ))}
                        {rules.length === 0 && !loadingRules && !errorRules && <p>{isRTL ? 'لا توجد قواعد مسجلة' : 'No rules registered'}</p>}
                    </div>

                    {showModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <Card ref={ruleModalRef} role="dialog" aria-modal="true" className="p-6 w-[500px] max-w-full">
                                <h2 className="text-xl font-bold mb-4">{editingRule ? (isRTL ? 'تعديل القاعدة' : 'Edit Rule') : (isRTL ? 'إضافة قاعدة' : 'Add Rule')}</h2>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm mb-1">{isRTL ? 'من دقيقة' : 'From minute'}</label>
                                        <input type="number" className="border p-2 rounded w-full" value={form.late_from_minutes} onChange={e => setForm({...form, late_from_minutes: +e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">{isRTL ? 'إلى دقيقة (0 = مفتوح)' : 'To minute (0 = open)'}</label>
                                        <input type="number" className="border p-2 rounded w-full" value={form.late_to_minutes} onChange={e => setForm({...form, late_to_minutes: +e.target.value})} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm mb-1">{isRTL ? 'نوع الخصم' : 'Deduction type'}</label>
                                        <select className="border p-2 rounded w-full" value={form.deduction_type} onChange={e => setForm({...form, deduction_type: e.target.value as any})}>
                                            <option value="fixed">{isRTL ? 'مبلغ ثابت' : 'Fixed amount'}</option>
                                            <option value="per_minute">{isRTL ? 'لكل دقيقة' : 'Per minute'}</option>
                                            <option value="percentage_of_daily">{isRTL ? 'نسبة من اليومي' : 'Percentage of daily'}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">{isRTL ? 'القيمة' : 'Value'}</label>
                                        <input type="number" className="border p-2 rounded w-full" value={form.deduction_value} onChange={e => setForm({...form, deduction_value: +e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">{isRTL ? 'دقائق السماح' : 'Grace minutes'}</label>
                                        <input type="number" className="border p-2 rounded w-full" value={form.grace_minutes} onChange={e => setForm({...form, grace_minutes: +e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">{isRTL ? 'الاسم' : 'Name'}</label>
                                        <input type="text" className="border p-2 rounded w-full" value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">{isRTL ? 'الاسم بالعربي' : 'Arabic name'}</label>
                                        <input type="text" className="border p-2 rounded w-full" value={form.label_ar} onChange={e => setForm({...form, label_ar: e.target.value})} />
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
                                    {form.deduction_type === 'percentage_of_daily' ? (
                                        <p>{isRTL ? `مثال: موظف يتأخر → يخصم ${form.deduction_value}% من الراتب اليومي` : `Example: employee is late → deduct ${form.deduction_value}% of daily salary`}</p>
                                    ) : (
                                        <p>{isRTL ? `مثال: موظف يتأخر 30 دقيقة → جزاء ${previewPenalty?.toFixed(2)}` : `Example: employee is 30 minutes late → penalty ${previewPenalty?.toFixed(2)}`}</p>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setShowModal(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                    <Button className="bg-indigo-600" onClick={handleSaveRule}>{isRTL ? 'حفظ' : 'Save'}</Button>
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
                                {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{isRTL ? `شهر ${i+1}` : `Month ${i+1}`}</option>)}
                            </select>
                            <select className="border p-2 rounded" value={year} onChange={e => setYear(+e.target.value)}>
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <Button onClick={() => window.print()} variant="outline">{isRTL ? '🖨️ تصدير PDF' : '🖨️ Export PDF'}</Button>
                    </div>

                    {report && (
                        <>
                            <div className="grid grid-cols-4 gap-4">
                                <Card className="p-4 text-center">
                                    <div className="text-sm text-gray-500">{isRTL ? 'أيام تأخير' : 'Late days'}</div>
                                    <div className="text-2xl font-bold">{report.totals.total_late_days} {isRTL ? 'يوم' : 'day(s)'}</div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="text-sm text-gray-500">{isRTL ? 'إجمالي الجزاء' : 'Total penalties'}</div>
                                    <div className="text-2xl font-bold text-red-600">{report.totals.total_penalties}</div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="text-sm text-gray-500">{isRTL ? 'موظفون متأثرون' : 'Affected employees'}</div>
                                    <div className="text-2xl font-bold">{report.totals.employees_affected} {isRTL ? 'موظف' : 'employee(s)'}</div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="text-sm text-gray-500">{isRTL ? 'إجمالي دقائق' : 'Total minutes'}</div>
                                    <div className="text-2xl font-bold text-orange-500">{report.totals.total_late_minutes} {isRTL ? 'دقيقة' : 'min'}</div>
                                </Card>
                            </div>

                            <div className="mt-6 space-y-2">
                                {report.by_employee.map((emp: any) => (
                                    <details key={emp.employee_id} className="bg-white border rounded p-4 group">
                                        <summary className="flex justify-between items-center cursor-pointer font-bold list-none">
                                            <span>▶ {emp.employee_name} — <span className="text-sm font-normal text-gray-500">{emp.position || (isRTL ? 'بدون مسمى' : 'No title')}</span></span>
                                            <span className="text-red-600">{emp.late_days_count} {isRTL ? 'أيام' : 'day(s)'} | {emp.total_penalty} {isRTL ? 'جزاء' : 'penalty'}</span>
                                        </summary>
                                        <div className="mt-4 pl-4 border-r-2 border-gray-200 pr-4 space-y-2">
                                            {emp.records.map((rec: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-sm py-2 border-b last:border-0">
                                                    <span>📅 {rec.date} | 🕒 {isRTL ? 'حضور' : 'Check-in'} {rec.check_in} | ⏱️ {isRTL ? 'تأخير' : 'Late'} {rec.late_minutes} {isRTL ? 'دق' : 'min'}</span>
                                                    <span className="flex gap-4 items-center">
                                                        <span className="font-bold text-red-600">{isRTL ? 'جزاء' : 'Penalty'}: {rec.penalty_amount}</span>
                                                        {rec.notification_sent ? (
                                                            <span className="text-green-600 text-xs">{isRTL ? '✅ أُرسل إشعار' : '✅ Notification sent'}</span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">{isRTL ? '⏳ لم يُرسل' : '⏳ Not sent'}</span>
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                ))}
                                {report.by_employee.length === 0 && <p className="text-center p-8 bg-gray-50 text-gray-500">{isRTL ? 'لا توجد تأخيرات هذا الشهر' : 'No late records this month'}</p>}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
