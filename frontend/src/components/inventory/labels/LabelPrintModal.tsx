'use client';

/*
 * Reusable barcode-label print modal driven by a list of { product, qty }.
 * Works for a single product (per-line print) and for many products at once
 * (e.g. "print all items of a purchase invoice"). Shares the same label
 * rendering, options and print mechanism as the rest of the app.
 */

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRegionalSettings } from '@/providers/RegionalSettingsProvider';
import {
    ProductLabel, LabelPrintSheet, usePrintLabels, labelCode,
    type LabelOptions, type LabelProduct, DEFAULT_LABEL_OPTIONS, LABEL_SIZE_OPTIONS,
} from './ProductLabel';

export interface LabelItem { product: LabelProduct; qty: number; }

export function LabelPrintModal({
    items, onClose, isRTL = true, title,
}: {
    items: LabelItem[];
    onClose: () => void;
    isRTL?: boolean;
    title?: string;
}) {
    const { currencySymbol } = useRegionalSettings();
    const [options, setOptions] = useState<LabelOptions>(DEFAULT_LABEL_OPTIONS);
    const [companyName, setCompanyName] = useState('');
    const [rows, setRows] = useState<LabelItem[]>(items.map(it => ({ ...it })));
    const { print, queue } = usePrintLabels();

    useEffect(() => { setRows(items.map(it => ({ ...it }))); }, [items]);

    // Seed defaults from the saved global barcode settings.
    useEffect(() => {
        const { settingsApi } = require('@/lib/api');
        settingsApi.getSettings().then((res: any) => {
            const data = res.data?.data || res.data || {};
            setCompanyName(data.company_name || '');
            try {
                const s = data.barcode_settings ? JSON.parse(data.barcode_settings) : {};
                setOptions(o => ({
                    ...o,
                    type: s.barcode_default_type || o.type,
                    size: s.barcode_default_size || o.size,
                    showCompany: s.barcode_show_company ?? o.showCompany,
                    showPrice: s.barcode_show_price ?? o.showPrice,
                    showSku: s.barcode_show_sku ?? o.showSku,
                    showName: s.barcode_show_name ?? o.showName,
                    showValue: s.barcode_show_value ?? o.showValue,
                }));
            } catch { /* ignore */ }
        }).catch(() => {});
    }, []);

    const setQty = (idx: number, qty: number) => setRows(rs => rs.map((r, i) => i === idx ? { ...r, qty: Math.max(1, qty || 1) } : r));

    const printable = rows.filter(r => labelCode(r.product) !== '' && r.qty > 0);
    const skipped = rows.length - printable.length;
    const totalLabels = printable.reduce((s, r) => s + r.qty, 0);
    const previewProduct = printable[0]?.product ?? rows[0]?.product;
    const single = rows.length === 1;

    const handlePrint = () => {
        const res = print(printable.map(r => ({ product: r.product, qty: r.qty })));
        if (!res.ok) { toast.error(isRTL ? 'لا يوجد باركود/SKU لأي صنف' : 'No barcode/SKU on any item'); return; }
        if (res.skipped > 0) toast(isRTL ? `تم تجاهل ${res.skipped} صنف بدون باركود/SKU` : `Skipped ${res.skipped} item(s) without a code`, { icon: '⚠️' });
    };

    const Toggle = ({ k, label }: { k: keyof LabelOptions; label: string }) => (
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={options[k] as boolean} onChange={e => setOptions(o => ({ ...o, [k]: e.target.checked }))} />
            {label}
        </label>
    );

    return (
        <>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="bg-white dark:bg-[#111118] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 max-h-[90vh] flex flex-col">
                    <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="flex items-center gap-2"><span className="text-xl">🏷️</span>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title || (isRTL ? 'طباعة الباركود' : 'Print Barcode')}</h2>
                        </div>
                        <button onClick={onClose} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>

                    <div className="p-5 space-y-4 overflow-y-auto">
                        {/* Live preview */}
                        <div className="glass-card p-6 flex justify-center">
                            {previewProduct
                                ? <ProductLabel product={previewProduct} options={options} companyName={companyName} currency={currencySymbol} isRTL={isRTL} preview />
                                : <span className="text-xs text-slate-400">{isRTL ? 'لا يوجد صنف قابل للطباعة' : 'No printable item'}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'نوع الباركود' : 'Barcode Type'}</label>
                                <select className="select-field py-2 text-sm w-full" value={options.type} onChange={e => setOptions(o => ({ ...o, type: e.target.value as LabelOptions['type'] }))}>
                                    <option value="1D">1D (Code 128)</option>
                                    <option value="QR">2D (QR Code)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'مقاس الملصق' : 'Label Size'}</label>
                                <select className="select-field py-2 text-sm w-full" value={options.size} onChange={e => setOptions(o => ({ ...o, size: e.target.value as LabelOptions['size'] }))}>
                                    {LABEL_SIZE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
                            <Toggle k="showName" label={isRTL ? 'الاسم' : 'Name'} />
                            <Toggle k="showBarcode" label={isRTL ? 'الباركود' : 'Barcode'} />
                            <Toggle k="showValue" label={isRTL ? 'الرقم' : 'Number'} />
                            <Toggle k="showSku" label="SKU" />
                            <Toggle k="showPrice" label={isRTL ? 'السعر' : 'Price'} />
                            <Toggle k="showCompany" label={isRTL ? 'الشركة' : 'Company'} />
                        </div>

                        {/* Item list with editable copies */}
                        <div className="border-t pt-4 space-y-2" style={{ borderColor: 'var(--border-default)' }}>
                            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                {single ? (isRTL ? 'عدد النسخ' : 'Copies') : (isRTL ? `الأصناف (${rows.length})` : `Items (${rows.length})`)}
                            </p>
                            <div className="space-y-1.5 max-h-44 overflow-y-auto">
                                {rows.map((r, idx) => {
                                    const noCode = labelCode(r.product) === '';
                                    return (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            <span className="flex-1 truncate" style={{ color: noCode ? '#d97706' : 'var(--text-primary)' }}>
                                                {noCode ? '⚠️ ' : ''}{r.product.name}
                                            </span>
                                            <input type="number" min={1} max={500} value={r.qty} disabled={noCode}
                                                onChange={e => setQty(idx, parseInt(e.target.value) || 1)}
                                                className="input-field py-1 w-20 text-center text-sm disabled:opacity-40" />
                                        </div>
                                    );
                                })}
                            </div>
                            {skipped > 0 && (
                                <p className="text-[11px] text-amber-600">{isRTL ? `سيتم تجاهل ${skipped} صنف بدون باركود/SKU` : `${skipped} item(s) without a code will be skipped`}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 p-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{isRTL ? `الإجمالي: ${totalLabels} ملصق` : `Total: ${totalLabels} labels`}</span>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="btn-secondary">{isRTL ? 'إغلاق' : 'Close'}</button>
                            <button onClick={handlePrint} disabled={printable.length === 0} className="btn-primary flex items-center gap-2 disabled:opacity-50">🖨️ {isRTL ? 'طباعة' : 'Print'}</button>
                        </div>
                    </div>
                </div>
            </div>
            <LabelPrintSheet queue={queue} options={options} companyName={companyName} currency={currencySymbol} isRTL={isRTL} />
        </>
    );
}
