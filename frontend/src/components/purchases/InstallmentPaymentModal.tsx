'use client';

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { purchasesApi } from '@/lib/api';
import { useModalA11y } from '@/hooks/useModalA11y';
import toast from 'react-hot-toast';

interface InstallmentPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    installment: any;
    onPaymentSuccess: () => void;
    isRTL: boolean;
}

export function InstallmentPaymentModal({ isOpen, onClose, installment, onPaymentSuccess, isRTL }: InstallmentPaymentModalProps) {
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const modalRef = useModalA11y(isOpen, onClose);

    // Set initial amount to remaining amount
    React.useEffect(() => {
        if (installment) {
            setAmount((installment.amount - (installment.paid_amount || 0)).toString());
        }
    }, [installment]);

    if (!isOpen || !installment) return null;

    const remainingAmount = installment.amount - (installment.paid_amount || 0);

    const handleSubmit = async () => {
        const payAmount = parseFloat(amount);
        if (isNaN(payAmount) || payAmount <= 0) {
            toast.error(isRTL ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
            return;
        }

        if (payAmount > remainingAmount + 0.1) {
            toast.error(isRTL ? 'المبلغ المدخل أكبر من المتبقي' : 'Amount exceeds remaining balance');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('amount', payAmount.toString());
            formData.append('payment_method', paymentMethod);
            if (attachment) {
                formData.append('attachment', attachment);
            }

            await purchasesApi.payInstallment(installment.id, formData);
            
            toast.success(isRTL ? 'تم تسجيل الدفعة بنجاح' : 'Payment recorded successfully');
            onPaymentSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || (isRTL ? 'حدث خطأ أثناء السداد' : 'Error recording payment'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <div ref={modalRef} role="dialog" aria-modal="true" className="bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        {isRTL ? 'سداد قسط المورد' : 'Pay Supplier Installment'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors dark:hover:bg-white/10 dark:hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-white/60">{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</span>
                            <span className="text-sm font-black text-slate-800 dark:text-white">{installment.due_date}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 dark:text-white/60">{isRTL ? 'المبلغ المتبقي' : 'Remaining'}</span>
                            <span className="text-lg font-black text-blue-600 dark:text-blue-400">{remainingAmount.toFixed(2)} SAR</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-2">
                            {isRTL ? 'المبلغ المراد سداده' : 'Amount to Pay'}
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            max={remainingAmount}
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111118] text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-2">
                            {isRTL ? 'طريقة الدفع' : 'Payment Method'}
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111118] text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
                        >
                            <option value="bank_transfer">{isRTL ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                            <option value="cash">{isRTL ? 'نقدي' : 'Cash'}</option>
                            <option value="cheque">{isRTL ? 'شيك' : 'Cheque'}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-2">
                            {isRTL ? 'إيصال التحويل / السداد (اختياري)' : 'Proof of Payment (Optional)'}
                        </label>
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:hover:bg-bray-800 dark:bg-white/5 hover:bg-slate-100 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/10 transition-all">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {attachment ? (
                                    <>
                                        <FileText className="w-6 h-6 text-blue-500 mb-2" />
                                        <p className="text-xs font-bold text-slate-500 dark:text-white/60 truncate max-w-[200px]">
                                            {attachment.name}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-slate-400 mb-2" />
                                        <p className="text-xs font-bold text-slate-500 dark:text-white/60">
                                            {isRTL ? 'اضغط لرفع صورة أو ملف' : 'Click to upload receipt'}
                                        </p>
                                    </>
                                )}
                            </div>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setAttachment(e.target.files[0]);
                                    }
                                }}
                            />
                        </label>
                    </div>

                    {parseFloat(amount) < remainingAmount && parseFloat(amount) > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>{isRTL ? 'هذا الدفع جزئي، سيتم تحديث القسط ليعكس المبلغ المتبقي.' : 'This is a partial payment. The installment will be updated to reflect the remaining balance.'}</p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                    >
                        {isRTL ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
                        className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                {isRTL ? 'تأكيد السداد' : 'Confirm Payment'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
