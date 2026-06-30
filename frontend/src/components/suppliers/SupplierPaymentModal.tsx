import React, { useState, useEffect } from 'react';
import { purchasesApi, treasuryApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
    supplier: any;
    isRTL: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    formatCurrency: (n: number) => string;
}

/**
 * Records a supplier payment from a treasury safe and (optionally) allocates it
 * across the supplier's outstanding purchase invoices. The backend deducts the
 * safe and posts a balanced AP-settlement journal entry.
 */
export default function SupplierPaymentModal({ supplier, isRTL, onClose, onSuccess, formatCurrency }: Props) {
    const [safes, setSafes] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [safeId, setSafeId] = useState('');
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState('');
    const [allocations, setAllocations] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [safesRes, invRes] = await Promise.all([
                    treasuryApi.getSafes(),
                    purchasesApi.getInvoices({ supplier_id: supplier.id, status: 'confirmed', limit: 100 }),
                ]);
                const safeList = safesRes.data?.data || safesRes.data || [];
                setSafes(safeList);
                if (safeList[0]) setSafeId(safeList[0].id);
                const invList = (invRes.data?.data || invRes.data || [])
                    .filter((i: any) => (Number(i.total) - Number(i.paid_amount || 0)) > 0.01);
                setInvoices(invList);
            } catch {
                toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        })();
    }, [supplier.id]);

    const totalAllocated = Object.values(allocations).reduce((s, v) => s + Number(v || 0), 0);

    const outstanding = (inv: any) => Number(inv.total) - Number(inv.paid_amount || 0);

    const handleSubmit = async () => {
        const amt = Number(amount);
        if (!safeId || !amt || amt <= 0) {
            return toast.error(isRTL ? 'اختر الخزنة وأدخل مبلغاً' : 'Pick a safe and enter an amount');
        }
        if (totalAllocated > amt + 0.01) {
            return toast.error(isRTL ? 'إجمالي التخصيص يتجاوز مبلغ الدفعة' : 'Allocated total exceeds the payment amount');
        }
        const allocs = Object.entries(allocations)
            .filter(([, v]) => Number(v) > 0)
            .map(([invoice_id, v]) => ({ invoice_id, amount: Number(v) }));
        setSaving(true);
        try {
            await purchasesApi.createSupplierPayment(supplier.id, {
                safe_id: safeId,
                amount: amt,
                reference_number: reference || undefined,
                allocations: allocs.length ? allocs : undefined,
            });
            toast.success(isRTL ? 'تم تسجيل الدفعة' : 'Payment recorded');
            onSuccess?.();
            onClose();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || (isRTL ? 'تعذّر تسجيل الدفعة' : 'Failed to record payment'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="relative w-full max-w-lg rounded-2xl bg-surface-900 shadow-2xl border border-surface-800 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-surface-800 flex justify-between items-center bg-surface-800/30">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <span>💸</span>
                        {isRTL ? `سداد للمورد: ${supplier.name}` : `Pay Supplier: ${supplier.name}`}
                    </h2>
                    <button onClick={onClose} className="btn-icon text-surface-400 hover:text-red-500" aria-label={isRTL ? 'إغلاق' : 'Close'}>✕</button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {loading ? (
                        <div className="py-8 text-center text-surface-400">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-surface-400 mb-1 block">{isRTL ? 'الخزنة' : 'Safe'}</label>
                                    <select value={safeId} onChange={e => setSafeId(e.target.value)} className="input-field py-2 text-sm w-full">
                                        {safes.length === 0 && <option value="">{isRTL ? 'لا توجد خزائن' : 'No safes'}</option>}
                                        {safes.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({formatCurrency(Number(s.balance || 0))})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-surface-400 mb-1 block">{isRTL ? 'المبلغ' : 'Amount'}</label>
                                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="input-field py-2 text-sm w-full" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">{isRTL ? 'مرجع (اختياري)' : 'Reference (optional)'}</label>
                                <input type="text" value={reference} onChange={e => setReference(e.target.value)} className="input-field py-2 text-sm w-full" />
                            </div>

                            <div className="border-t border-surface-800 pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-sm font-bold text-white">{isRTL ? 'تخصيص على فواتير مستحقة' : 'Allocate to outstanding invoices'}</h3>
                                    <span className="text-xs text-surface-400">
                                        {isRTL ? 'المخصّص' : 'Allocated'}: <span className={totalAllocated > Number(amount || 0) + 0.01 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{formatCurrency(totalAllocated)}</span>
                                    </span>
                                </div>
                                {invoices.length === 0 ? (
                                    <p className="text-center py-4 text-surface-500 text-sm">{isRTL ? 'لا توجد فواتير مستحقة (التخصيص اختياري)' : 'No outstanding invoices (allocation optional)'}</p>
                                ) : (
                                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                        {invoices.map(inv => (
                                            <div key={inv.id} className="flex items-center gap-3 bg-surface-800/50 p-2.5 rounded-lg border border-surface-700/50">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white truncate">{inv.invoice_number}</p>
                                                    <p className="text-[11px] text-surface-400">{isRTL ? 'المتبقي' : 'Outstanding'}: {formatCurrency(outstanding(inv))}</p>
                                                </div>
                                                <input
                                                    type="number" step="0.01" min="0" placeholder="0.00"
                                                    value={allocations[inv.id] ?? ''}
                                                    onChange={e => setAllocations({ ...allocations, [inv.id]: e.target.value })}
                                                    className="input-field py-1.5 text-sm w-28"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-surface-800 flex justify-end gap-3 bg-surface-800/30">
                    <button onClick={onClose} className="px-4 py-2 text-surface-400 hover:text-white">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                    <button onClick={handleSubmit} disabled={saving || loading} className="btn-primary px-6 py-2 disabled:opacity-50 flex items-center gap-2">
                        {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div> : null}
                        {isRTL ? 'تسجيل الدفعة' : 'Record Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
}
