import React, { useState, useEffect } from 'react';
import { purchasesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { InstallmentPaymentModal } from './InstallmentPaymentModal';
import { useModalA11y } from '@/hooks/useModalA11y';
import { FileText, CreditCard } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';

interface Props {
    invoice: any;
    isRTL: boolean;
    onClose: () => void;
    formatCurrency: (amount: number) => string;
}

export default function PurchaseInstallmentsModal({ invoice, isRTL, onClose, formatCurrency }: Props) {
    const [installments, setInstallments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
    const modalRef = useModalA11y(true, onClose);

    const dueAmount = invoice.total - (invoice.paid_amount || 0);

    const fetchInstallments = () => {
        setLoading(true);
        purchasesApi.getInstallments(invoice.id)
            .then((res: any) => {
                setInstallments(res?.data?.data || res?.data || []);
            })
            .catch(err => toast.error('Failed to load installments'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchInstallments();
    }, [invoice.id]);

    const handleSplit = (count: number) => {
        if (count < 1) return;
        const baseAmount = Math.floor((dueAmount / count) * 100) / 100;
        let remainder = dueAmount - (baseAmount * count);
        
        const newInst = [];
        const today = new Date();
        for (let i = 0; i < count; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + (i * 7)); // weekly by default
            newInst.push({
                due_date: date.toISOString().split('T')[0],
                amount: baseAmount + (i === count - 1 ? remainder : 0) // add remainder to last
            });
        }
        setInstallments(newInst);
    };

    const handleSave = async () => {
        const total = installments.reduce((acc, curr) => acc + Number(curr.amount), 0);
        if (Math.abs(total - dueAmount) > 0.1) {
            return toast.error(isRTL ? `يجب أن يكون مجموع الأقساط مساوياً للمبلغ المتبقي: ${formatCurrency(dueAmount)}` : `Total must equal due amount: ${formatCurrency(dueAmount)}`);
        }

        setSaving(true);
        try {
            await purchasesApi.saveInstallments(invoice.id, { installments });
            toast.success(isRTL ? 'تم حفظ الأقساط بنجاح' : 'Installments saved');
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error saving installments');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div ref={modalRef} role="dialog" aria-modal="true" className="relative w-full max-w-xl rounded-2xl bg-surface-900 shadow-2xl border border-surface-800 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-surface-800 flex justify-between items-center bg-surface-800/30">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <span>📅</span>
                        {isRTL ? 'جدولة أقساط المورد' : 'Supplier Installments'}
                    </h2>
                    <button onClick={onClose} className="btn-icon text-surface-400 hover:text-red-500" aria-label={isRTL ? 'إغلاق' : 'Close'}>✕</button>
                </div>

                <div className="p-6">
                    <div className="flex justify-between mb-4 p-4 rounded-xl bg-primary-900/20 border border-primary-800/30">
                        <div>
                            <p className="text-sm text-surface-400">{isRTL ? 'المبلغ المتبقي' : 'Due Amount'}</p>
                            <p className="text-2xl font-bold text-primary-400">{formatCurrency(dueAmount)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-surface-400">{isRTL ? 'تقسيم إلى:' : 'Split into:'}</span>
                            {[2, 3, 4].map(n => (
                                <button key={n} onClick={() => handleSplit(n)} className="px-3 py-1 rounded bg-surface-800 hover:bg-surface-700 text-sm border border-surface-700">
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                            {installments.length === 0 ? (
                                <div className="text-center py-8 text-surface-500 text-sm">
                                    {isRTL ? 'لا توجد أقساط مجدولة. اختر تقسيم أعلاه للبدء.' : 'No installments. Select split above to start.'}
                                </div>
                            ) : (
                                installments.map((inst, idx) => (
                                    <div key={idx} className="flex gap-3 items-center bg-surface-800/50 p-3 rounded-lg border border-surface-700/50">
                                        <div className="flex-1">
                                            <label className="text-xs text-surface-500 mb-1 block">{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                                            <input type="date" className="input-field py-1.5 text-sm w-full" value={inst.due_date} onChange={e => {
                                                const arr = [...installments];
                                                arr[idx].due_date = e.target.value;
                                                setInstallments(arr);
                                            }} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-surface-500 mb-1 block">{isRTL ? 'المبلغ' : 'Amount'}</label>
                                            <input type="number" step="0.01" className="input-field py-1.5 text-sm w-full" value={inst.amount} onChange={e => {
                                                const arr = [...installments];
                                                arr[idx].amount = e.target.value;
                                                setInstallments(arr);
                                            }} />
                                        </div>
                                        {inst.paid_amount > 0 && (
                                            <div className="px-2 pt-5 flex items-center gap-2">
                                                <span className="text-xs text-emerald-500 font-bold">{isRTL ? 'تم الدفع' : 'Paid'}: {formatCurrency(inst.paid_amount)}</span>
                                                {inst.attachment_path && (
                                                    <a 
                                                        href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/storage/${inst.attachment_path}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:text-blue-400 p-1"
                                                        title={isRTL ? 'عرض الإيصال' : 'View Receipt'}
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                        {(!inst.paid_amount || inst.paid_amount === 0) && (
                                            <div className="flex items-center pt-5">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedInstallment(inst);
                                                        setPaymentModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg mr-1 ml-1"
                                                    title={isRTL ? 'سداد الدفعة' : 'Pay Installment'}
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setInstallments(installments.filter((_, i) => i !== idx))} className="text-surface-500 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg" aria-label={isRTL ? 'حذف' : 'Remove'}>✕</button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            {installments.length > 0 && (
                                <button onClick={() => setInstallments([...installments, { due_date: new Date().toISOString().split('T')[0], amount: 0 }])} className="w-full py-2 border border-dashed border-surface-700 rounded-lg text-surface-400 hover:text-white hover:border-surface-500 transition-colors text-sm">
                                    + {isRTL ? 'إضافة قسط مخصص' : 'Add Custom Installment'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-surface-800 flex justify-end gap-3 bg-surface-800/30">
                    <button onClick={onClose} className="px-4 py-2 text-surface-400 hover:text-white">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                    <button onClick={handleSave} disabled={saving || installments.length === 0} className="btn-primary px-6 py-2 disabled:opacity-50 flex items-center gap-2">
                        {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div> : null}
                        {isRTL ? 'حفظ الأقساط' : 'Save Installments'}
                    </button>
                </div>
            </div>

            <InstallmentPaymentModal 
                isOpen={paymentModalOpen} 
                onClose={() => setPaymentModalOpen(false)} 
                installment={selectedInstallment} 
                onPaymentSuccess={fetchInstallments}
                isRTL={isRTL} 
            />
        </div>
    );
}
