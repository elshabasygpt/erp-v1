'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workshopApi, inventoryApi, crmApi, salesApi } from '@/lib/api';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useRegionalSettings } from '@/providers/RegionalSettingsProvider';
import Skeleton from '@/components/ui/Skeleton';

interface Props { locale: string; dict: any; }

const STATUS_MAP: Record<string, { ar: string; en: string; color: string }> = {
    pending:       { ar: 'معلق',          en: 'Pending',       color: 'badge-warning' },
    in_progress:   { ar: 'قيد التنفيذ',   en: 'In Progress',   color: 'badge-info' },
    waiting_parts: { ar: 'انتظار قطع',    en: 'Waiting Parts', color: 'badge-error' },
    completed:     { ar: 'مكتمل',         en: 'Completed',     color: 'badge-success' },
    cancelled:     { ar: 'ملغي',          en: 'Cancelled',     color: 'badge bg-surface-200/10 text-surface-200/60' },
};

const STATUSES = Object.keys(STATUS_MAP);

export default function WorkshopContent({ locale, dict }: Props) {
    const isRTL = locale === 'ar';
    const qc = useQueryClient();
    const { taxRate } = useRegionalSettings();
    const { format: fmt } = useCurrencyFormatter();

    const [statusFilter, setStatusFilter] = useState('all');
    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState<string | null>(null);
    const [convertModal, setConvertModal] = useState<{ jobCard: any; warehouseId: string } | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Fetch all jobs unfiltered so status-card counts are always accurate.
    // Client-side filtering is applied below for the table view.
    const { data: allJobs = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['workshop-jobs'],
        queryFn: async () => {
            const res = await workshopApi.getAll({ per_page: 100 });
            return res.data?.data?.data || res.data?.data || [];
        },
    });
    const list = statusFilter === 'all' ? allJobs : allJobs.filter((j: any) => j.status === statusFilter);

    const { data: detail } = useQuery({
        queryKey: ['workshop-job', showDetail],
        queryFn: () => workshopApi.getOne(showDetail!).then(r => r.data?.data),
        enabled: !!showDetail,
    });

    const { data: warehouses = [] } = useQuery({
        queryKey: ['warehouses-small'],
        queryFn: () => inventoryApi.getWarehouses().then(r => r.data?.data?.data || r.data?.data || []),
    });

    const { data: customers = [] } = useQuery({
        queryKey: ['customers-small'],
        queryFn: () => crmApi.getCustomers({ limit: 200 }).then(r => r.data?.data?.data || r.data?.data || []),
        enabled: showCreate,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => workshopApi.update(id, data),
        onSuccess: (res) => {
            showMsg(isRTL ? 'تم تحديث الحالة ✓' : 'Status updated ✓');
            qc.invalidateQueries({ queryKey: ['workshop-jobs'] });
            if (showDetail) qc.invalidateQueries({ queryKey: ['workshop-job', showDetail] });
        },
        onError: (e: any) => showMsg(e?.response?.data?.message || 'Error', 'error'),
    });

    // ── Create Form ──────────────────────────────────────────
    const emptyForm = { customer_id: '', complaint: '', diagnosis: '', mileage_in: '', estimated_completion: '', technician_id: '', internal_notes: '' };
    const [form, setForm] = useState(emptyForm);
    const [parts, setParts] = useState<{ product_id: string; product_name: string; warehouse_id: string; quantity: string; unit_price: string }[]>([]);
    const [services, setServices] = useState<{ description: string; hours: string; rate_per_hour: string }[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [searchingProd, setSearchingProd] = useState(false);

    const searchProducts = useCallback(async (q: string) => {
        if (q.length < 2) { setProductResults([]); return; }
        setSearchingProd(true);
        try {
            const r = await inventoryApi.getProducts({ search: q, limit: 8 });
            setProductResults(r.data?.data?.data || r.data?.data || []);
        } finally {
            setSearchingProd(false);
        }
    }, []);

    const addPart = (p: any) => {
        setParts(prev => [...prev, { product_id: p.id, product_name: p.name || p.name_ar, warehouse_id: '', quantity: '1', unit_price: String(p.sell_price || 0) }]);
        setProductSearch('');
        setProductResults([]);
    };

    const createMutation = useMutation({
        mutationFn: () => workshopApi.create({
            customer_id: form.customer_id || undefined,
            complaint: form.complaint,
            diagnosis: form.diagnosis || undefined,
            internal_notes: form.internal_notes || undefined,
            mileage_in: form.mileage_in ? Number(form.mileage_in) : undefined,
            estimated_completion: form.estimated_completion || undefined,
            parts: parts.filter(p => p.product_id).map(p => ({
                product_id: p.product_id,
                warehouse_id: p.warehouse_id || undefined,
                quantity: Number(p.quantity),
                unit_price: Number(p.unit_price),
            })),
            services: services.filter(s => s.description).map(s => ({
                description: s.description,
                hours: Number(s.hours),
                rate_per_hour: Number(s.rate_per_hour),
            })),
        }),
        onSuccess: (res) => {
            showMsg(isRTL ? 'تم إنشاء بطاقة العمل ✓' : 'Job card created ✓');
            setShowCreate(false);
            setForm(emptyForm);
            setParts([]);
            setServices([]);
            qc.invalidateQueries({ queryKey: ['workshop-jobs'] });
            const id = res.data?.data?.id;
            if (id) setShowDetail(id);
        },
        onError: (e: any) => showMsg(e?.response?.data?.message || 'Error', 'error'),
    });

    const [converting, setConverting] = useState(false);

    const handleConvert = async () => {
        if (!convertModal?.warehouseId) return;
        setConverting(true);
        try {
            const payloadRes = await workshopApi.convertToInvoice(convertModal.jobCard.id, convertModal.warehouseId);
            const payload = payloadRes.data?.data;
            if (!payload) { showMsg(isRTL ? 'لم يتم استلام البيانات' : 'No payload received', 'error'); return; }

            const partItems = (payload.items || []).filter((i: any) => i.product_id);
            if (partItems.length === 0) {
                showMsg(isRTL ? 'لا توجد قطع لتحويلها إلى فاتورة' : 'No parts to invoice', 'error');
                return;
            }

            await salesApi.createInvoice({
                customer_id:  payload.customer_id || undefined,
                warehouse_id: payload.warehouse_id,
                type:         'cash',
                notes:        payload.notes || `بطاقة عمل: ${convertModal.jobCard.job_number}`,
                items: partItems.map((i: any) => ({
                    product_id:       i.product_id,
                    quantity:         i.quantity,
                    unit_price:       i.unit_price,
                    discount_percent: 0,
                    vat_rate:         taxRate,
                })),
            });

            setConvertModal(null);
            showMsg(isRTL ? 'تم إنشاء الفاتورة بنجاح ✓' : 'Invoice created ✓');
            qc.invalidateQueries({ queryKey: ['workshop-jobs'] });
            setTimeout(() => { window.location.href = `/${locale}/dashboard/sales`; }, 1500);
        } catch (e: any) {
            showMsg(e?.response?.data?.message || (isRTL ? 'حدث خطأ' : 'Error'), 'error');
        } finally {
            setConverting(false);
        }
    };


    return (
        <div className="space-y-6 p-4 sm:p-6 animate-fade-in">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-[200] px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold flex items-center gap-2 animate-scale-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-orange-500">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                        <span className="text-3xl">🔧</span>
                        {isRTL ? 'الورشة وبطاقات العمل' : 'Workshop & Job Cards'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'إدارة أوامر الخدمة والإصلاح' : 'Manage service and repair orders'}
                    </p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/30">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    {isRTL ? 'بطاقة عمل جديدة' : 'New Job Card'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[['all', '📋', isRTL ? 'الكل' : 'All'], ...STATUSES.map(s => [s, ''])].map(([s]) => {
                    const count = s === 'all' ? list.length : list.filter((j: any) => j.status === s).length;
                    const info = s === 'all' ? null : STATUS_MAP[s];
                    return (
                        <button key={s} onClick={() => setStatusFilter(s as string)}
                            className={`glass-card p-4 text-center transition-all hover:scale-105 ${statusFilter === s ? 'ring-2 ring-primary-500' : ''}`}>
                            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{count}</p>
                            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                                {s === 'all' ? (isRTL ? 'الكل' : 'All') : (isRTL ? info?.ar : info?.en)}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="glass-card p-6">
                {isLoading ? (
                    <div className="overflow-x-auto">
                        <table className="data-table text-sm w-full">
                            <thead>
                                <tr>
                                    <th>{isRTL ? 'رقم البطاقة' : 'Job #'}</th>
                                    <th>{isRTL ? 'العميل' : 'Customer'}</th>
                                    <th>{isRTL ? 'الشكوى' : 'Complaint'}</th>
                                    <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                    <th>{isRTL ? 'التكلفة' : 'Cost'}</th>
                                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={`sk-${i}`} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                                        {Array.from({ length: 7 }).map((__, j) => (
                                            <td key={j} className="p-3"><Skeleton className="w-3/4 h-4" /></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : isError ? (
                    <div className="py-12 text-center">
                        <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                            {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                        </p>
                        <button onClick={() => refetch()} className="btn-secondary py-1.5 px-4 text-xs">
                            🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                        </button>
                    </div>
                ) : list.length === 0 ? (
                    <div className="py-12 text-center">
                        <span className="text-5xl block mb-3">🔧</span>
                        <p style={{ color: 'var(--text-muted)' }}>{isRTL ? 'لا توجد بطاقات عمل' : 'No job cards found'}</p>
                        <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 text-sm">
                            {isRTL ? '+ أضف أول بطاقة' : '+ Add First Job Card'}
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table text-sm w-full">
                            <thead>
                                <tr>
                                    <th>{isRTL ? 'رقم البطاقة' : 'Job #'}</th>
                                    <th>{isRTL ? 'العميل' : 'Customer'}</th>
                                    <th>{isRTL ? 'الشكوى' : 'Complaint'}</th>
                                    <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                    <th>{isRTL ? 'التكلفة' : 'Cost'}</th>
                                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((job: any) => {
                                    const st = STATUS_MAP[job.status];
                                    return (
                                        <tr key={job.id}>
                                            <td className="font-mono text-primary-400 font-medium">{job.job_number}</td>
                                            <td style={{ color: 'var(--text-primary)' }}>{job.customer?.name || '—'}</td>
                                            <td className="max-w-[180px] truncate" style={{ color: 'var(--text-secondary)' }} title={job.complaint}>{job.complaint}</td>
                                            <td><span className={`badge ${st?.color}`}>{isRTL ? st?.ar : st?.en}</span></td>
                                            <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{fmt(Number(job.total_cost || 0))}</td>
                                            <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{job.created_at?.split('T')[0]}</td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setShowDetail(job.id)} className="btn-icon text-xs" title={isRTL ? 'عرض' : 'View'}>
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    </button>
                                                    {job.status === 'completed' && !job.invoice_id && (
                                                        <button onClick={() => setConvertModal({ jobCard: job, warehouseId: warehouses[0]?.id || '' })}
                                                            className="btn-icon text-xs text-emerald-500" title={isRTL ? 'تحويل لفاتورة' : 'Convert to Invoice'}>
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        </button>
                                                    )}
                                                </div>
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
                    <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md z-10" style={{ borderColor: 'var(--border-default)' }}>
                            <div>
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>🔧 {detail.job_number}</h2>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{detail.customer?.name} · {detail.customer?.phone}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Status change */}
                                <select className="select-field text-xs py-1.5" value={detail.status}
                                    onChange={e => updateMutation.mutate({ id: detail.id, data: { status: e.target.value } })}
                                    disabled={['completed', 'cancelled'].includes(detail.status)}>
                                    {STATUSES.map(s => (
                                        <option key={s} value={s}>{isRTL ? STATUS_MAP[s].ar : STATUS_MAP[s].en}</option>
                                    ))}
                                </select>
                                <button onClick={() => setShowDetail(null)} className="btn-icon">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Info */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    [isRTL ? 'الحالة' : 'Status', <span className={`badge ${STATUS_MAP[detail.status]?.color}`}>{isRTL ? STATUS_MAP[detail.status]?.ar : STATUS_MAP[detail.status]?.en}</span>],
                                    [isRTL ? 'قراءة العداد' : 'Mileage', detail.mileage_in ? `${detail.mileage_in.toLocaleString()} km` : '—'],
                                    [isRTL ? 'الإنجاز المتوقع' : 'Est. Completion', detail.estimated_completion || '—'],
                                    [isRTL ? 'تكلفة القطع' : 'Parts Cost', fmt(Number(detail.parts_cost || 0))],
                                    [isRTL ? 'تكلفة العمالة' : 'Labor Cost', fmt(Number(detail.labor_cost || 0))],
                                    [isRTL ? 'الإجمالي' : 'Total', <span className="font-bold text-emerald-500">{fmt(Number(detail.total_cost || 0))}</span>],
                                ].map(([label, val], i) => (
                                    <div key={i} className="glass-card p-3">
                                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{val}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Complaint & Diagnosis */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="glass-card p-4">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'الشكوى' : 'Complaint'}
                                    </h4>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{detail.complaint}</p>
                                </div>
                                {detail.diagnosis && (
                                    <div className="glass-card p-4">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                                            {isRTL ? 'التشخيص' : 'Diagnosis'}
                                        </h4>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{detail.diagnosis}</p>
                                    </div>
                                )}
                            </div>

                            {/* Parts */}
                            {detail.parts?.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        {isRTL ? 'القطع المستخدمة' : 'Parts Used'}
                                    </h4>
                                    <table className="data-table text-sm w-full">
                                        <thead><tr>
                                            <th>{isRTL ? 'المنتج' : 'Product'}</th>
                                            <th>{isRTL ? 'الكمية' : 'Qty'}</th>
                                            <th>{isRTL ? 'السعر' : 'Price'}</th>
                                            <th>{isRTL ? 'الإجمالي' : 'Total'}</th>
                                        </tr></thead>
                                        <tbody>
                                            {detail.parts.map((p: any) => (
                                                <tr key={p.id}>
                                                    <td>{p.product?.name || p.product_id}</td>
                                                    <td>{p.quantity}</td>
                                                    <td>{fmt(Number(p.unit_price))}</td>
                                                    <td className="font-medium">{fmt(Number(p.total))}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Services */}
                            {detail.services?.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                        {isRTL ? 'خدمات العمالة' : 'Labor Services'}
                                    </h4>
                                    <table className="data-table text-sm w-full">
                                        <thead><tr>
                                            <th>{isRTL ? 'الوصف' : 'Description'}</th>
                                            <th>{isRTL ? 'الساعات' : 'Hours'}</th>
                                            <th>{isRTL ? 'السعر/ساعة' : 'Rate/hr'}</th>
                                            <th>{isRTL ? 'الإجمالي' : 'Total'}</th>
                                        </tr></thead>
                                        <tbody>
                                            {detail.services.map((s: any) => (
                                                <tr key={s.id}>
                                                    <td>{s.description}</td>
                                                    <td>{s.hours}</td>
                                                    <td>{fmt(Number(s.rate_per_hour))}</td>
                                                    <td className="font-medium">{fmt(Number(s.total))}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Convert button */}
                            {detail.status === 'completed' && !detail.invoice_id && (
                                <div className="pt-2">
                                    <button
                                        onClick={() => setConvertModal({ jobCard: detail, warehouseId: warehouses[0]?.id || '' })}
                                        className="btn-primary w-full flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 !bg-emerald-600">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        {isRTL ? 'تحويل إلى فاتورة' : 'Convert to Invoice'}
                                    </button>
                                </div>
                            )}
                            {detail.invoice_id && (
                                <div className="glass-card p-4 text-center text-sm text-emerald-500">
                                    ✅ {isRTL ? 'تم إنشاء فاتورة' : 'Invoice created'}: {detail.invoice?.invoice_number}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Convert to Invoice Modal ── */}
            {convertModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in p-6">
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                            📄 {isRTL ? 'تحويل إلى فاتورة' : 'Convert to Invoice'}
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'اختر المستودع الذي ستُخصم منه القطع:' : 'Select the warehouse to deduct parts from:'}
                        </p>
                        <select className="select-field w-full mb-4"
                            value={convertModal.warehouseId}
                            onChange={e => setConvertModal({ ...convertModal, warehouseId: e.target.value })}>
                            <option value="">{isRTL ? '-- اختر مستودع --' : '-- Select warehouse --'}</option>
                            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                        <div className="flex gap-3">
                            <button onClick={() => setConvertModal(null)} disabled={converting} className="btn-secondary flex-1">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                            <button onClick={handleConvert} disabled={!convertModal.warehouseId || converting}
                                className="btn-primary flex-1 !bg-emerald-600 disabled:opacity-60 flex items-center justify-center gap-2">
                                {converting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />}
                                {converting ? (isRTL ? 'جاري الإنشاء...' : 'Creating...') : (isRTL ? 'إنشاء الفاتورة' : 'Create Invoice')}
                            </button>
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
                                <span>🔧</span> {isRTL ? 'بطاقة عمل جديدة' : 'New Job Card'}
                            </h2>
                            <button onClick={() => setShowCreate(false)} className="btn-icon">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Basic fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'العميل' : 'Customer'}</label>
                                    <select className="select-field py-2 text-sm w-full" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                                        <option value="">{isRTL ? '-- غير محدد --' : '-- No customer --'}</option>
                                        {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name || c.name_ar}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الإنجاز المتوقع' : 'Est. Completion'}</label>
                                    <input type="date" className="input-field py-2 text-sm w-full" value={form.estimated_completion} onChange={e => setForm(f => ({ ...f, estimated_completion: e.target.value }))} dir="ltr" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'قراءة العداد (كم)' : 'Mileage (km)'}</label>
                                    <input type="number" className="input-field py-2 text-sm w-full" value={form.mileage_in} onChange={e => setForm(f => ({ ...f, mileage_in: e.target.value }))} min="0" dir="ltr" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الشكوى *' : 'Complaint *'}</label>
                                <textarea rows={3} className="input-field py-2 text-sm w-full resize-none" value={form.complaint}
                                    onChange={e => setForm(f => ({ ...f, complaint: e.target.value }))}
                                    placeholder={isRTL ? 'وصف مشكلة العميل...' : 'Describe the customer complaint...'} />
                            </div>

                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'التشخيص' : 'Diagnosis'}</label>
                                <textarea rows={2} className="input-field py-2 text-sm w-full resize-none" value={form.diagnosis}
                                    onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                                    placeholder={isRTL ? 'التشخيص الفني...' : 'Technical diagnosis...'} />
                            </div>

                            {/* Parts */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {isRTL ? 'القطع' : 'Parts'}
                                </h4>
                                {parts.map((p, i) => (
                                    <div key={i} className="glass-card p-3 mb-2 grid grid-cols-3 gap-2 items-center">
                                        <span className="col-span-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.product_name}</span>
                                        <input type="number" min="0.01" step="0.01" className="input-field py-1.5 text-xs" value={p.quantity}
                                            onChange={e => setParts(prev => prev.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
                                            placeholder={isRTL ? 'الكمية' : 'Qty'} dir="ltr" />
                                        <div className="flex gap-1">
                                            <input type="number" min="0" className="input-field py-1.5 text-xs flex-1" value={p.unit_price}
                                                onChange={e => setParts(prev => prev.map((x, j) => j === i ? { ...x, unit_price: e.target.value } : x))}
                                                placeholder={isRTL ? 'السعر' : 'Price'} dir="ltr" />
                                            <button onClick={() => setParts(prev => prev.filter((_, j) => j !== i))} className="btn-icon hover:!text-red-400 text-xs">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {/* Product search */}
                                <div className="relative">
                                    <input className="input-field py-2 text-sm w-full" placeholder={isRTL ? 'ابحث عن منتج لإضافته...' : 'Search product to add...'}
                                        value={productSearch}
                                        onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }} />
                                    {searchingProd && <span className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin inline-block" />}
                                    {productResults.length > 0 && (
                                        <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-surface-800 rounded-xl shadow-xl border max-h-40 overflow-y-auto" style={{ borderColor: 'var(--border-default)' }}>
                                            {productResults.map((p: any) => (
                                                <button key={p.id} onClick={() => addPart(p)}
                                                    className="w-full text-start px-3 py-2 text-sm hover:bg-primary-500/10 transition-colors border-b last:border-0"
                                                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                                                    {p.name || p.name_ar}
                                                    {p.sku && <span className="ms-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.sku}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Services */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3 flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
                                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> {isRTL ? 'خدمات العمالة' : 'Labor Services'}</span>
                                    <button onClick={() => setServices(prev => [...prev, { description: '', hours: '1', rate_per_hour: '0' }])}
                                        className="text-xs text-primary-500 hover:underline">+ {isRTL ? 'إضافة' : 'Add'}</button>
                                </h4>
                                {services.map((s, i) => (
                                    <div key={i} className="glass-card p-3 mb-2 grid grid-cols-3 gap-2 items-center">
                                        <input className="input-field py-1.5 text-xs col-span-1" value={s.description}
                                            onChange={e => setServices(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                                            placeholder={isRTL ? 'وصف الخدمة' : 'Service description'} />
                                        <input type="number" min="0" step="0.5" className="input-field py-1.5 text-xs" value={s.hours}
                                            onChange={e => setServices(prev => prev.map((x, j) => j === i ? { ...x, hours: e.target.value } : x))}
                                            placeholder={isRTL ? 'ساعات' : 'Hours'} dir="ltr" />
                                        <div className="flex gap-1">
                                            <input type="number" min="0" className="input-field py-1.5 text-xs flex-1" value={s.rate_per_hour}
                                                onChange={e => setServices(prev => prev.map((x, j) => j === i ? { ...x, rate_per_hour: e.target.value } : x))}
                                                placeholder={isRTL ? 'السعر/ساعة' : 'Rate/hr'} dir="ltr" />
                                            <button onClick={() => setServices(prev => prev.filter((_, j) => j !== i))} className="btn-icon hover:!text-red-400 text-xs">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-5 border-t sticky bottom-0 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md" style={{ borderColor: 'var(--border-default)' }}>
                            <button onClick={() => setShowCreate(false)} className="btn-secondary">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                            <button
                                onClick={() => createMutation.mutate()}
                                disabled={createMutation.isPending || !form.complaint.trim()}
                                className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/30 disabled:opacity-60">
                                {createMutation.isPending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />}
                                {createMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'إنشاء البطاقة' : 'Create Job Card')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
