"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { hrApi } from '@/lib/api';

export default function PayrollPage() {
    const { d, isRTL } = useLanguage();
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        fetchData();
    }, [month, year]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await hrApi.getPayrolls({ month, year, limit: 100 });
            setPayrolls(res.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch payrolls", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        try {
            setLoading(true);
            await hrApi.generatePayroll({ month, year });
            await fetchData();
            showToast(isRTL ? 'تم إنشاء مسير الرواتب بنجاح ✓' : 'Payrolls generated successfully ✓');
        } catch (error: any) {
            showToast(error.response?.data?.message || (isRTL ? 'فشل إنشاء مسير الرواتب' : 'Failed to generate payrolls'), 'error');
            setLoading(false);
        }
    };

    const handlePay = async (id: string, empName: string) => {
        if (!confirm(isRTL ? `تأكيد صرف راتب "${empName}"? سيتم خصمه من رصيد الشركة` : `Mark ${empName}'s salary as paid?`)) return;
        
        try {
            await hrApi.markPayrollAsPaid(id);
            showToast(isRTL ? 'تم تسجيل الصرف بنجاح ✓' : 'Salary marked as paid ✓');
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || (isRTL ? 'فشل تسجيل الصرف' : 'Failed to mark as paid'), 'error');
        }
    };

    const totalSalary = payrolls.reduce((sum, p) => sum + parseFloat(p.net_salary), 0);

    return (
        <div className="space-y-6 animate-fade-in p-4 sm:p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-[200] px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold flex items-center gap-2 animate-scale-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}
            {/* Header */}
            <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-primary-500">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        {d.hr?.payroll || 'Payroll Management'}
                    </h1>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'إدارة رواتب الموظفين واعتماد مسير الرواتب الشهري' : 'Manage employee salaries and approve monthly payroll'}
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 bg-surface-100 dark:bg-surface-800 p-1.5 rounded-xl border border-surface-200 dark:border-surface-700">
                        <select 
                            value={month} 
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                            className="p-2 text-sm font-medium bg-transparent border-none outline-none cursor-pointer"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                <option key={m} value={m} className="dark:bg-surface-800">{new Date(2000, m - 1, 1).toLocaleString(isRTL ? 'ar-SA' : 'en-US', { month: 'long' })} ({m})</option>
                            ))}
                        </select>
                        <span className="text-surface-300">|</span>
                        <input 
                            type="number" 
                            value={year} 
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="p-2 text-sm font-medium bg-transparent border-none outline-none w-20 text-center"
                            style={{ color: 'var(--text-primary)' }}
                        />
                    </div>
                    
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/30"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        {d.hr?.generatePayroll || (isRTL ? 'إنشاء مسير الرواتب' : 'Generate Payroll')}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    { label: isRTL ? 'إجمالي الرواتب' : 'Total Amount', value: totalSalary.toFixed(2), icon: '💰', gradient: 'from-blue-500/20 to-blue-600/5', color: 'text-blue-500' },
                    { label: isRTL ? 'الرواتب المدفوعة' : 'Paid', value: payrolls.filter(p => p.status === 'paid').reduce((s, p) => s + parseFloat(p.net_salary), 0).toFixed(2), icon: '✅', gradient: 'from-emerald-500/20 to-emerald-600/5', color: 'text-emerald-500' },
                    { label: isRTL ? 'الرواتب المعلقة' : 'Pending Drafts', value: payrolls.filter(p => p.status === 'draft').reduce((s, p) => s + parseFloat(p.net_salary), 0).toFixed(2), icon: '⏳', gradient: 'from-orange-500/20 to-orange-600/5', color: 'text-orange-500' },
                ].map((st, i) => (
                    <div key={i} className="stat-card relative overflow-hidden group">
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${st.gradient} opacity-50 transition-opacity group-hover:opacity-100`} />
                        <div className="relative flex items-start justify-between p-2">
                            <div>
                                <p className="text-sm font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{st.label}</p>
                                <p className={`text-3xl font-black ${st.color}`}>{st.value} <span className="text-xs font-normal opacity-70">{isRTL ? 'ر.س' : 'SAR'}</span></p>
                            </div>
                            <span className="text-4xl opacity-80 group-hover:scale-110 transition-transform">{st.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        📋 {isRTL ? 'تفاصيل الرواتب' : 'Payroll Details'}
                    </h3>
                </div>
                
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p style={{ color: 'var(--text-muted)' }}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table text-sm w-full">
                            <thead>
                                <tr>
                                    <th>{d.hr?.employeeName || (isRTL ? 'اسم الموظف' : 'Name')}</th>
                                    <th>{d.hr?.baseSalary || (isRTL ? 'الراتب الأساسي' : 'Base Salary')}</th>
                                    <th>{d.hr?.deductions || (isRTL ? 'الخصومات' : 'Deductions')}</th>
                                    <th>{d.hr?.bonuses || (isRTL ? 'البدلات/المكافآت' : 'Bonuses')}</th>
                                    <th>{d.hr?.netSalary || (isRTL ? 'صافي الراتب' : 'Net Salary')}</th>
                                    <th>{d.hr?.status || (isRTL ? 'الحالة' : 'Status')}</th>
                                    <th className="text-center">{d.hr?.actions || (isRTL ? 'إجراءات' : 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrolls.map(pr => (
                                    <tr key={pr.id} className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800">
                                        <td>
                                            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{pr.employee?.name}</div>
                                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{pr.employee?.employee_code || '#EMP'}</div>
                                        </td>
                                        <td className="font-medium" style={{ color: 'var(--text-secondary)' }}>{parseFloat(pr.base_salary).toFixed(2)}</td>
                                        <td className="text-red-500 font-medium bg-red-50/30 dark:bg-red-900/10">{parseFloat(pr.deductions).toFixed(2)}</td>
                                        <td className="text-emerald-500 font-medium bg-emerald-50/30 dark:bg-emerald-900/10">{parseFloat(pr.bonuses).toFixed(2)}</td>
                                        <td className="font-black text-primary-600 dark:text-primary-400 bg-primary-50/30 dark:bg-primary-900/10 text-lg">
                                            {parseFloat(pr.net_salary).toFixed(2)}
                                        </td>
                                        <td>
                                            {pr.status === 'paid' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    {isRTL ? 'مدفوع' : 'Paid'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                                    {isRTL ? 'معلق (مسودة)' : 'Draft'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {pr.status === 'draft' ? (
                                                <button 
                                                    onClick={() => handlePay(pr.id, pr.employee?.name)}
                                                    className="btn-primary py-1.5 px-3 text-xs shadow-md flex items-center justify-center gap-1 mx-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-none"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                    {isRTL ? 'اعتماد الدفع' : 'Pay Salary'}
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800 flex items-center justify-center gap-1 mx-auto w-max">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {isRTL ? 'تم التسجيل كـ مصروف' : 'Expense Recorded'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {payrolls.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <span className="text-5xl mb-3 grayscale opacity-40">📝</span>
                                                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {isRTL ? 'لا يوجد مسير رواتب لهذا الشهر' : 'No payroll generated for this month.'}
                                                </p>
                                                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                                    {isRTL ? 'انقر على "إنشاء مسير الرواتب" للبدء' : 'Click "Generate Payroll" to begin.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
