'use client';
import { useState } from 'react';
import { hrApi } from '@/lib/api';

interface AddPayrollItemModalProps {
    payroll: { id: string; employee_id: string; employee: any; month: number; year: number };
    employees: any[];
    isRTL: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const typeConfig = {
    deduction:    { label: 'خصم / جزاء',   color: 'bg-red-100 text-red-700 border-red-200',     emoji: '🔴' },
    bonus:        { label: 'مكافأة / بدل',  color: 'bg-green-100 text-green-700 border-green-200', emoji: '🟢' },
    advance:      { label: 'سلفة',           color: 'bg-yellow-100 text-yellow-700 border-yellow-200', emoji: '🟡' },
    overtime:     { label: 'أوفرتايم',       color: 'bg-blue-100 text-blue-700 border-blue-200',   emoji: '🔵' },
    other_add:    { label: 'إضافة أخرى',    color: 'bg-purple-100 text-purple-700 border-purple-200', emoji: '➕' },
    other_deduct: { label: 'خصم آخر',       color: 'bg-gray-100 text-gray-700 border-gray-200',   emoji: '➖' },
};

export default function AddPayrollItemModal({ payroll, isRTL, onClose, onSuccess }: AddPayrollItemModalProps) {
    const [type, setType] = useState<keyof typeof typeConfig>('bonus');
    const [reason, setReason] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await hrApi.addPayrollItem({
                employee_id: payroll.employee_id,
                month: payroll.month,
                year: payroll.year,
                type,
                reason,
                amount: parseFloat(amount),
                notes
            });
            onSuccess();
        } catch (error) {
            console.error(error);
            alert(isRTL ? 'حدث خطأ أثناء إضافة البند' : 'Error adding payroll item');
        } finally {
            setLoading(false);
        }
    };

    const monthName = new Date(payroll.year, payroll.month - 1, 1)
        .toLocaleString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-lg">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {isRTL ? 'إضافة بند راتب' : 'Add Payroll Item'} — {payroll.employee?.name}
                        </h2>
                        <p className="text-sm text-gray-500">{monthName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">{isRTL ? 'نوع البند' : 'Type'}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(Object.entries(typeConfig) as [keyof typeof typeConfig, any][]).map(([key, config]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setType(key)}
                                    className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all
                                        ${type === key ? 'ring-2 ring-primary-500 ' + config.color : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}
                                    `}
                                >
                                    <span className="text-lg">{config.emoji}</span>
                                    <span className="text-xs font-bold">{config.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{isRTL ? 'السبب / الوصف' : 'Reason'}</label>
                        <input
                            type="text"
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={isRTL ? 'مثال: جزاء تأخر في تسليم التقرير' : 'e.g. Late report delivery'}
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{isRTL ? 'المبلغ' : 'Amount'}</label>
                        <div className="relative">
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="input-field pr-12"
                            />
                            <span className="absolute right-3 top-2.5 text-gray-400 font-bold">
                                {isRTL ? 'ريال' : 'SAR'}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{isRTL ? 'ملاحظات إضافية (اختياري)' : 'Notes'}</label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="input-field resize-none"
                        ></textarea>
                    </div>

                    <div className="bg-blue-50 text-blue-800 p-3 rounded text-xs font-medium flex items-center gap-2">
                        <span className="text-lg">ℹ️</span>
                        {isRTL ? 'سيتم تحديث صافي الراتب وإعادة حسابه تلقائياً بعد إضافة البند.' : 'Net salary will be automatically recalculated after adding the item.'}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                        <button type="submit" disabled={loading} className="btn-primary flex-1">
                            {loading ? (isRTL ? 'جاري الإضافة...' : 'Adding...') : (isRTL ? 'إضافة البند' : 'Add Item')}
                        </button>
                        <button type="button" onClick={onClose} className="btn-secondary">
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
