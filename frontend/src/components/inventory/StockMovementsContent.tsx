'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { inventoryApi } from '@/lib/api';

interface StockMovementsContentProps {
    dict: any;
    locale: string;
}

type MovementType = 'incoming' | 'outgoing' | 'adjustment' | 'return' | 'transfer';

const TYPE_CONFIG = {
    incoming:   { ar: 'وارد',     en: 'Incoming',    icon: '⬆️', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    outgoing:   { ar: 'صادر',     en: 'Outgoing',    icon: '⬇️', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    adjustment: { ar: 'تسوية',    en: 'Adjustment',  icon: '⚖️', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    return:     { ar: 'مرتجع',    en: 'Return',      icon: '↩️', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    transfer:   { ar: 'تحويل',    en: 'Transfer',    icon: '🔄', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
};

export default function StockMovementsContent({ dict, locale }: StockMovementsContentProps) {
    const isRTL = locale === 'ar';

    const [loading, setLoading]             = useState(true);
    const [movements, setMovements]         = useState<any[]>([]);
    const [summary, setSummary]             = useState<any>(null);
    const [products, setProducts]           = useState<any[]>([]);
    const [typeFilter, setTypeFilter]       = useState<MovementType | 'all'>('all');
    const [search, setSearch]               = useState('');
    const [showAddModal, setShowAddModal]   = useState(false);
    const [saving, setSaving]               = useState(false);
    const [error, setError]                 = useState<string | null>(null);

    const [form, setForm] = useState({
        product_id: '', warehouse_id: '',
        type: 'incoming' as MovementType,
        quantity: '', notes: '', reference_type: '', reference_id: '',
    });

    // ── Load data ──────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [movRes, sumRes, prodRes] = await Promise.all([
                inventoryApi.getMovements({ type: typeFilter !== 'all' ? typeFilter : undefined }),
                inventoryApi.getMovementsSummary(),
                inventoryApi.getProducts({ per_page: 200 }),
            ]);
            setMovements(movRes.data?.data || movRes.data || []);
            setSummary(sumRes.data?.data || sumRes.data || {});
            setProducts(prodRes.data?.data || prodRes.data || []);
        } catch {
            // Fallback to empty state — backend may be offline
            setError(isRTL ? 'تعذّر تحميل البيانات. تحقق من اتصال الخادم.' : 'Failed to load data. Check server connection.');
            setMovements([]);
            setSummary({});
        } finally {
            setLoading(false);
        }
    }, [typeFilter, isRTL]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Local filter (search only — type filter hits API) ──────────
    const filtered = useMemo(() => {
        if (!search) return movements;
        const q = search.toLowerCase();
        return movements.filter(m => {
            const name = (m.product?.name || '').toLowerCase();
            const code = (m.product?.sku || m.product?.barcode || '').toLowerCase();
            const ref  = String(m.reference_id || '').toLowerCase();
            return name.includes(q) || code.includes(q) || ref.includes(q);
        });
    }, [movements, search]);

    // ── Add Movement ──────────────────────────────────────────────
    const handleAddMovement = async () => {
        if (!form.product_id || !form.quantity) return;
        setSaving(true);
        try {
            await inventoryApi.createMovement({
                product_id:    parseInt(form.product_id),
                warehouse_id:  form.warehouse_id ? parseInt(form.warehouse_id) : null,
                type:          form.type,
                quantity:      parseFloat(form.quantity),
                notes:         form.notes || null,
                reference_type:form.reference_type || null,
                reference_id:  form.reference_id ? parseInt(form.reference_id) : null,
            });
            setForm({ product_id: '', warehouse_id: '', type: 'incoming', quantity: '', notes: '', reference_type: '', reference_id: '' });
            setShowAddModal(false);
            await loadData();
        } catch (err: any) {
            const msg = err?.response?.data?.message || (isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving movement');
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
                        <span>📦</span> {isRTL ? 'حركات المخزون' : 'Stock Movements'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'تتبع وارد وصادر المخزون في الوقت الفعلي' : 'Real-time inventory tracking'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <a href={`/${locale}/dashboard/inventory`} className="btn-secondary text-sm flex items-center gap-2">
                        ← {isRTL ? 'المخزون' : 'Inventory'}
                    </a>
                    <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {isRTL ? 'إضافة حركة' : 'Add Movement'}
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 rounded-xl flex items-center gap-3"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <span className="text-xl">⚠️</span>
                    <p className="text-sm text-red-400">{error}</p>
                    <button onClick={loadData} className="ms-auto btn-secondary text-xs">
                        {isRTL ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { type: 'incoming',   label: isRTL ? 'إجمالي الوارد'     : 'Total Incoming',  value: summary?.total_incoming   || 0, suffix: isRTL ? 'وحدة' : 'units' },
                    { type: 'outgoing',   label: isRTL ? 'إجمالي الصادر'     : 'Total Outgoing',  value: summary?.total_outgoing   || 0, suffix: isRTL ? 'وحدة' : 'units' },
                    { type: 'adjustment', label: isRTL ? 'عمليات التسوية'     : 'Adjustments',     value: summary?.total_adjustments|| 0, suffix: isRTL ? 'عملية' : 'ops'  },
                    { type: 'return',     label: isRTL ? 'إجمالي المرتجعات'  : 'Total Returns',   value: summary?.total_returns    || 0, suffix: isRTL ? 'وحدة' : 'units' },
                ].map(card => {
                    const cfg = TYPE_CONFIG[card.type as MovementType];
                    return (
                        <div key={card.type} className="stat-card cursor-pointer" onClick={() => setTypeFilter(card.type as MovementType)}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
                                    <p className="text-2xl font-bold" style={{ color: cfg.color }}>
                                        {loading ? '—' : Number(card.value).toLocaleString()}
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{card.suffix}</p>
                                </div>
                                <span className="text-2xl">{cfg.icon}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Table */}
            <div className="glass-card p-6">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <h3 className="font-semibold flex-1" style={{ color: 'var(--text-heading)' }}>
                        {isRTL ? 'سجل الحركات' : 'Movement Log'}
                        <span className="text-xs font-normal ms-2 px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                            {filtered.length}
                        </span>
                    </h3>

                    {/* Type filter buttons */}
                    <div className="flex gap-1.5 flex-wrap">
                        {(['all', 'incoming', 'outgoing', 'adjustment', 'return', 'transfer'] as const).map(t => {
                            const cfg = t === 'all' ? null : TYPE_CONFIG[t];
                            const isActive = typeFilter === t;
                            return (
                                <button key={t} onClick={() => setTypeFilter(t)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                    style={isActive
                                        ? { background: t === 'all' ? 'var(--color-primary)' : cfg!.bg, color: t === 'all' ? '#fff' : cfg!.color, border: `1px solid ${t === 'all' ? 'transparent' : cfg!.color + '40'}` }
                                        : { background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }
                                    }>
                                    {t === 'all' ? (isRTL ? 'الكل' : 'All') : (isRTL ? cfg!.ar : cfg!.en)}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input type="text" placeholder={isRTL ? 'بحث...' : 'Search...'}
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="input-field ps-9 py-1.5 text-sm w-44" />
                    </div>
                </div>

                {/* Loading skeleton */}
                {loading ? (
                    <div className="space-y-3">
                        {Array(6).fill(0).map((_, i) => (
                            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--bg-surface-secondary)' }} />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table text-sm">
                            <thead>
                                <tr>
                                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                    <th>{isRTL ? 'النوع' : 'Type'}</th>
                                    <th>{isRTL ? 'المنتج' : 'Product'}</th>
                                    <th>{isRTL ? 'الكمية' : 'Qty'}</th>
                                    <th>{isRTL ? 'مرجع' : 'Reference'}</th>
                                    <th>{isRTL ? 'ملاحظات' : 'Notes'}</th>
                                    <th>{isRTL ? 'المستخدم' : 'User'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(m => {
                                    const cfg = TYPE_CONFIG[m.type as MovementType] || TYPE_CONFIG.adjustment;
                                    const isNeg = m.type === 'outgoing';
                                    return (
                                        <tr key={m.id}>
                                            <td style={{ color: 'var(--text-muted)' }}>
                                                {m.created_at ? new Date(m.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US') : '—'}
                                            </td>
                                            <td>
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                                                    style={{ background: cfg.bg, color: cfg.color }}>
                                                    {cfg.icon} {isRTL ? cfg.ar : cfg.en}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {m.product?.name || `#${m.product_id}`}
                                                </span>
                                                {m.product?.sku && (
                                                    <span className="block text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                                        {m.product.sku}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="font-bold" style={{ color: isNeg ? '#ef4444' : '#10b981' }}>
                                                    {isNeg ? '-' : '+'}{Number(m.quantity).toLocaleString()}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>
                                                {m.reference_type && (
                                                    <span className="text-[11px] font-mono" style={{ color: 'var(--color-primary)' }}>
                                                        {m.reference_type}-{m.reference_id}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{m.notes || '—'}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{m.creator?.name || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length === 0 && !loading && (
                            <div className="text-center py-12">
                                <span className="text-3xl mb-3 block">📭</span>
                                <p style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? 'لا توجد حركات مخزون' : 'No stock movements found'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Add Movement Modal ── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-md rounded-2xl overflow-hidden"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <div className="px-6 py-4 flex items-center justify-between"
                            style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
                                <span>📦</span> {isRTL ? 'إضافة حركة مخزون' : 'Add Stock Movement'}
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="btn-icon">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                    {isRTL ? 'المنتج' : 'Product'} *
                                </label>
                                <select className="input-field w-full" value={form.product_id}
                                    onChange={e => setForm({ ...form, product_id: e.target.value })}>
                                    <option value="">{isRTL ? 'اختر منتجاً' : 'Select product'}</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({isRTL ? 'المخزون:' : 'Stock:'} {p.stock_quantity ?? 0})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                        {isRTL ? 'نوع الحركة' : 'Movement Type'} *
                                    </label>
                                    <select className="input-field w-full" value={form.type}
                                        onChange={e => setForm({ ...form, type: e.target.value as MovementType })}>
                                        {(Object.entries(TYPE_CONFIG) as [MovementType, any][]).map(([key, cfg]) => (
                                            <option key={key} value={key}>{cfg.icon} {isRTL ? cfg.ar : cfg.en}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                        {isRTL ? 'الكمية' : 'Quantity'} *
                                    </label>
                                    <input type="number" min="0.01" step="0.01" className="input-field w-full"
                                        placeholder="0" value={form.quantity}
                                        onChange={e => setForm({ ...form, quantity: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                    {isRTL ? 'ملاحظات' : 'Notes'}
                                </label>
                                <input type="text" className="input-field w-full"
                                    placeholder={isRTL ? 'سبب الحركة...' : 'Reason for movement...'}
                                    value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                        {isRTL ? 'نوع المرجع' : 'Ref Type'}
                                    </label>
                                    <input type="text" className="input-field w-full" placeholder="invoice / po / adj"
                                        dir="ltr" value={form.reference_type}
                                        onChange={e => setForm({ ...form, reference_type: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                        {isRTL ? 'رقم المرجع' : 'Ref ID'}
                                    </label>
                                    <input type="number" className="input-field w-full" placeholder="1234"
                                        dir="ltr" value={form.reference_id}
                                        onChange={e => setForm({ ...form, reference_id: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: '1px solid var(--border-default)' }}>
                            <button onClick={() => setShowAddModal(false)} className="btn-secondary" disabled={saving}>
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button onClick={handleAddMovement} className="btn-primary"
                                disabled={!form.product_id || !form.quantity || saving}>
                                {saving
                                    ? (isRTL ? 'جاري الحفظ...' : 'Saving...')
                                    : (isRTL ? 'حفظ الحركة' : 'Save Movement')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
