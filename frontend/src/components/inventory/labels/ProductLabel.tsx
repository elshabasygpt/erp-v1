'use client';

/*
 * Single source of truth for product barcode labels.
 *
 * Used by BOTH the per-product print modal (PrintBarcodeModal) and the bulk
 * Labels page so the appearance and print mechanism stay consistent. Barcodes
 * are rendered with react-barcode (real, scannable CODE128) / qrcode.react.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

export type LabelSize = '50x30' | '50x25' | '40x30' | '40x20' | '38x25' | 'A4';

export interface LabelOptions {
    type: '1D' | 'QR';
    size: LabelSize;
    showCompany: boolean;
    showName: boolean;
    showBarcode: boolean; // the bars / QR itself
    showValue: boolean;   // human-readable code under the barcode
    showSku: boolean;     // separate "SKU: …" line
    showPrice: boolean;
}

export const DEFAULT_LABEL_OPTIONS: LabelOptions = {
    type: '1D',
    size: '50x30',
    showCompany: false,
    showName: true,
    showBarcode: true,
    showValue: true,
    showSku: false,
    showPrice: true,
};

/** Normalised product shape so both screens can feed the same component. */
export interface LabelProduct {
    name: string;
    nameAr?: string;
    sku?: string | null;
    barcode?: string | null;
    price?: number;
}

interface SizeSpec { w: number; h: number; a4?: boolean; barWidth: number; barHeight: number; qr: number; nameFs: number; priceFs: number; metaFs: number; }

export const SIZE_SPECS: Record<LabelSize, SizeSpec> = {
    '50x30': { w: 50, h: 30, barWidth: 1.4, barHeight: 36, qr: 68, nameFs: 9, priceFs: 11, metaFs: 7 },
    '50x25': { w: 50, h: 25, barWidth: 1.4, barHeight: 28, qr: 58, nameFs: 9, priceFs: 10, metaFs: 7 },
    '40x30': { w: 40, h: 30, barWidth: 1.0, barHeight: 34, qr: 62, nameFs: 8, priceFs: 10, metaFs: 6.5 },
    '40x20': { w: 40, h: 20, barWidth: 1.0, barHeight: 22, qr: 46, nameFs: 7.5, priceFs: 9, metaFs: 6 },
    '38x25': { w: 38, h: 25, barWidth: 1.0, barHeight: 28, qr: 54, nameFs: 8, priceFs: 9.5, metaFs: 6.5 },
    'A4':    { w: 50, h: 30, a4: true, barWidth: 1.4, barHeight: 36, qr: 68, nameFs: 9, priceFs: 11, metaFs: 7 },
};

export const LABEL_SIZE_OPTIONS: { value: LabelSize; label: string }[] = [
    { value: '50x30', label: '50 × 30 مم' },
    { value: '50x25', label: '50 × 25 مم' },
    { value: '40x30', label: '40 × 30 مم' },
    { value: '40x20', label: '40 × 20 مم' },
    { value: '38x25', label: '38 × 25 مم' },
    { value: 'A4', label: 'A4 (ورق عادي)' },
];

/** The value encoded into the barcode. Prefer barcode, fall back to SKU. */
export const labelCode = (p: LabelProduct): string => (p.barcode || p.sku || '').trim();

/** A single label, rendered identically for preview and for printing. */
export function ProductLabel({
    product, options, companyName, currency, isRTL = true, preview = false,
}: {
    product: LabelProduct;
    options: LabelOptions;
    companyName?: string;
    currency?: string;
    isRTL?: boolean;
    preview?: boolean;
}) {
    const spec = SIZE_SPECS[options.size];
    const code = labelCode(product);
    const name = isRTL ? (product.nameAr || product.name) : product.name;

    return (
        <div className="label-cell" style={{
            width: `${spec.w}mm`, height: `${spec.h}mm`,
            border: preview ? '1px solid var(--border-default, #ccc)' : '1px solid #ccc',
            borderRadius: 3, padding: '1.5mm', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', background: '#fff', color: '#000',
            fontFamily: "'Cairo', system-ui, sans-serif",
        }}>
            {options.showCompany && companyName ? (
                <div style={{ fontSize: `${spec.metaFs}pt`, color: '#555', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{companyName}</div>
            ) : null}

            {options.showName ? (
                <div style={{ fontSize: `${spec.nameFs}pt`, fontWeight: 600, textAlign: 'center', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>{name}</div>
            ) : null}

            {options.showBarcode && code ? (
                options.type === 'QR'
                    ? <QRCodeSVG value={code} size={spec.qr} />
                    : <Barcode value={code} format="CODE128" width={spec.barWidth} height={spec.barHeight}
                        displayValue={options.showValue} fontSize={9} margin={0} background="#ffffff" lineColor="#000000" />
            ) : null}

            {options.showBarcode && options.type === 'QR' && options.showValue && code ? (
                <div style={{ fontFamily: 'monospace', fontSize: `${spec.metaFs}pt`, marginTop: 1 }}>{code}</div>
            ) : null}

            {options.showSku && product.sku ? (
                <div style={{ fontFamily: 'monospace', fontSize: `${spec.metaFs}pt`, color: '#444' }}>SKU: {product.sku}</div>
            ) : null}

            {options.showPrice && typeof product.price === 'number' ? (
                <div style={{ fontSize: `${spec.priceFs}pt`, fontWeight: 700, marginTop: 1 }}>{product.price.toFixed(2)} {currency || ''}</div>
            ) : null}
        </div>
    );
}

/** Hidden, print-only sheet of labels + the @page / visibility rules. */
export function LabelPrintSheet({
    queue, options, companyName, currency, isRTL = true,
}: {
    queue: { product: LabelProduct; qty: number }[] | null;
    options: LabelOptions;
    companyName?: string;
    currency?: string;
    isRTL?: boolean;
}) {
    const spec = SIZE_SPECS[options.size];
    const pageRule = spec.a4
        ? '@page { size: A4; margin: 8mm; }'
        : `@page { size: ${spec.w}mm ${spec.h}mm; margin: 0; }`;
    const cellBreak = spec.a4 ? '' : '.label-print-sheet .label-cell { page-break-after: always; }';

    return (
        <>
            <div className="label-print-sheet" aria-hidden>
                {(queue ?? []).flatMap(({ product, qty }, qi) =>
                    Array.from({ length: qty }).map((_, i) => (
                        <ProductLabel key={`${qi}-${i}`} product={product} options={options}
                            companyName={companyName} currency={currency} isRTL={isRTL} />
                    ))
                )}
            </div>
            <style>{`
                .label-print-sheet { display: none; }
                @media print {
                    body * { visibility: hidden !important; }
                    .label-print-sheet, .label-print-sheet * { visibility: visible !important; }
                    .label-print-sheet {
                        display: flex !important;
                        flex-wrap: wrap;
                        align-content: flex-start;
                        gap: ${spec.a4 ? '2mm' : '0'};
                        position: absolute;
                        left: 0; top: 0;
                        width: 100%;
                        background: #fff;
                    }
                    ${cellBreak}
                    ${pageRule}
                }
            `}</style>
        </>
    );
}

/**
 * Queues labels and fires window.print() once they've rendered, then clears.
 * Returns { print, queue } — render <LabelPrintSheet queue={queue} ... />.
 */
export function usePrintLabels() {
    const [queue, setQueue] = useState<{ product: LabelProduct; qty: number }[] | null>(null);

    useEffect(() => {
        if (!queue || queue.length === 0) return;
        const t = setTimeout(() => { window.print(); setQueue(null); }, 200);
        return () => clearTimeout(t);
    }, [queue]);

    const print = useCallback((items: { product: LabelProduct; qty: number }[]): { ok: boolean; skipped: number } => {
        const valid = items.filter(it => labelCode(it.product) !== '' && it.qty > 0);
        const skipped = items.length - valid.length;
        if (valid.length === 0) return { ok: false, skipped };
        setQueue(valid);
        return { ok: true, skipped };
    }, []);

    return { print, queue };
}
