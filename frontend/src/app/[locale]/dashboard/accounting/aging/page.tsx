"use client";

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { accountingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import dayjs from 'dayjs';

type AgingType = 'receivable' | 'payable';

const BUCKET_LABELS: Record<string, { ar: string; en: string; color: string }> = {
    current: { ar: 'جاري',       en: 'Current',   color: '#10b981' },
    '1_30':  { ar: '1-30 يوم',   en: '1–30 days', color: '#0ea5e9' },
    '31_60': { ar: '31-60 يوم',  en: '31–60 days',color: '#f59e0b' },
    '61_90': { ar: '61-90 يوم',  en: '61–90 days',color: '#f97316' },
    over_90: { ar: 'أكثر من 90', en: 'Over 90',   color: '#ef4444' },
};

export default function AgingReportPage() {
    const { isRTL } = useLanguage();

    const [type, setType]     = useState<AgingType>('receivable');
    const [asOf, setAsOf]     = useState(dayjs().format('YYYY-MM-DD'));
    const [loading, setLoading] = useState(false);
    const [data, setData]     = useState<any>(null);
    const [search, setSearch] = useState('');
    const [view, setView]     = useState<'summary' | 'detail'>('summary');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const fn = type === 'receivable' ? accountingApi.getReceivableAging : accountingApi.getPayableAging;
            const res = await fn(asOf);
            setData(res.data?.data || res.data);
        } catch { toast.error(isRTL ? 'فشل التحميل' : 'Load failed'); }
        finally  { setLoading(false); }
    }, [type, asOf, isRTL]);

    const summaryRows = data?.(type === 'receivable' ? 'by_customer' : 'by_supplier') ?? (
        type === 'receivable' ? data?.by_customer : data?.by_supplier
    ) ?? [];
    const detailRows  = data?.by_invoice ?? data?.by_purchase ?? [];

    const filteredSummary = summaryRows.filter((r: any) => {
        const name = (r.customer_name || r.supplier_name || '').toLowerCase();
        return !search || name.includes(search.toLowerCase());
    });
    const filteredDetail  = detailRows.filter((r: any) => {
        const name = (r.customer_name || r.supplier_name || '').toLowerCase();
        const num  = (r.invoice_number || r.purchase_number || '').toLowerCase();
        return !search || name.includes(search.toLowerCase()) || num.includes(search.toLowerCase());
    });

    const fmt = (n: number) => n?.toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 }) ?? '—';

    return (
        <div className="space-y-6 p-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    📋 {isRTL ? 'كشف عمر الديون' : 'Aging Report'}
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'تحليل تفصيلي لعمر الذمم المدينة والدائنة' : 'Detailed analysis of receivables and payables by aging bucket'}
                </p>
            </div>

            {/* Controls */}
            <div className="glass-card p-4 flex flex-wrap gap-4 items-end">
                {/* Type toggle */}
                <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-default)' }}>
                    {(['receivable', 'payable'] as AgingType[]).map(t => (
                        <button key={t} onClick={() => { setType(t); setData(null); }}
                            className="px-4 py-2 text-sm font-semibold transition"
                            style={type === t
                                ? { background: '#10b981', color: '#fff' }
                                : { background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                            {t === 'receivable' ? (isRTL ? '👤 المدينون' : '👤 Receivable') : (isRTL ? '🏪 الدائنون' : '🏪 Payable')}
                        </button>
                    ))}
                </div>
                {/* As-of date */}
                <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'التاريخ' : 'As of Date'}
                    </label>
                    <input type="date" className="input-field py-2 text-sm" value={asOf} onChange={e => setAsOf(e.target.value)} />
                </div>
                <button onClick={load} disabled={loading} className="btn-primary">
                    {loading ? '...' : (isRTL ? 'إنشاء التقرير' : 'Generate')}
                </button>
            </div>

            {/* Results */}
            {data && (
                <>
                    {/* Bucket totals */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        {Object.entries(BUCKET_LABELS).map(([key, lbl]) => (
                            <div key={key} className="stat-card text-center">
                                <p className="text-xs mb-1" style={{ color: lbl.color }}>{isRTL ? lbl.ar : lbl.en}</p>
                                <p className="text-lg font-bold" style={{ color: lbl.color }}>
                                    {fmt(data.totals?.[key] ?? 0)}
                                </p>
                            </div>
                        ))}
                        <div className="stat-card text-center" style={{ borderColor: 'var(--border-default)' }}>
                            <p className="text-xs mb-1 font-bold" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'الإجمالي' : 'Total'}</p>
                            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                {fmt(data.totals?.total ?? 0)}
                            </p>
                        </div>
                    </div>

                    {/* View toggle + search */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-default)' }}>
                            {(['summary', 'detail'] as const).map(v => (
                                <button key={v} onClick={() => setView(v)}
                                    className="px-4 py-1.5 text-xs font-semibold transition"
                                    style={view === v
                                        ? { background: 'var(--bg-highlight)', color: 'var(--text-primary)' }
                                        : { background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                                    {v === 'summary' ? (isRTL ? 'ملخص' : 'Summary') : (isRTL ? 'تفصيلي' : 'Detail')}
                                </button>
                            ))}
                        </div>
                        <div className="relative ms-auto">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            <input type="text" className="input-field ps-10 py-2 text-sm w-52"
                                placeholder={isRTL ? 'بحث...' : 'Search...'}
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>

                    {/* Summary table */}
                    {view === 'summary' && (
                        <div className="glass-card p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="data-table text-sm">
                                    <thead>
                                        <tr>
                                            <th>{isRTL ? (type === 'receivable' ? 'العميل' : 'المورد') : (type === 'receivable' ? 'Customer' : 'Supplier')}</th>
                                            <th className="text-end">{isRTL ? 'فواتير' : 'Invoices'}</th>
                                            {Object.entries(BUCKET_LABELS).map(([k, l]) => (
                                                <th key={k} className="text-end" style={{ color: l.color }}>{isRTL ? l.ar : l.en}</th>
                                            ))}
                                            <th className="text-end font-bold">{isRTL ? 'الإجمالي' : 'Total'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSummary.map((r: any, i: number) => (
                                            <tr key={i}>
                                                <td className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {r.customer_name || r.supplier_name}
                                                </td>
                                                <td className="text-end text-xs" style={{ color: 'var(--text-muted)' }}>{r.invoices}</td>
                                                {Object.keys(BUCKET_LABELS).map(k => (
                                                    <td key={k} className="text-end text-xs" style={{ color: (r[k] || 0) > 0 ? BUCKET_LABELS[k].color : 'var(--text-muted)' }}>
                                                        {(r[k] || 0) > 0 ? fmt(r[k]) : '—'}
                                                    </td>
                                                ))}
                                                <td className="text-end font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(r.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredSummary.length === 0 && (
                                    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'لا توجد بيانات' : 'No data'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Detail table */}
                    {view === 'detail' && (
                        <div className="glass-card p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="data-table text-sm">
                                    <thead>
                                        <tr>
                                            <th>{isRTL ? 'رقم الفاتورة' : 'Invoice #'}</th>
                                            <th>{isRTL ? (type === 'receivable' ? 'العميل' : 'المورد') : (type === 'receivable' ? 'Customer' : 'Supplier')}</th>
                                            <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                            <th>{isRTL ? 'الاستحقاق' : 'Due'}</th>
                                            <th className="text-end">{isRTL ? 'أيام التأخر' : 'Days Late'}</th>
                                            <th className="text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
                                            <th className="text-end">{isRTL ? 'المدفوع' : 'Paid'}</th>
                                            <th className="text-end">{isRTL ? 'المتبقي' : 'Outstanding'}</th>
                                            <th>{isRTL ? 'التصنيف' : 'Bucket'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDetail.map((r: any, i: number) => {
                                            const bkt = BUCKET_LABELS[r.bucket];
                                            return (
                                                <tr key={i}>
                                                    <td className="font-mono text-xs">{r.invoice_number || r.purchase_number}</td>
                                                    <td style={{ color: 'var(--text-primary)' }}>{r.customer_name || r.supplier_name}</td>
                                                    <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.invoice_date || r.purchase_date}</td>
                                                    <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.due_date || '—'}</td>
                                                    <td className="text-end">
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full`}
                                                            style={{ background: `${bkt?.color}20`, color: bkt?.color }}>
                                                            {r.days_overdue}
                                                        </span>
                                                    </td>
                                                    <td className="text-end text-xs" style={{ color: 'var(--text-secondary)' }}>{fmt(r.total)}</td>
                                                    <td className="text-end text-xs text-green-400">{fmt(r.paid)}</td>
                                                    <td className="text-end font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(r.outstanding)}</td>
                                                    <td>
                                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${bkt?.color}20`, color: bkt?.color }}>
                                                            {isRTL ? bkt?.ar : bkt?.en}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {filteredDetail.length === 0 && (
                                    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'لا توجد بيانات' : 'No data'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
