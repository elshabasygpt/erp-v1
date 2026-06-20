'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';

interface VatReportContentProps {
    dict: any;
    locale: string;
}

const formatSAR = (n: number) => `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

const MONTHS = [
    { key: '01', label: 'يناير', labelEn: 'January' },
    { key: '02', label: 'فبراير', labelEn: 'February' },
    { key: '03', label: 'مارس', labelEn: 'March' },
    { key: '04', label: 'أبريل', labelEn: 'April' },
    { key: '05', label: 'مايو', labelEn: 'May' },
    { key: '06', label: 'يونيو', labelEn: 'June' },
    { key: '07', label: 'يوليو', labelEn: 'July' },
    { key: '08', label: 'أغسطس', labelEn: 'August' },
    { key: '09', label: 'سبتمبر', labelEn: 'September' },
    { key: '10', label: 'أكتوبر', labelEn: 'October' },
    { key: '11', label: 'نوفمبر', labelEn: 'November' },
    { key: '12', label: 'ديسمبر', labelEn: 'December' },
];

const QUARTERS = [
    { key: 'Q1', label: 'الربع الأول', labelEn: 'Q1' },
    { key: 'Q2', label: 'الربع الثاني', labelEn: 'Q2' },
    { key: 'Q3', label: 'الربع الثالث', labelEn: 'Q3' },
    { key: 'Q4', label: 'الربع الرابع', labelEn: 'Q4' },
];

export default function VatReportContent({ dict, locale }: VatReportContentProps) {
    const isRTL = locale === 'ar';
    const tz = dict.zatca || {};

    const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('monthly');
    const [selectedPeriod, setSelectedPeriod] = useState(
        (new Date().getMonth() + 1).toString().padStart(2, '0')
    );
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    const defaultVatData = {
        sales: 0,
        exemptSales: 0,
        outputVat: 0,
        purchases: 0,
        inputVat: 0,
        netVatPayable: 0
    };

    const { data: vatData = defaultVatData, isLoading: loading } = useQuery({
        queryKey: ['vat-report', periodType, selectedPeriod, selectedYear],
        queryFn: async () => {
            const res = await reportsApi.getVatReport({
                year: selectedYear,
                period: periodType,
                value: selectedPeriod
            });
            return res.data?.status === 'success' ? res.data.data : defaultVatData;
        },
    });

    const boxes = [
        {
            number: 1,
            label: isRTL ? 'مبيعات خاضعة للضريبة القياسية' : 'Standard-Rated Sales',
            value: vatData.sales,
            sub: isRTL ? 'خاضعة لضريبة 15%' : 'Subject to 15% VAT',
            color: '#6366f1',
            bg: 'rgba(99,102,241,0.1)',
        },
        {
            number: 2,
            label: isRTL ? 'المبيعات المعفاة / الصفرية' : 'Exempt / Zero-Rated Sales',
            value: vatData.exemptSales,
            sub: isRTL ? 'معفاة من الضريبة' : 'Exempt from VAT',
            color: '#64748b',
            bg: 'rgba(100,116,139,0.1)',
        },
        {
            number: 3,
            label: isRTL ? 'ضريبة المخرجات' : 'Output VAT',
            value: vatData.outputVat,
            sub: isRTL ? '15% × المبيعات الخاضعة' : '15% × Standard Sales',
            color: '#ef4444',
            bg: 'rgba(239,68,68,0.1)',
            isTax: true,
        },
        {
            number: 4,
            label: isRTL ? 'مشتريات خاضعة للضريبة القياسية' : 'Standard-Rated Purchases',
            value: vatData.purchases,
            sub: isRTL ? 'مشتريات خاضعة للضريبة' : 'Taxable purchases',
            color: '#8b5cf6',
            bg: 'rgba(139,92,246,0.1)',
        },
        {
            number: 5,
            label: isRTL ? 'ضريبة المدخلات القابلة للاسترداد' : 'Recoverable Input VAT',
            value: vatData.inputVat,
            sub: isRTL ? '15% × المشتريات الخاضعة' : '15% × Standard Purchases',
            color: '#10b981',
            bg: 'rgba(16,185,129,0.1)',
            isTax: true,
        },
        {
            number: 6,
            label: isRTL ? 'صافي الضريبة المستحقة' : 'Net VAT Payable',
            value: vatData.netVatPayable,
            sub: isRTL ? 'الفرق: ضريبة المخرجات - المدخلات' : 'Output VAT − Input VAT',
            color: vatData.netVatPayable > 0 ? '#f59e0b' : '#10b981',
            bg: vatData.netVatPayable > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
            isTax: true,
            isNet: true,
        },
    ];

    const periods = periodType === 'monthly' ? MONTHS : QUARTERS;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">🧾</span>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{tz.vatReport || 'VAT Return Report'}</h1>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {tz.vatReportSubtitle || 'VAT summary for tax declaration'}
                    </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={() => typeof window !== 'undefined' && window.print()}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                        style={{ background: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                    >
                        🖨 {tz.exportReport || 'Export'}
                    </button>
                    <button
                        className="btn-primary flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
                    >
                        📤 {tz.submitToZatca || 'Submit to ZATCA'}
                    </button>
                </div>
            </div>

            {/* Period Selector */}
            <div className="glass-card p-5">
                <div className="flex flex-wrap items-center gap-4">
                    <select
                        className="input-field py-2 text-sm max-w-[120px]"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        {[2023, 2024, 2025, 2026].map(y => (
                            <option key={y} value={y.toString()}>{y}</option>
                        ))}
                    </select>

                    <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                        {(['monthly', 'quarterly'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => {
                                    setPeriodType(t);
                                    setSelectedPeriod(t === 'monthly' ? '01' : 'Q1');
                                }}
                                className="px-5 py-2 text-sm font-medium transition-all"
                                style={periodType === t
                                    ? { background: 'var(--color-primary)', color: '#fff' }
                                    : { background: 'transparent', color: 'var(--text-secondary)' }}
                            >
                                {t === 'monthly' ? (tz.monthly || 'Monthly') : (tz.quarterly || 'Quarterly')}
                            </button>
                        ))}
                    </div>

                     <select
                        className="input-field py-2 text-sm"
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                    >
                        {periods.map((p) => (
                            <option key={p.key} value={p.key}>{isRTL ? p.label : p.labelEn}</option>
                        ))}
                    </select>

                    {loading && <span className="text-xs text-primary animate-pulse">جاري التحميل...</span>}

                    <div className="ms-auto flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                            ✓ ZATCA {tz.phase1 || 'Phase 1'} {tz.compliant || 'Compliant'}
                        </span>
                    </div>
                </div>
            </div>

            {/* VAT Boxes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {boxes.map((box) => (
                    <div
                        key={box.number}
                        className="glass-card p-5 relative overflow-hidden"
                        style={box.isNet ? { border: `2px solid ${box.color}` } : {}}
                    >
                        <div className="absolute top-0 end-0 w-20 h-20 rounded-full opacity-10 pointer-events-none" style={{ background: box.color, transform: 'translate(30%,-30%)' }} />
                        <div className="flex items-start justify-between mb-3">
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                                style={{ background: box.bg, color: box.color }}
                            >
                                {box.number}
                            </div>
                            {box.isNet && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: box.bg, color: box.color }}>
                                    {isRTL ? 'الصافي' : 'Net'}
                                </span>
                            )}
                        </div>
                        <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{box.label}</p>
                        <p className={`font-bold mt-1 ${box.isNet ? 'text-2xl' : 'text-xl'}`} style={{ color: box.isNet ? box.color : 'var(--text-primary)' }}>
                            {formatSAR(Math.abs(box.value))}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{box.sub}</p>
                        {box.isTax && (
                            <div className="mt-3 pt-3 flex justify-between text-xs" style={{ borderTop: '1px solid var(--border-default)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'النسبة' : 'Rate'}</span>
                                <span style={{ color: box.color, fontWeight: 600 }}>15%</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Summary Table */}
            <div className="glass-card overflow-hidden">
                <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'ملخص الإقرار الضريبي' : 'VAT Declaration Summary'}</h3>
                </div>
                <div className="p-6">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{isRTL ? 'البند' : 'Item'}</th>
                                <th>{isRTL ? 'الوعاء الضريبي' : 'Tax Base'}</th>
                                <th>{isRTL ? 'مبلغ الضريبة' : 'VAT Amount'}</th>
                                <th>{isRTL ? 'النسبة' : 'Rate'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{tz.box1 || 'Standard-Rated Sales'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{formatSAR(vatData.sales)}</td>
                                <td style={{ color: '#ef4444', fontWeight: 600 }}>{formatSAR(vatData.outputVat)}</td>
                                <td>
                                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>15%</span>
                                </td>
                            </tr>
                            <tr>
                                <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{tz.box2 || 'Exempt / Zero-Rated Sales'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{formatSAR(vatData.exemptSales)}</td>
                                <td style={{ color: 'var(--text-muted)' }}>0.00 ر.س</td>
                                <td>
                                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b' }}>0%</span>
                                </td>
                            </tr>
                            <tr>
                                <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{tz.box4 || 'Standard-Rated Purchases'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{formatSAR(vatData.purchases)}</td>
                                <td style={{ color: '#10b981', fontWeight: 600 }}>({formatSAR(vatData.inputVat)})</td>
                                <td>
                                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>15%</span>
                                </td>
                            </tr>
                            <tr style={{ borderTop: '2px solid var(--border-default)' }}>
                                <td className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{tz.box6 || 'Net VAT Payable'}</td>
                                <td></td>
                                <td className="font-bold text-base" style={{ color: vatData.netVatPayable > 0 ? '#f59e0b' : '#10b981' }}>
                                    {formatSAR(Math.abs(vatData.netVatPayable))}
                                </td>
                                <td>
                                    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: vatData.netVatPayable > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: vatData.netVatPayable > 0 ? '#f59e0b' : '#10b981' }}>
                                        {vatData.netVatPayable > 0 ? (isRTL ? 'مستحق للدفع' : 'Payable') : (isRTL ? 'فائض' : 'Refundable')}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Filing Notice */}
            <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <span className="text-xl mt-0.5">ℹ️</span>
                <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'موعد تقديم الإقرار الضريبي' : 'VAT Filing Deadline'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {isRTL
                            ? 'يجب تقديم الإقرار الضريبي خلال 30 يوماً من نهاية الفترة الضريبية.'
                            : 'VAT returns must be filed within 30 days from the end of the tax period.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
