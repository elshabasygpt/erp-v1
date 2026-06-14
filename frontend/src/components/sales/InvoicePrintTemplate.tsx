'use client';

import { useEffect, useRef } from 'react';
import { generateZatcaQRDataURI, formatSAR } from '@/lib/zatca-qr';

interface InvoiceItem {
    code: string;
    name: string;
    qty: number;
    unit: string;
    price: number;
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

    // Calculate totals
    const lines = invoice.items.map((item) => {
        const exclVat = item.qty * item.price;
        const vat = exclVat * item.vatRate;
        return { ...item, exclVat, vat, inclVat: exclVat + vat };
    });
    const subtotalExcl = lines.reduce((s, l) => s + l.exclVat, 0);
    const totalVat = lines.reduce((s, l) => s + l.vat, 0);
    const grandTotal = subtotalExcl + totalVat;

    // Generate QR
    const qrDataURI = generateZatcaQRDataURI({
        sellerName: invoice.seller.name,
        vatNumber: invoice.seller.vatNumber,
        invoiceTimestamp: `${invoice.date}T${invoice.time}`,
        totalWithVat: grandTotal,
        vatAmount: totalVat,
    });

    const handlePrint = () => window.print();

    const typeLabel = TYPE_LABELS[invoice.type]?.[isRTL ? 'ar' : 'en'] || invoice.type;
    const payLabel = PAYMENT_LABELS[invoice.paymentType]?.[isRTL ? 'ar' : 'en'] || invoice.paymentType;

    return (
        <>
            {/* Print CSS */}
            <style>{`
                @media print {
                    body > * { display: none !important; }
                    #zatca-print-root { display: block !important; }
                    #zatca-print-actions { display: none !important; }
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

                    {/* A4 Invoice */}
                    <div
                        id="zatca-print-root"
                        ref={printRef}
                        style={{
                            background: '#fff',
                            color: '#111',
                            padding: '32px',
                            borderRadius: '12px',
                            direction: isRTL ? 'rtl' : 'ltr',
                            fontFamily: 'Arial, sans-serif',
                        }}
                    >
                        {/* ── Top: Logo + Invoice Title ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #4f46e5' }}>
                            <div>
                                <div style={{ width: 56, height: 56, borderRadius: 12, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 24 }}>$</span>
                                </div>
                                <h2 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>{invoice.seller.name}</h2>
                                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0' }}>{isRTL ? 'الرقم الضريبي: ' : 'VAT: '}{invoice.seller.vatNumber}</p>
                                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0' }}>{isRTL ? 'السجل التجاري: ' : 'CR: '}{invoice.seller.crNumber}</p>
                                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0' }}>{invoice.seller.address}، {invoice.seller.city}</p>
                                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0' }}>{isRTL ? 'هاتف: ' : 'Tel: '}{invoice.seller.phone}</p>
                            </div>
                            <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
                                <div style={{ display: 'inline-block', background: '#4f46e5', color: '#fff', padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
                                    {typeLabel}
                                </div>
                                <table style={{ fontSize: 13 }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ color: '#64748b', paddingInlineEnd: 12 }}>{isRTL ? 'رقم الفاتورة:' : 'Invoice #:'}</td>
                                            <td style={{ fontWeight: 700, color: '#4f46e5' }}>{invoice.id}</td>
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
                                </table>
                            </div>
                        </div>

                        {/* ── Buyer Info (B2B) ── */}
                        {invoice.buyer && (
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
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#4f46e5', color: '#fff' }}>
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
                                            <span style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>{line.code}</span>
                                        </td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>{line.qty}</td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{line.unit}</td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>{formatSAR(line.price)}</td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center', color: '#7c3aed' }}>{formatSAR(line.vat)}</td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700 }}>{formatSAR(line.inclVat)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* ── Totals + QR ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
                            {/* QR Code */}
                            <div style={{ textAlign: 'center' }}>
                                {qrDataURI ? (
                                    <img src={qrDataURI} alt="ZATCA QR" style={{ width: 110, height: 110, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                                ) : (
                                    <div style={{ width: 110, height: 110, border: '2px dashed #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11 }}>
                                        QR Code
                                    </div>
                                )}
                                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                                    {isRTL ? 'امسح للتحقق' : 'Scan to verify'}
                                </p>
                                <p style={{ fontSize: 9, color: '#cbd5e1', marginTop: 2 }}>{invoice.uuid.substring(0, 8)}...</p>
                            </div>

                            {/* Summary */}
                            <div style={{ minWidth: 260 }}>
                                <table style={{ width: '100%', fontSize: 13 }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ color: '#64748b', padding: '4px 0' }}>{isRTL ? 'المجموع قبل الضريبة' : 'Subtotal (excl. VAT)'}</td>
                                            <td style={{ textAlign: 'end', fontWeight: 600 }}>{formatSAR(subtotalExcl)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ color: '#7c3aed', padding: '4px 0' }}>{isRTL ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</td>
                                            <td style={{ textAlign: 'end', color: '#7c3aed', fontWeight: 600 }}>{formatSAR(totalVat)}</td>
                                        </tr>
                                        <tr style={{ borderTop: '2px solid #4f46e5' }}>
                                            <td style={{ fontWeight: 700, fontSize: 15, padding: '8px 0 0' }}>{isRTL ? 'الإجمالي شامل الضريبة' : 'Total (incl. VAT)'}</td>
                                            <td style={{ textAlign: 'end', fontWeight: 800, fontSize: 18, color: '#4f46e5', padding: '8px 0 0' }}>{formatSAR(grandTotal)}</td>
                                        </tr>
                                    </tbody>
                                </table>
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
                            <span>{isRTL ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</span>
                            <span>{isRTL ? 'هذه فاتورة إلكترونية معتمدة' : 'This is a ZATCA Phase 1 compliant e-invoice'}</span>
                        </div>
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
