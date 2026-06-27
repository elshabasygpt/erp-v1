'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { writeOffApi, inventoryApi } from '@/lib/api';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface Props { locale: string; dict: any; }

const REASON_TYPES = ['damaged', 'expired', 'obsolete', 'theft', 'other'] as const;
type ReasonType = typeof REASON_TYPES[number];

const REASON_LABELS: Record<ReasonType, { ar: string; en: string; color: string }> = {
    damaged:  { ar: 'تالف',        en: 'Damaged',   color: 'badge-error' },
    expired:  { ar: 'منتهي الصلاحية', en: 'Expired', color: 'badge-warning' },
    obsolete: { ar: 'متقادم',      en: 'Obsolete',  color: 'badge-info' },
    theft:    { ar: 'سرقة',        en: 'Theft',     color: 'badge bg-purple-500/20 text-purple-400' },
    other:    { ar: 'أخرى',        en: 'Other',     color: 'badge bg-surface-200/10 text-surface-200/60' },
};

export default function WriteOffContent({ locale, dict }: Props) {
    const isRTL = locale === 'ar';
    const qc = useQueryClient();

    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const { data: list = [], isLoading } = useQuery({
        queryKey: ['write-offs'],
        queryFn: () => writeOffApi.getAll({ per_page: 30 }).then(r => r.data?.data?.data || r.data?.data || []),
    });

    const { data: detail } = useQuery({
        queryKey: ['write-off', showDetail],
        queryFn: () => writeOffApi.getOne(showDetail!).then(r => r.data?.data),
        enabled: !!showDetail,
    });

    const { data: warehouses = [] } = useQuery({
        queryKey: ['warehouses-small'],
        queryFn: () => inventoryApi.getWarehouses().then(r => r.data?.data?.data || r.data?.data || []),
    });

    // ── Create form ──────────────────────────────────────────────
    const emptyForm = { warehouse_id: '', reason: '', reason_type: 'damaged' as ReasonType };
    const [form, setForm] = useState(emptyForm);
    const [items, setItems] = useState<{ product_id: string; product_name: string; sku: string; quantity: string; cost_per_unit: string; notes: string }[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [searchingProd, setSearchingProd] = useState(false);

    const searchProducts = useCallback(async (q: string) => {
        if (q.length < 2) { setProductResults([]); return; }
        setSearchingProd(true);
        try {
            const r = await inventoryApi.getProducts({ search: q, limit: 8, warehouse_id: form.warehouse_id || undefined });
            setProductResults(r.data?.data?.data || r.data?.data || []);
        } finally {
            setSearchingProd(false);
        }
    }, [form.warehouse_id]);

    const addItem = (p: any) => {
        if (items.find(i => i.product_id === p.id)) return;
        setItems(prev => [...prev, {
            product_id: p.id,
            product_name: p.name || p.name_ar,
            sku: p.sku || '',
            quantity: '1',
            cost_per_unit: String(p.cost_price || 0),
            notes: '',
        }]);
        setProductSearch('');
        setProductResults([]);
    };

    const createMutation = useMutation({
        mutationFn: () => writeOffApi.create({
            warehouse_id: form.warehouse_id,
            reason: form.reason,
            reason_type: form.reason_type,
            items: items.filter(i => i.product_id).map(i => ({
                product_id: i.product_id,
                quantity: Number(i.quantity),
                cost_per_unit: Number(i.cost_per_unit) || undefined,
                notes: i.notes || undefined,
            })),
        }),
        onSuccess: (res) => {
            showMsg(isRTL ? 'تم تسجيل الإتلاف بنجاح ✓' : 'Write-off recorded ✓');
            setShowCreate(false);
            setForm(emptyForm);
            setItems([]);
            qc.invalidateQueries({ queryKey: ['write-offs'] });
            const id = res.data?.data?.id;
            if (id) setShowDetail(id);
        },
        onError: (e: any) => showMsg(e?.response?.data?.message || 'Error', 'error'),
    });

    const { format: fmt } = useCurrencyFormatter();
    const totalValue = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.cost_per_unit) || 0), 0);

    return (
        <div className="space-y-6 p-4 sm:p-6 animate-fade-in">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-[200] px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold flex items-center gap-2 animate-scale-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-red-500">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                        <span className="text-3xl">🗑️</span>
                        {isRTL ? 'إتلاف وشطب المخزون' : 'Stock Write-Offs'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'تسجيل البضاعة التالفة أو منتهية الصلاحية أو المسروقة' : 'Record damaged, expired, obsolete or stolen stock'}
                    </p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 shadow-lg !bg-red-600 shadow-red-600/30">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    {isRTL ? 'تسجيل إتلاف جديد' : 'New Write-Off'}
                </button>
            </div>

            {/* List */}
            <div className="glass-card p-6">
                {isLoading ? (
                    <div className="py-12 text-center"><div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : list.length === 0 ? (
                    <div className="py-12 text-center">
                        <span className="text-5xl block mb-3">🗑️</span>
                        <p style={{ color: 'var(--text-muted)' }}>{isRTL ? 'لا توجد عمليات إتلاف مسجلة' : 'No write-offs recorded'}</p>
                        <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 text-sm !bg-red-600">
                            {isRTL ? '+ تسجيل أول إتلاف' : '+ Record First Write-Off'}
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table text-sm w-full">
                            <thead>
                                <tr>
                                    <th>{isRTL ? 'الرقم المرجعي' : 'Reference'}</th>
                                    <th>{isRTL ? 'المستودع' : 'Warehouse'}</th>
                                    <th>{isRTL ? 'السبب' : 'Reason'}</th>
                                    <th>{isRTL ? 'النوع' : 'Type'}</th>
                                    <th>{isRTL ? 'عدد الأصناف' : 'Items'}</th>
                                    <th>{isRTL ? 'إجمالي التكلفة' : 'Total Cost'}</th>
                                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((wo: any) => {
                                    const rt = REASON_LABELS[wo.reason_type as ReasonType];
                                    return (
                                        <tr key={wo.id}>
                                            <td className="font-mono text-red-400 font-medium">{wo.reference_number}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{wo.warehouse?.name || '—'}</td>
                                            <td className="max-w-[140px] truncate text-xs" style={{ color: 'var(--text-muted)' }} title={wo.reason}>{wo.reason}</td>
                                            <td><span className={`badge ${rt?.color}`}>{isRTL ? rt?.ar : rt?.en}</span></td>
                                            <td className="text-center">{wo.items_count ?? wo.items?.length ?? '—'}</td>
                                            <td className="font-medium text-red-400">{fmt(Number(wo.total_cost || 0))}</td>
                                            <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{wo.created_at?.split('T')[0]}</td>
                                            <td>
                                                <button onClick={() => setShowDetail(wo.id)} className="btn-icon text-xs" title={isRTL ? 'عرض' : 'View'}>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Detail Modal ── */}
            {showDetail && detail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
                    <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                            <div>
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>🗑️ {detail.reference_number}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`badge ${REASON_LABELS[detail.reason_type as ReasonType]?.color}`}>
                                        {isRTL ? REASON_LABELS[detail.reason_type as ReasonType]?.ar : REASON_LABELS[detail.reason_type as ReasonType]?.en}
                                    </span>
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{detail.warehouse?.name}</span>
                                    <span className="font-bold text-red-400">{fmt(Number(detail.total_cost || 0))}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowDetail(null)} className="btn-icon">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="glass-card p-4">
                                <p className="text-xs mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'السبب' : 'Reason'}</p>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{detail.reason}</p>
                            </div>
                            <table className="data-table text-sm w-full">
                                <thead><tr>
                                    <th>{isRTL ? 'المنتج' : 'Product'}</th>
                                    <th>{isRTL ? 'SKU' : 'SKU'}</th>
                                    <th>{isRTL ? 'الكمية' : 'Qty'}</th>
                                    <th>{isRTL ? 'التكلفة/وحدة' : 'Cost/Unit'}</th>
                                    <th>{isRTL ? 'الإجمالي' : 'Total'}</th>
                                </tr></thead>
                                <tbody>
                                    {detail.items?.map((item: any) => (
                                        <tr key={item.id}>
                                            <td>{item.product?.name || item.product_id}</td>
                                            <td className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{item.product?.sku || '—'}</td>
                                            <td>{item.quantity}</td>
                                            <td>{fmt(Number(item.cost_per_unit))}</td>
                                            <td className="font-medium text-red-400">{fmt(Number(item.total_cost))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create Modal ── */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
                    <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md z-10" style={{ borderColor: 'var(--border-default)' }}>
                            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <span>🗑️</span> {isRTL ? 'تسجيل إتلاف مخزون' : 'Record Stock Write-Off'}
                            </h2>
                            <button onClick={() => setShowCreate(false)} className="btn-icon">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'المستودع *' : 'Warehouse *'}</label>
                                    <select className="select-field py-2 text-sm w-full" value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>
                                        <option value="">{isRTL ? '-- اختر مستودع --' : '-- Select warehouse --'}</option>
                                        {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'نوع الإتلاف *' : 'Write-Off Type *'}</label>
                                    <select className="select-field py-2 text-sm w-full" value={form.reason_type} onChange={e => setForm(f => ({ ...f, reason_type: e.target.value as ReasonType }))}>
                                        {REASON_TYPES.map(t => (
                                            <option key={t} value={t}>{isRTL ? REASON_LABELS[t].ar : REASON_LABELS[t].en}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'السبب التفصيلي *' : 'Detailed Reason *'}</label>
                                <textarea rows={2} className="input-field py-2 text-sm w-full resize-none" value={form.reason}
                                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                    placeholder={isRTL ? 'وصف سبب الإتلاف...' : 'Describe the write-off reason...'} />
                            </div>

                            {/* Items */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3 flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
                                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {isRTL ? 'المنتجات المتلفة' : 'Items to Write Off'}</span>
                                    {items.length > 0 && <span className="text-xs text-red-400">{isRTL ? 'إجمالي التكلفة:' : 'Total cost:'} {fmt(totalValue)}</span>}
                                </h4>

                                {items.map((item, i) => (
                                    <div key={i} className="glass-card p-3 mb-2 grid grid-cols-4 gap-2 items-center">
                                        <div className="col-span-1">
                                            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.product_name}</p>
                                            <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{item.sku}</p>
                                        </div>
                                        <input type="number" min="0.01" step="0.01" className="input-field py-1.5 text-xs" value={item.quantity}
                                            onChange={e => setItems(prev => prev.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
                                            placeholder={isRTL ? 'الكمية' : 'Qty'} dir="ltr" />
                                        <input type="number" min="0" step="0.01" className="input-field py-1.5 text-xs" value={item.cost_per_unit}
                                            onChange={e => setItems(prev => prev.map((x, j) => j === i ? { ...x, cost_per_unit: e.target.value } : x))}
                                            placeholder={isRTL ? 'التكلفة' : 'Cost'} dir="ltr" />
                                        <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="btn-icon hover:!text-red-400 text-xs justify-self-end">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}

                                <div className="relative">
                                    <input className="input-field py-2 text-sm w-full" placeholder={isRTL ? 'ابحث عن منتج لإضافته...' : 'Search product to add...'}
                                        value={productSearch}
                                        onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }} />
                                    {searchingProd && <span className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin inline-block" />}
                                    {productResults.length > 0 && (
                                        <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-surface-800 rounded-xl shadow-xl border max-h-40 overflow-y-auto" style={{ borderColor: 'var(--border-default)' }}>
                                            {productResults.map((p: any) => (
                                                <button key={p.id} onClick={() => addItem(p)}
                                                    className="w-full text-start px-3 py-2 text-sm hover:bg-red-500/10 transition-colors border-b last:border-0"
                                                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                                                    {p.name || p.name_ar}
                                                    {p.sku && <span className="ms-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.sku}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-5 border-t sticky bottom-0 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md" style={{ borderColor: 'var(--border-default)' }}>
                            <button onClick={() => setShowCreate(false)} className="btn-secondary">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                            <button
                                onClick={() => createMutation.mutate()}
                                disabled={createMutation.isPending || !form.warehouse_id || !form.reason.trim() || items.length === 0}
                                className="btn-primary flex items-center gap-2 !bg-red-600 shadow-lg shadow-red-600/30 disabled:opacity-60">
                                {createMutation.isPending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />}
                                {createMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'تسجيل الإتلاف' : 'Record Write-Off')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
