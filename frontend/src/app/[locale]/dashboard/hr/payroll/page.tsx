"use client";

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { hrApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Settings, Check, Download, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export default function PayrollPage() {
    const { isRTL } = useLanguage();
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    
    // Generate state
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        loadData();
    }, [month, year]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await hrApi.getPayrolls({ month, year });
            setPayrolls(res.data?.data || res.data || []);
        } catch (err) {
            toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load payrolls');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!confirm(isRTL ? `هل أنت متأكد من إنشاء رواتب شهر ${month}/${year}؟ قد يستغرق هذا بضع ثوانٍ.` : `Are you sure you want to generate payroll for ${month}/${year}?`)) {
            return;
        }

        setIsGenerating(true);
        try {
            await hrApi.generatePayroll({ month, year });
            toast.success(isRTL ? 'تم إنشاء مسير الرواتب بنجاح' : 'Payroll generated successfully');
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'حدث خطأ أثناء الإنشاء' : 'Error generating payroll'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleMarkPaid = async (id: string) => {
        if (!confirm(isRTL ? 'هل أنت متأكد من اعتماد ودفع هذا الراتب؟ سيتم تسجيله كمصروف.' : 'Are you sure you want to mark this as paid? It will be recorded as an expense.')) {
            return;
        }
        
        try {
            await hrApi.markPayrollAsPaid(id);
            toast.success(isRTL ? 'تم صرف الراتب' : 'Payroll marked as paid');
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشل تحديث الحالة' : 'Failed to mark as paid'));
        }
    };

    // Calculate totals
    const totalBase = payrolls.reduce((sum, p) => sum + parseFloat(p.base_salary || 0), 0);
    const totalNet = payrolls.reduce((sum, p) => sum + parseFloat(p.net_salary || 0), 0);
    const totalDeductions = payrolls.reduce((sum, p) => sum + parseFloat(p.deductions || 0), 0);
    const totalBonuses = payrolls.reduce((sum, p) => sum + parseFloat(p.bonuses || 0), 0);

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1">{isRTL ? 'مسيرات الرواتب' : 'Payroll Management'}</h1>
                    <p className="text-surface-500 text-sm">
                        {isRTL ? 'إنشاء وإدارة رواتب الموظفين الشهرية' : 'Generate and manage monthly employee payrolls'}
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <select 
                        value={month} 
                        onChange={e => setMonth(Number(e.target.value))}
                        className="p-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none font-medium"
                    >
                        {Array.from({length: 12}).map((_, i) => (
                            <option key={i+1} value={i+1}>{isRTL ? `شهر ${i+1}` : `Month ${i+1}`}</option>
                        ))}
                    </select>
                    
                    <select 
                        value={year} 
                        onChange={e => setYear(Number(e.target.value))}
                        className="p-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none font-medium"
                    >
                        {[year - 1, year, year + 1].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    
                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || loading}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <Settings size={18} />
                        )}
                        {isRTL ? 'إنشاء مسير الراتب' : 'Generate Payroll'}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {!loading && payrolls.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-surface-900 p-4 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800">
                        <div className="text-surface-500 text-sm font-medium mb-1">{isRTL ? 'إجمالي الرواتب الأساسية' : 'Total Base Salaries'}</div>
                        <div className="text-2xl font-bold text-surface-900 dark:text-surface-100">{totalBase.toLocaleString('en-US', {minimumFractionDigits: 2})} SAR</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-800/30">
                        <div className="text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-1">{isRTL ? 'إجمالي البدلات والمكافآت' : 'Total Bonuses'}</div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">+{totalBonuses.toLocaleString('en-US', {minimumFractionDigits: 2})} SAR</div>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-xl shadow-sm border border-rose-100 dark:border-rose-800/30">
                        <div className="text-rose-600 dark:text-rose-400 text-sm font-medium mb-1">{isRTL ? 'إجمالي الخصومات والسلف' : 'Total Deductions'}</div>
                        <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">-{totalDeductions.toLocaleString('en-US', {minimumFractionDigits: 2})} SAR</div>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-900/10 p-4 rounded-xl shadow-sm border border-violet-100 dark:border-violet-800/30">
                        <div className="text-violet-600 dark:text-violet-400 text-sm font-medium mb-1">{isRTL ? 'إجمالي الصافي المستحق' : 'Total Net Payable'}</div>
                        <div className="text-2xl font-bold text-violet-700 dark:text-violet-300">{totalNet.toLocaleString('en-US', {minimumFractionDigits: 2})} SAR</div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-surface-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-500 border-b border-surface-200 dark:border-surface-800 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'الموظف' : 'Employee'}</th>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'الراتب الأساسي' : 'Base'}</th>
                                    <th className="px-6 py-4 text-start text-emerald-600 dark:text-emerald-400">{isRTL ? 'البدلات والمكافآت' : 'Bonuses'}</th>
                                    <th className="px-6 py-4 text-start text-rose-600 dark:text-rose-400">{isRTL ? 'الخصومات والسلف' : 'Deductions'}</th>
                                    <th className="px-6 py-4 text-start font-bold text-violet-600 dark:text-violet-400">{isRTL ? 'الصافي' : 'Net Salary'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrolls.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-surface-500">
                                            {isRTL ? 'لا يوجد رواتب تم إنشاؤها لهذا الشهر' : 'No payroll generated for this month'}
                                        </td>
                                    </tr>
                                ) : (
                                    payrolls.map(payroll => (
                                        <tr key={payroll.id} className="border-b border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-surface-900 dark:text-surface-100">
                                                    {payroll.employee?.name || 'Unknown'}
                                                </div>
                                                <div className="text-xs text-surface-500">
                                                    {payroll.employee?.position || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono">
                                                {parseFloat(payroll.base_salary).toLocaleString('en-US', {minimumFractionDigits: 2})}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-emerald-600 dark:text-emerald-400">
                                                {parseFloat(payroll.bonuses) > 0 ? `+${parseFloat(payroll.bonuses).toLocaleString('en-US', {minimumFractionDigits: 2})}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-rose-600 dark:text-rose-400">
                                                {parseFloat(payroll.deductions) > 0 ? `-${parseFloat(payroll.deductions).toLocaleString('en-US', {minimumFractionDigits: 2})}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-violet-600 dark:text-violet-400">
                                                {parseFloat(payroll.net_salary).toLocaleString('en-US', {minimumFractionDigits: 2})} SAR
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {payroll.status === 'paid' ? (
                                                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 flex items-center justify-center gap-1 mx-auto w-max">
                                                        <CheckCircle2 size={14} /> {isRTL ? 'مدفوع' : 'Paid'}
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 flex items-center justify-center gap-1 mx-auto w-max">
                                                        <AlertTriangle size={14} /> {isRTL ? 'مسودة' : 'Draft'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {payroll.status === 'draft' && (
                                                    <button 
                                                        onClick={() => handleMarkPaid(payroll.id)}
                                                        className="px-3 py-1.5 bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 rounded-lg transition text-xs font-medium flex items-center justify-center gap-1 mx-auto w-max border border-violet-200 dark:border-violet-800/50"
                                                    >
                                                        <Check size={14} /> {isRTL ? 'اعتماد ودفع' : 'Mark Paid'}
                                                    </button>
                                                )}
                                                {payroll.status === 'paid' && (
                                                    <button 
                                                        className="px-3 py-1.5 text-surface-400 hover:text-violet-600 rounded-lg transition text-xs font-medium flex items-center justify-center gap-1 mx-auto w-max"
                                                        title={isRTL ? 'إيصال الدفع' : 'Payslip'}
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
