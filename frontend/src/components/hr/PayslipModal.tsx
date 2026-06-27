'use client';
import { useState, useEffect, useRef } from 'react';
import { hrApi } from '@/lib/api';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface PayslipModalProps {
    payrollId: string;
    isRTL: boolean;
    onClose: () => void;
}

export default function PayslipModal({ payrollId, isRTL, onClose }: PayslipModalProps) {
    const { currencySymbol } = useCurrencyFormatter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        hrApi.getPayslip(payrollId)
            .then(res => setData(res.data?.data || res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [payrollId]);

    const handlePrint = () => {
        const content = printRef.current?.innerHTML;
        if (!content) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
            <!DOCTYPE html>
            <html dir="${isRTL ? 'rtl' : 'ltr'}">
            <head>
                <meta charset="UTF-8">
                <title>قسيمة الراتب</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; font-size: 13px; }
                    .payslip { max-width: 800px; margin: 20px auto; border: 2px solid #333; }
                    .header { background: #1e40af; color: white; padding: 16px; display: flex; justify-content: space-between; }
                    .section { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                    .totals { background: #f8fafc; }
                    .net-salary { text-align: center; padding: 16px; font-size: 20px; font-weight: bold; color: #1e40af; border-bottom: 2px solid #1e40af; }
                    .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 20px 16px; min-height: 100px; }
                    .sig-box { border-top: 1px solid #333; padding-top: 8px; font-size: 11px; color: #666; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { padding: 6px 8px; border: 1px solid #e5e7eb; text-align: ${isRTL ? 'right' : 'left'}; }
                    th { background: #f3f4f6; font-weight: bold; }
                    .amount { font-weight: bold; }
                    .deduction { color: #dc2626; }
                    .addition { color: #16a34a; }
                    .text-center { text-align: center; }
                    .text-right { text-align: ${isRTL ? 'left' : 'right'}; }
                    .text-sm { font-size: 14px; }
                    .text-xs { font-size: 12px; }
                    .font-bold { font-weight: bold; }
                    .font-black { font-weight: 900; }
                    .text-blue-700 { color: #1d4ed8; }
                    .text-blue-800 { color: #1e40af; }
                    .text-green-700 { color: #15803d; }
                    .text-red-700 { color: #b91c1c; }
                    .bg-blue-50 { background-color: #eff6ff; }
                    .bg-green-50 { background-color: #f0fdf4; }
                    .bg-red-50 { background-color: #fef2f2; }
                    .border-b { border-bottom: 1px solid #e5e7eb; }
                    .mb-2 { margin-bottom: 0.5rem; }
                    .p-2 { padding: 0.5rem; }
                    .p-4 { padding: 1rem; }
                    .p-6 { padding: 1.5rem; }
                    .flex { display: flex; }
                    .justify-between { justify-content: space-between; }
                    .items-start { align-items: flex-start; }
                    .grid { display: grid; }
                    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
                    .gap-2 { gap: 0.5rem; }
                    .gap-4 { gap: 1rem; }
                    .gap-8 { gap: 2rem; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 500);
    };

    const monthName = data ? new Date(data.payroll.year, data.payroll.month - 1, 1)
        .toLocaleString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' }) : '';

    if (loading) {
        return (
            <div className="modal-overlay">
                <div className="modal-content flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-3xl">
                {/* Toolbar */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        🧾 {isRTL ? 'قسيمة الراتب' : 'Payslip'}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={handlePrint}
                            className="btn-primary flex items-center gap-2 text-sm">
                            🖨️ {isRTL ? 'طباعة' : 'Print'}
                        </button>
                        <button onClick={onClose} className="btn-secondary text-sm">
                            {isRTL ? 'إغلاق' : 'Close'}
                        </button>
                    </div>
                </div>

                {/* Payslip Content */}
                <div className="overflow-y-auto max-h-[80vh] p-4 text-black bg-white dark:bg-white">
                    <div ref={printRef}>
                        <div className="payslip border-2 border-gray-800 rounded-lg overflow-hidden"
                             style={{ fontFamily: 'Arial, sans-serif' }}>

                            {/* Header */}
                            <div className="bg-blue-800 text-white p-4 flex justify-between items-start" style={{backgroundColor: '#1e40af', color: 'white'}}>
                                <div>
                                    <h1 className="text-xl font-bold">{data?.company_name}</h1>
                                    <p className="text-blue-200 text-sm mt-1">
                                        {isRTL ? 'قسيمة الراتب' : 'Payslip'}
                                    </p>
                                </div>
                                <div className="text-left" style={{textAlign: isRTL ? 'left' : 'right'}}>
                                    <p className="font-bold text-lg">{monthName}</p>
                                    <p className="text-blue-200 text-sm">
                                        {isRTL ? 'تاريخ الإصدار:' : 'Issued:'} {new Date().toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {/* Employee Info */}
                            <div className="p-4 bg-gray-50 border-b border-gray-300 grid grid-cols-2 gap-x-8 gap-y-2">
                                <div>
                                    <span className="text-gray-500 text-xs">{isRTL ? 'اسم الموظف' : 'Employee'}</span>
                                    <p className="font-bold">{data?.employee?.name}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 text-xs">{isRTL ? 'المسمى الوظيفي' : 'Position'}</span>
                                    <p className="font-bold">{data?.employee?.position || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 text-xs">{isRTL ? 'الراتب الأساسي' : 'Base Salary'}</span>
                                    <p className="font-bold text-blue-700">{Number(data?.totals?.base_salary).toFixed(2)}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 text-xs">{isRTL ? 'دوام العمل' : 'Shift'}</span>
                                    <p className="font-bold">{data?.employee?.shift_start} — {data?.employee?.shift_end}</p>
                                </div>
                            </div>

                            {/* Attendance Summary */}
                            {data?.attendance_summary && (
                                <div className="p-4 border-b border-gray-300">
                                    <p className="font-bold text-sm mb-2 text-gray-700">
                                        📅 {isRTL ? 'ملخص الحضور' : 'Attendance Summary'}
                                    </p>
                                    <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                        {[
                                            { label: isRTL ? 'أيام العمل' : 'Work Days', value: data.attendance_summary.working_days, color: 'text-gray-700' },
                                            { label: isRTL ? 'حاضر' : 'Present', value: data.attendance_summary.present_days, color: 'text-green-600' },
                                            { label: isRTL ? 'غياب' : 'Absent', value: data.attendance_summary.absent_days, color: 'text-red-600' },
                                            { label: isRTL ? 'تأخير (يوم)' : 'Late Days', value: data.attendance_summary.late_days, color: 'text-orange-600' },
                                            { label: isRTL ? 'دقائق تأخير' : 'Late (min)', value: data.attendance_summary.total_late_minutes, color: 'text-orange-600' },
                                        ].map((s, i) => (
                                            <div key={i} className="bg-gray-50 rounded p-2">
                                                <p className={`text-xl font-black ${s.color}`}>{s.value ?? 0}</p>
                                                <p className="text-gray-500 text-[10px] mt-1">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Items Table — 2 Columns */}
                            <div className="p-4 border-b border-gray-300">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Additions */}
                                    <div>
                                        <p className="font-bold text-green-700 text-sm mb-2">
                                            ✅ {isRTL ? 'الإضافات والمكافآت' : 'Additions & Bonuses'}
                                        </p>
                                        <table className="w-full text-xs" style={{borderCollapse: 'collapse'}}>
                                            <thead>
                                                <tr className="bg-green-50">
                                                    <th className="p-2 border border-gray-200" style={{textAlign: isRTL ? 'right' : 'left'}}>{isRTL ? 'البيان' : 'Description'}</th>
                                                    <th className="p-2 border border-gray-200 text-left" style={{textAlign: isRTL ? 'left' : 'right'}}>{isRTL ? 'المبلغ' : 'Amount'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border border-gray-200">
                                                    <td className="p-2 border border-gray-200">{isRTL ? 'الراتب الأساسي' : 'Base Salary'}</td>
                                                    <td className="p-2 border border-gray-200 font-bold text-green-700 text-left" style={{textAlign: isRTL ? 'left' : 'right'}}>
                                                        {Number(data?.totals?.base_salary).toFixed(2)}
                                                    </td>
                                                </tr>
                                                {data?.items?.bonuses?.map((item: any) => (
                                                    <tr key={item.id} className="border border-gray-200">
                                                        <td className="p-2 border border-gray-200">{item.reason}</td>
                                                        <td className="p-2 border border-gray-200 font-bold text-green-700 text-left" style={{textAlign: isRTL ? 'left' : 'right'}}>
                                                            {Number(item.amount).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-green-50 border-t-2 border-green-300">
                                                    <td className="p-2 border border-gray-200 font-bold">{isRTL ? 'الإجمالي' : 'Total'}</td>
                                                    <td className="p-2 border border-gray-200 font-black text-green-700 text-left" style={{textAlign: isRTL ? 'left' : 'right'}}>
                                                        {(Number(data?.totals?.base_salary) + Number(data?.totals?.total_bonuses)).toFixed(2)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Deductions */}
                                    <div>
                                        <p className="font-bold text-red-700 text-sm mb-2">
                                            ❌ {isRTL ? 'الخصومات والاستقطاعات' : 'Deductions'}
                                        </p>
                                        <table className="w-full text-xs" style={{borderCollapse: 'collapse'}}>
                                            <thead>
                                                <tr className="bg-red-50">
                                                    <th className="p-2 border border-gray-200" style={{textAlign: isRTL ? 'right' : 'left'}}>{isRTL ? 'البيان' : 'Description'}</th>
                                                    <th className="p-2 border border-gray-200 text-left" style={{textAlign: isRTL ? 'left' : 'right'}}>{isRTL ? 'المبلغ' : 'Amount'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data?.items?.deductions?.length === 0 && (
                                                    <tr><td colSpan={2} className="p-2 border border-gray-200 text-gray-400 text-center text-xs">لا يوجد</td></tr>
                                                )}
                                                {data?.items?.deductions?.map((item: any) => (
                                                    <tr key={item.id} className="border border-gray-200">
                                                        <td className="p-2 border border-gray-200">
                                                            <span className="text-gray-500 text-[10px] block">{item.type_label}</span>
                                                            {item.reason}
                                                        </td>
                                                        <td className="p-2 border border-gray-200 font-bold text-red-600 text-left" style={{textAlign: isRTL ? 'left' : 'right'}}>
                                                            {Number(item.amount).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-red-50 border-t-2 border-red-300">
                                                    <td className="p-2 border border-gray-200 font-bold">{isRTL ? 'الإجمالي' : 'Total'}</td>
                                                    <td className="p-2 border border-gray-200 font-black text-red-700 text-left" style={{textAlign: isRTL ? 'left' : 'right'}}>
                                                        {Number(data?.totals?.total_deductions).toFixed(2)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Net Salary */}
                            <div className="p-6 text-center bg-blue-50 border-b-2 border-blue-800" style={{backgroundColor: '#eff6ff', borderBottom: '2px solid #1e40af'}}>
                                <p className="text-gray-500 text-sm mb-1">
                                    {isRTL ? '💰 صافي الراتب المستحق' : '💰 Net Salary'}
                                </p>
                                <p className="text-4xl font-black text-blue-800" style={{color: '#1e40af', fontSize: '36px', fontWeight: '900'}}>
                                    {Number(data?.totals?.net_salary).toFixed(2)}
                                    <span className="text-lg font-normal text-blue-500 mr-2" style={{fontSize: '18px', fontWeight: 'normal', color: '#3b82f6'}}>
                                        {currencySymbol}
                                    </span>
                                </p>
                            </div>

                            {/* Signature Section */}
                            <div className="grid grid-cols-2 gap-8 p-6">
                                <div>
                                    <p className="text-sm font-bold text-gray-700 mb-1">
                                        {isRTL ? '✍️ توقيع الموظف واستلام الراتب' : '✍️ Employee Signature & Receipt'}
                                    </p>
                                    {data?.payroll?.employee_signature_url ? (
                                        <div>
                                            <img src={data.payroll.employee_signature_url}
                                                 alt="signature" className="h-12 object-contain mb-1" />
                                            <p className="text-xs text-gray-500">
                                                {isRTL ? 'تم التوقيع:' : 'Signed:'} {data.payroll.signed_at
                                                    ? new Date(data.payroll.signed_at).toLocaleDateString()
                                                    : '—'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="mt-8 border-t border-gray-800 pt-2" style={{borderTop: '1px solid #1f2937', marginTop: '32px', paddingTop: '8px'}}>
                                            <p className="text-xs text-gray-400">
                                                {isRTL ? 'التوقيع / التاريخ' : 'Signature / Date'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-700 mb-1">
                                        {isRTL ? '🏢 توقيع المسؤول / ختم الشركة' : '🏢 Manager Signature / Company Stamp'}
                                    </p>
                                    <div className="mt-8 border-t border-gray-800 pt-2" style={{borderTop: '1px solid #1f2937', marginTop: '32px', paddingTop: '8px'}}>
                                        <p className="text-xs text-gray-400">
                                            {isRTL ? 'التوقيع / التاريخ' : 'Signature / Date'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {data?.payroll?.payslip_notes && (
                                <div className="px-6 pb-4 text-xs text-gray-500 border-t border-gray-300">
                                    <p className="font-bold mt-2">{isRTL ? 'ملاحظات:' : 'Notes:'}</p>
                                    <p>{data.payroll.payslip_notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
