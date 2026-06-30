'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi, treasuryApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Wallet, CheckCircle2 } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { CardSkeleton } from '@/components/ui/Skeleton';

export default function CommissionsScreen() {
    const isRTL = true;
    const queryClient = useQueryClient();
    const [payingSalespersonId, setPayingSalespersonId] = useState<string | null>(null);
    const [safeId, setSafeId] = useState('');

    const { data: groups = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['commissions', 'unpaid'],
        queryFn: async () => {
            const res = await salesApi.getUnpaidCommissions();
            return res.data?.data || [];
        },
    });

    const { data: safes = [] } = useQuery({
        queryKey: ['safes'],
        queryFn: async () => {
            const res = await treasuryApi.getSafes();
            return res.data?.data?.data || res.data?.data || [];
        },
    });

    const { format: formatCurrencyFn } = useCurrencyFormatter();
    const formatCurrency = (v: number) => formatCurrencyFn(v || 0);

    const handlePay = async (group: any) => {
        setPayingSalespersonId(group.salesperson_id);
        try {
            await salesApi.payCommission({
                salesperson_id: group.salesperson_id,
                invoice_ids: group.invoices.map((inv: any) => inv.id),
                safe_id: safeId || undefined,
            });
            toast.success(isRTL ? 'تم صرف العمولة بنجاح' : 'Commission paid out successfully');
            queryClient.invalidateQueries({ queryKey: ['commissions', 'unpaid'] });
        } catch (error: any) {
            toast.error(error.response?.data?.message || (isRTL ? 'حدث خطأ أثناء الصرف' : 'Failed to pay out commission'));
        } finally {
            setPayingSalespersonId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {isRTL ? 'عمولات المبيعات' : 'Sales Commissions'}
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'عمولات مستحقة لم تُصرف بعد لكل بائع' : 'Accrued, unpaid commission per salesperson'}
                </p>
            </div>

            <div className="glass-card p-4 flex items-center gap-3 max-w-md">
                <Wallet className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <select
                    value={safeId}
                    onChange={e => setSafeId(e.target.value)}
                    className="select-field w-full text-sm"
                >
                    <option value="">{isRTL ? 'بدون سحب من خزينة (تسوية فقط)' : 'No safe withdrawal (settle only)'}</option>
                    {safes.map((safe: any) => (
                        <option key={safe.id} value={safe.id}>{isRTL ? (safe.name_ar || safe.name) : safe.name}</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
            ) : isError ? (
                <div className="glass-card p-8 text-center">
                    <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                        {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                    </p>
                    <button onClick={() => refetch()} className="btn-secondary py-1.5 px-4 text-xs">
                        🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            ) : groups.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                    <p style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'لا توجد عمولات مستحقة حاليًا' : 'No unpaid commission right now'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map((group: any) => (
                        <div key={group.salesperson_id} className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                        {group.salesperson_name || group.salesperson_id}
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? `${group.invoices.length} فاتورة` : `${group.invoices.length} invoice(s)`}
                                    </p>
                                </div>
                                <div className="text-end">
                                    <p className="text-2xl font-black text-primary-500">{formatCurrency(group.total_unpaid)}</p>
                                    <button
                                        onClick={() => handlePay(group)}
                                        disabled={payingSalespersonId === group.salesperson_id}
                                        className="btn-primary mt-2 px-6 py-2 text-sm disabled:opacity-50"
                                    >
                                        {payingSalespersonId === group.salesperson_id
                                            ? (isRTL ? 'جاري الصرف...' : 'Paying...')
                                            : (isRTL ? 'صرف العمولة' : 'Pay Commission')}
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="data-table text-sm w-full">
                                    <thead>
                                        <tr>
                                            <th>{isRTL ? 'رقم الفاتورة' : 'Invoice #'}</th>
                                            <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                            <th>{isRTL ? 'العمولة' : 'Commission'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.invoices.map((inv: any) => (
                                            <tr key={inv.id}>
                                                <td className="font-mono">{inv.invoice_number}</td>
                                                <td>{inv.invoice_date}</td>
                                                <td className="font-bold">{formatCurrency(inv.commission_amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
