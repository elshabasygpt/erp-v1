'use client';

import { useEffect, useRef, useState } from 'react';
import { generateZatcaQRDataURI } from '@/lib/zatca-qr';
import { useRegionalSettings } from '@/providers/RegionalSettingsProvider';

interface InvoiceItem {
    code: string;
    name: string;
    binLocation?: string;
    qty: number;
    unit: string;
    price?: number;
    unit_price?: number;
    vatRate: number;
}

interface InvoiceData {
    id: string;
    uuid: string;
    type: 'tax_invoice' | 'simplified' | 'credit_note' | 'debit_note';
    date: string;
    time: string;
    dueDate?: string;
    seller: {
        name: string;
        vatNumber: string;
        crNumber: string;
        address: string;
        city: string;
        phone: string;
    };
    buyer?: {
        name: string;
        vatNumber?: string;
        crNumber?: string;
        address?: string;
    };
    items: InvoiceItem[];
    notes?: string;
    paymentType: 'cash' | 'credit' | 'visa';
}

interface InvoicePrintTemplateProps {
    invoice: InvoiceData;
    locale: string;
    onClose: () => void;
}

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
    tax_invoice: { ar: 'فاتورة ضريبية', en: 'Tax Invoice' },
    simplified: { ar: 'فاتورة مبسطة', en: 'Simplified Invoice' },
    credit_note: { ar: 'إشعار دائن', en: 'Credit Note' },
    debit_note: { ar: 'إشعار مدين', en: 'Debit Note' },
};

const PAYMENT_LABELS: Record<string, { ar: string; en: string }> = {
    cash: { ar: 'نقدي', en: 'Cash' },
    credit: { ar: 'آجل', en: 'Credit' },
    visa: { ar: 'فيزا / بطاقة', en: 'Card' },
};

export default function InvoicePrintTemplate({ invoice, locale, onClose }: InvoicePrintTemplateProps) {
    const isRTL = locale === 'ar';
    const printRef = useRef<HTMLDivElement>(null);
    const { country, taxRate, formatAmount } = useRegionalSettings();

    const [settings, setSettings] = useState({
        invoice_default_size: 'A4',
        invoice_show_logo: true,
        invoice_show_buyer: true,
        invoice_show_qr: true,
        invoice_footer_text: '',
    });

    useEffect(() => {
        const { settingsApi } = require('@/lib/api');
        settingsApi.getSettings().then((res: any) => {
            const data = res.data?.data || res.data || {};
            if (data.invoice_settings) {
                try {
                    const parsed = JSON.parse(data.invoice_settings);
                    setSettings({
                        invoice_default_size: parsed.invoice_default_size || 'A4',
                        invoice_show_logo: parsed.invoice_show_logo ?? true,
                        invoice_show_buyer: parsed.invoice_show_buyer ?? true,
                        invoice_show_qr: parsed.invoice_show_qr ?? true,
                        invoice_footer_text: parsed.invoice_footer_text || '',
                    });
                } catch(e) {}
            }
        }).catch(() => {});
    }, []);

    // Calculate totals
    const lines = invoice.items.map((item) => {
        const price = item.price ?? item.unit_price ?? 0;
        const exclVat = item.qty * price;
        const vat = exclVat * item.vatRate;
        return { ...item, price, exclVat, vat, inclVat: exclVat + vat };
    });
    const subtotalExcl = lines.reduce((s, l) => s + l.exclVat, 0);
    const totalVat = lines.reduce((s, l) => s + l.vat, 0);
    const grandTotal = subtotalExcl + totalVat;

    // Generate ZATCA QR — Saudi Arabia only
    const qrDataURI = country === 'SA' && invoice.seller.vatNumber ? generateZatcaQRDataURI({
        sellerName: invoice.seller.name,
        vatNumber: invoice.seller.vatNumber,
        invoiceTimestamp: `${invoice.date}T${invoice.time}`,
        totalWithVat: grandTotal,
        vatAmount: totalVat,
    }) : null;

    const handlePrint = () => window.print();

    const typeLabel = TYPE_LABELS[invoice.type]?.[isRTL ? 'ar' : 'en'] || invoice.type;
    const payLabel = PAYMENT_LABELS[invoice.paymentType]?.[isRTL ? 'ar' : 'en'] || invoice.paymentType;

    const isThermal = settings.invoice_default_size === '80mm';

    return (
        <>
            {/* Print CSS */}
            <style>{`
                @media print {
                    body > * { display: none !important; }
                    #zatca-print-root { display: block !important; }
                    #zatca-print-actions { display: none !important; }
                    ${isThermal ? `
                        @page { size: 80mm auto; margin: 0; }
                        body { margin: 0; padding: 0; }
                    ` : `
                        @page { size: A4; margin: 10mm; }
                    `}
                }
                #zatca-print-root { font-family: 'Arial', sans-serif; direction: ${isRTL ? 'rtl' : 'ltr'}; }
            `}</style>

            {/* Overlay */}
            <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
            >
                <div className="w-full max-w-3xl" style={{ maxHeight: '95vh', overflowY: 'auto' }}>
                    {/* Controls */}
                    <div id="zatca-print-actions" className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-white font-bold text-lg">
                            {isRTL ? 'معاينة الفاتورة' : 'Invoice Preview'}
                        </h2>
                        <div className="flex gap-3">
                            <button
                                onClick={handlePrint}
                                className="btn-primary flex items-center gap-2"
                            >
                                🖨 {isRTL ? 'طباعة' : 'Print'}
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-sm font-medium"
                                style={{ background: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' }}
                            >
                                ✕ {isRTL ? 'إغلاق' : 'Close'}
                            </button>
                        </div>
                    </div>

                    {/* Invoice Wrapper */}
                    <div
                        id="zatca-print-root"
                        ref={printRef}
                        style={{
                            background: '#fff',
                            color: '#000',
                            padding: isThermal ? '10px' : '32px',
                            margin: '0 auto',
                            borderRadius: isThermal ? '0' : '12px',
                            width: isThermal ? '80mm' : 'auto',
                            direction: isRTL ? 'rtl' : 'ltr',
                            fontFamily: isThermal ? 'monospace, Arial, sans-serif' : 'Arial, sans-serif',
                            fontSize: isThermal ? '12px' : '14px',
                            boxSizing: 'border-box'
                        }}
                    >
                        {isThermal ? (
                            // ── THERMAL 80mm LAYOUT ──
                            <div style={{ textAlign: 'center' }}>
                                {settings.invoice_show_logo && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 20 }}>
                                            $
                                        </div>
                                    </div>
                                )}
                                <h2 style={{ fontWeight: 700, fontSize: 16, margin: '0 0 5px 0' }}>{invoice.seller.name}</h2>
                                <div style={{ fontSize: 11, marginBottom: '10px', borderBottom: '1px dashed #000', paddingBottom: '10px' }}>
                                    <div>{isRTL ? 'الرقم الضريبي: ' : 'VAT: '}{invoice.seller.vatNumber}</div>
                                    <div>{isRTL ? 'السجل التجاري: ' : 'CR: '}{invoice.seller.crNumber}</div>
                                    <div>{invoice.seller.address}</div>
                                    <div>{isRTL ? 'هاتف: ' : 'Tel: '}{invoice.seller.phone}</div>
                                </div>
                                
                                <div style={{ fontSize: 11, textAlign: isRTL ? 'right' : 'left', marginBottom: '10px', borderBottom: '1px dashed #000', paddingBottom: '10px' }}>
                                    <div style={{ fontWeight: 'bold', textAlign: 'center', fontSize: 13, marginBottom: 5 }}>{typeLabel}</div>
                                    <div>{isRTL ? 'رقم الفاتورة: ' : 'Inv #: '}{invoice.id}</div>
                                    <div>{isRTL ? 'التاريخ: ' : 'Date: '}{invoice.date} {invoice.time}</div>
                                    <div>{isRTL ? 'الدفع: ' : 'Pay: '}{payLabel}</div>
                                </div>

                                {settings.invoice_show_buyer && invoice.buyer && (
                                    <div style={{ fontSize: 11, textAlign: isRTL ? 'right' : 'left', marginBottom: '10px', borderBottom: '1px dashed #000', paddingBottom: '10px' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{isRTL ? 'بيانات المشتري:' : 'Buyer:'}</div>
                                        <div>{invoice.buyer.name}</div>
                                        {invoice.buyer.vatNumber && <div>{isRTL ? 'الرقم الضريبي: ' : 'VAT: '}{invoice.buyer.vatNumber}</div>}
                                    </div>
                                )}

                                <div className="overflow-x-auto"><table style={{ width: '100%', fontSize: 11, marginBottom: '10px', borderBottom: '1px dashed #000', paddingBottom: '5px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px dashed #000' }}>
                                            <th style={{ textAlign: isRTL ? 'right' : 'left', paddingBottom: 4 }}>{isRTL ? 'الصنف' : 'Item'}</th>
                                            <th style={{ textAlign: 'center', paddingBottom: 4 }}>{isRTL ? 'الكمية' : 'Qty'}</th>
                                            <th style={{ textAlign: isRTL ? 'left' : 'right', paddingBottom: 4 }}>{isRTL ? 'المجموع' : 'Total'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((line, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: '4px 0', textAlign: isRTL ? 'right' : 'left' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{line.name}</div>
                                                    <div style={{ fontSize: 9 }}>
                                                        {formatAmount(line.price)}
                                                        {line.binLocation && (
                                                            <span style={{ display: 'inline-block', padding: '0 4px', margin: '0 4px', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                                                                {isRTL ? 'الرف: ' : 'Bin: '}{line.binLocation}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '4px 0', textAlign: 'center' }}>{line.qty}</td>
                                                <td style={{ padding: '4px 0', textAlign: isRTL ? 'left' : 'right', fontWeight: 'bold' }}>{formatAmount(line.inclVat)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table></div>

                                <div style={{ fontSize: 11, textAlign: 'right', marginBottom: '10px', borderBottom: '1px dashed #000', paddingBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{isRTL ? 'المجموع قبل الضريبة' : 'Subtotal'}</span>
                                        <span>{formatAmount(subtotalExcl)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{isRTL ? `الضريبة (${taxRate}%)` : `VAT (${taxRate}%)`}</span>
                                        <span>{formatAmount(totalVat)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>
                                        <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                                        <span>{formatAmount(grandTotal)}</span>
                                    </div>
                                </div>

                                {settings.invoice_show_qr && qrDataURI && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                                        <img src={qrDataURI} alt="ZATCA QR" style={{ width: 100, height: 100 }} />
                                    </div>
                                )}

                                {settings.invoice_footer_text && (
                                    <div style={{ fontSize: 10, marginTop: 10, textAlign: 'center', whiteSpace: 'pre-line' }}>
                                        {settings.invoice_footer_text}
                                    </div>
                                )}
                                <div style={{ fontSize: 9, marginTop: 5, textAlign: 'center' }}>
                                    {isRTL ? 'شكراً لتعاملكم معنا' : 'Thank you!'}
                                </div>
                            </div>
                        ) : (
                            // ── A4 LAYOUT ──
                            <div>
                                {/* ── Top: Logo + Invoice Title ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #10b981' }}>
                            <div>
                                {settings.invoice_show_logo && (
                                    <div style={{ width: 56, height: 56, borderRadius: 12, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 24 }}>$</span>
                                    </div>
                                )}
                                <h2 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>{invoice.seller.name}</h2>
                                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0' }}>{isRTL ? 'الرقم الضريبي: ' : 'VAT: '}{invoice.seller.vatNumber}</p>
                                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0' }}>{isRTL ? 'السجل التجاري: ' : 'CR: '}{invoice.seller.crNumber}</p>
                                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0' }}>{invoice.seller.address}، {invoice.seller.city}</p>
                                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0' }}>{isRTL ? 'هاتف: ' : 'Tel: '}{invoice.seller.phone}</p>
                            </div>
                            <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
                                <div style={{ display: 'inline-block', background: '#10b981', color: '#fff', padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
                                    {typeLabel}
                                </div>
                                <div className="overflow-x-auto"><table style={{ fontSize: 13 }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ color: '#64748b', paddingInlineEnd: 12 }}>{isRTL ? 'رقم الفاتورة:' : 'Invoice #:'}</td>
                                            <td style={{ fontWeight: 700, color: '#10b981' }}>{invoice.id}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ color: '#64748b' }}>{isRTL ? 'التاريخ:' : 'Date:'}</td>
                                            <td style={{ fontWeight: 600 }}>{invoice.date}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ color: '#64748b' }}>{isRTL ? 'الوقت:' : 'Time:'}</td>
                                            <td>{invoice.time}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ color: '#64748b' }}>{isRTL ? 'الدفع:' : 'Payment:'}</td>
                                            <td>{payLabel}</td>
                                        </tr>
                                        {invoice.dueDate && (
                                            <tr>
                                                <td style={{ color: '#64748b' }}>{isRTL ? 'الاستحقاق:' : 'Due:'}</td>
                                                <td style={{ color: '#ef4444', fontWeight: 600 }}>{invoice.dueDate}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table></div>
                            </div>
                        </div>

                        {/* ── Buyer Info (B2B) ── */}
                        {settings.invoice_show_buyer && invoice.buyer && (
                            <div style={{ marginBottom: 20, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <p style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{isRTL ? 'بيانات المشتري' : 'Buyer Information'}</p>
                                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', fontSize: 12 }}>
                                    <div>
                                        <span style={{ color: '#64748b' }}>{isRTL ? 'الاسم: ' : 'Name: '}</span>
                                        <span style={{ fontWeight: 600 }}>{invoice.buyer.name}</span>
                                    </div>
                                    {invoice.buyer.vatNumber && (
                                        <div>
                                            <span style={{ color: '#64748b' }}>{isRTL ? 'الرقم الضريبي: ' : 'VAT #: '}</span>
                                            <span style={{ fontWeight: 600 }}>{invoice.buyer.vatNumber}</span>
                                        </div>
                                    )}
                                    {invoice.buyer.crNumber && (
                                        <div>
                                            <span style={{ color: '#64748b' }}>{isRTL ? 'السجل التجاري: ' : 'CR #: '}</span>
                                            <span style={{ fontWeight: 600 }}>{invoice.buyer.crNumber}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Items Table ── */}
                        <div className="overflow-x-auto"><table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#10b981', color: '#fff' }}>
                                    <th style={{ padding: '8px 10px', textAlign: isRTL ? 'right' : 'left' }}>#</th>
                                    <th style={{ padding: '8px 10px', textAlign: isRTL ? 'right' : 'left' }}>{isRTL ? 'الصنف' : 'Item'}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>{isRTL ? 'الكمية' : 'Qty'}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>{isRTL ? 'الوحدة' : 'Unit'}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>{isRTL ? 'السعر' : 'Price'}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>{isRTL ? 'الضريبة' : 'VAT'}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>{isRTL ? 'الإجمالي' : 'Total'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{i + 1}</td>
                                        <td style={{ padding: '7px 10px' }}>
                                            <span style={{ fontWeight: 600 }}>{line.name}</span>
                                            <span style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>
                                                {line.code}
                                                {line.binLocation && (
                                                    <span style={{ display: 'inline-block', padding: '1px 4px', margin: '0 4px', background: '#e2e8f0', color: '#475569', borderRadius: '4px' }}>
                                                        {isRTL ? 'الرف: ' : 'Bin: '}{line.binLocation}
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>{line.qty}</td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>{line.unit}</td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>{formatAmount(line.price)}</td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center', color: '#7c3aed' }}>{formatAmount(line.vat)}</td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700 }}>{formatAmount(line.inclVat)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div>

                        {/* ── Totals + QR ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
                            {/* QR Code */}
                            <div style={{ textAlign: 'center' }}>
                                {settings.invoice_show_qr && (
                                    qrDataURI ? (
                                        <img src={qrDataURI} alt="ZATCA QR" style={{ width: 110, height: 110, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                                    ) : (
                                        <div style={{ width: 110, height: 110, border: '2px dashed #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11 }}>
                                            QR Code
                                        </div>
                                    )
                                )}
                                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                                    {isRTL ? 'امسح للتحقق' : 'Scan to verify'}
                                </p>
                                <p style={{ fontSize: 9, color: '#cbd5e1', marginTop: 2 }}>{invoice.uuid.substring(0, 8)}...</p>
                            </div>

                            {/* Summary */}
                            <div style={{ minWidth: 260 }}>
                                <div className="overflow-x-auto"><table style={{ width: '100%', fontSize: 13 }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ color: '#64748b', padding: '4px 0' }}>{isRTL ? 'المجموع قبل الضريبة' : 'Subtotal (excl. VAT)'}</td>
                                            <td style={{ textAlign: 'end', fontWeight: 600 }}>{formatAmount(subtotalExcl)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ color: '#7c3aed', padding: '4px 0' }}>{isRTL ? `ضريبة القيمة المضافة (${taxRate}%)` : `VAT (${taxRate}%)`}</td>
                                            <td style={{ textAlign: 'end', color: '#7c3aed', fontWeight: 600 }}>{formatAmount(totalVat)}</td>
                                        </tr>
                                        <tr style={{ borderTop: '2px solid #10b981' }}>
                                            <td style={{ fontWeight: 700, fontSize: 15, padding: '8px 0 0' }}>{isRTL ? 'الإجمالي شامل الضريبة' : 'Total (incl. VAT)'}</td>
                                            <td style={{ textAlign: 'end', fontWeight: 800, fontSize: 18, color: '#10b981', padding: '8px 0 0' }}>{formatAmount(grandTotal)}</td>
                                        </tr>
                                    </tbody>
                                </table></div>
                            </div>
                        </div>

                        {/* ── Notes ── */}
                        {invoice.notes && (
                            <div style={{ marginTop: 20, padding: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                                <span style={{ fontWeight: 600, fontSize: 12 }}>{isRTL ? 'ملاحظات: ' : 'Notes: '}</span>
                                <span style={{ fontSize: 12, color: '#64748b' }}>{invoice.notes}</span>
                            </div>
                        )}

                        {/* ── Footer ── */}
                        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                            <span>{settings.invoice_footer_text || (isRTL ? 'شكراً لتعاملكم معنا' : 'Thank you for your business')}</span>
                            <span>{isRTL ? 'هذه فاتورة إلكترونية معتمدة' : 'This is a ZATCA Phase 1 compliant e-invoice'}</span>
                        </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// Default mock invoice for demo
export const DEMO_INVOICE: InvoiceData = {
    id: 'INV-2024-0001',
    uuid: crypto.randomUUID ? crypto.randomUUID() : '550e8400-e29b-41d4-a716',
    type: 'tax_invoice',
    date: '2024-03-01',
    time: '14:30:00',
    dueDate: '2024-04-01',
    seller: {
        name: 'شركتي التجارية',
        vatNumber: '300000000000003',
        crNumber: '1010000000',
        address: '1234 شارع الملك فهد، حي العليا',
        city: 'الرياض',
        phone: '+966 11 000 0000',
    },
    buyer: {
        name: 'شركة العميل',
        vatNumber: '300111111111113',
        crNumber: '1010111111',
    },
    items: [
        { code: 'ELC-001', name: 'شاشة سامسونج 55"', qty: 2, unit: 'قطعة', price: 1500, vatRate: 0.15 },
        { code: 'ELC-002', name: 'آيفون 15 برو', qty: 1, unit: 'قطعة', price: 4000, vatRate: 0.15 },
        { code: 'OFC-001', name: 'كرسي مكتب', qty: 4, unit: 'قطعة', price: 350, vatRate: 0.15 },
    ],
    notes: 'شكراً لثقتكم بنا',
    paymentType: 'credit',
};
