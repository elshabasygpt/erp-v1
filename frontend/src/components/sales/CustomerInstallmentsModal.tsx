import React, { useState, useEffect } from 'react';
import { salesApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
    invoice: any;
    isRTL: boolean;
    onClose: () => void;
    formatCurrency: (amount: number) => string;
}

/**
 * Manages the customer-side installment schedule for a credit invoice. This is
 * schedule data only — collecting a payment is done through the receivables /
 * collect flow, so there is no "pay" action here (unlike the supplier side).
 */
export default function CustomerInstallmentsModal({ invoice, isRTL, onClose, formatCurrency }: Props) {
    const [installments, setInstallments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const dueAmount = Number(invoice.total || 0) - Number(invoice.paid_amount || 0);
    const hasPaid = installments.some(i => Number(i.paid_amount) > 0);

    const fetchInstallments = () => {
        setLoading(true);
        salesApi.getInvoiceInstallments(invoice.id)
            .then((res: any) => setInstallments(res?.data?.data || res?.data || []))
            .catch(() => toast.error(isRTL ? 'فشل تحميل الأقساط' : 'Failed to load installments'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchInstallments(); }, [invoice.id]);

    const handleSplit = (count: number) => {
        if (count < 1 || hasPaid) return;
        const baseAmount = Math.floor((dueAmount / count) * 100) / 100;
        const remainder = Math.round((dueAmount - baseAmount * count) * 100) / 100;
        const today = new Date();
        const newInst = [];
        for (let i = 0; i < count; i++) {
            const date = new Date(today);
            date.setMonth(date.getMonth() + i + 1); // monthly schedule
            newInst.push({
                due_date: date.toISOString().split('T')[0],
                amount: baseAmount + (i === count - 1 ? remainder : 0),
            });
        }
        setInstallments(newInst);
    };

    const handleSave = async () => {
        const total = installments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        if (Math.abs(total - dueAmount) > 0.1) {
            return toast.error(isRTL
                ? `يجب أن يساوي مجموع الأقساط المبلغ المتبقي: ${formatCurrency(dueAmount)}`
                : `Total must equal the due amount: ${formatCurrency(dueAmount)}`);
        }
        setSaving(true);
        try {
            await salesApi.saveInvoiceInstallments(
                invoice.id,
                installments.map(i => ({ due_date: i.due_date, amount: Number(i.amount) }))
            );
            toast.success(isRTL ? 'تم حفظ الأقساط' : 'Installments saved');
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'تعذّر حفظ الأقساط' : 'Error saving installments'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="relative w-full max-w-xl rounded-2xl bg-surface-900 shadow-2xl border border-surface-800 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-surface-800 flex justify-between items-center bg-surface-800/30">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <span>📅</span>
                        {isRTL ? 'جدولة أقساط العميل' : 'Customer Installments'}
                    </h2>
                    <button onClick={onClose} className="btn-icon text-surface-400 hover:text-red-500">✕</button>
                </div>

                <div className="p-6">
                    <div className="flex justify-between mb-4 p-4 rounded-xl bg-primary-900/20 border border-primary-800/30">
                        <div>
                            <p className="text-sm text-surface-400">{isRTL ? 'المبلغ المتبقي' : 'Due Amount'}</p>
                            <p className="text-2xl font-bold text-primary-400">{formatCurrency(dueAmount)}</p>
                        </div>
                        {!hasPaid && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-surface-400">{isRTL ? 'تقسيم إلى:' : 'Split into:'}</span>
                                {[2, 3, 4].map(n => (
                                    <button key={n} onClick={() => handleSplit(n)} className="px-3 py-1 rounded bg-surface-800 hover:bg-surface-700 text-sm border border-surface-700">
                                        {n}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {hasPaid && (
                        <div className="mb-4 p-3 rounded-lg bg-amber-900/20 border border-amber-800/30 text-amber-300 text-sm">
                            {isRTL
                                ? 'لا يمكن تعديل الخطة بعد سداد أحد الأقساط. التحصيل يتم من شاشة تحصيل الدفعات.'
                                : 'The plan cannot be edited after a payment lands. Collect payments from the Receivables screen.'}
                        </div>
                    )}

                    {loading ? (
                        <div className="py-8 text-center text-surface-400">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                            {installments.length === 0 ? (
                                <div className="text-center py-8 text-surface-500 text-sm">
                                    {isRTL ? 'لا توجد أقساط مجدولة. اختر تقسيماً أعلاه للبدء.' : 'No installments. Pick a split above to start.'}
                                </div>
                            ) : (
                                installments.map((inst, idx) => (
                                    <div key={idx} className="flex gap-3 items-center bg-surface-800/50 p-3 rounded-lg border border-surface-700/50">
                                        <div className="flex-1">
                                            <label className="text-xs text-surface-500 mb-1 block">{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                                            <input type="date" disabled={Number(inst.paid_amount) > 0} className="input-field py-1.5 text-sm w-full disabled:opacity-60" value={inst.due_date} onChange={e => {
                                                const arr = [...installments];
                                                arr[idx].due_date = e.target.value;
                                                setInstallments(arr);
                                            }} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-surface-500 mb-1 block">{isRTL ? 'المبلغ' : 'Amount'}</label>
                                            <input type="number" step="0.01" disabled={Number(inst.paid_amount) > 0} className="input-field py-1.5 text-sm w-full disabled:opacity-60" value={inst.amount} onChange={e => {
                                                const arr = [...installments];
                                                arr[idx].amount = e.target.value;
                                                setInstallments(arr);
                                            }} />
                                        </div>
                                        {Number(inst.paid_amount) > 0 ? (
                                            <div className="px-2 pt-5">
                                                <span className="text-xs text-emerald-500 font-bold">{isRTL ? 'مدفوع' : 'Paid'}: {formatCurrency(Number(inst.paid_amount))}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center pt-5">
                                                <button onClick={() => setInstallments(installments.filter((_, i) => i !== idx))} className="text-surface-500 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg">✕</button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            {installments.length > 0 && !hasPaid && (
                                <button onClick={() => setInstallments([...installments, { due_date: new Date().toISOString().split('T')[0], amount: 0 }])} className="w-full py-2 border border-dashed border-surface-700 rounded-lg text-surface-400 hover:text-white hover:border-surface-500 transition-colors text-sm">
                                    + {isRTL ? 'إضافة قسط مخصص' : 'Add Custom Installment'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-surface-800 flex justify-end gap-3 bg-surface-800/30">
                    <button onClick={onClose} className="px-4 py-2 text-surface-400 hover:text-white">{isRTL ? 'إغلاق' : 'Close'}</button>
                    <button onClick={handleSave} disabled={saving || hasPaid || installments.length === 0} className="btn-primary px-6 py-2 disabled:opacity-50 flex items-center gap-2">
                        {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div> : null}
                        {isRTL ? 'حفظ الأقساط' : 'Save Installments'}
                    </button>
                </div>
            </div>
        </div>
    );
}
