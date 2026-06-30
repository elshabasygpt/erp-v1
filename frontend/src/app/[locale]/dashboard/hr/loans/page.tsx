"use client";

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { hrApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';
import { Plus, Check, X, Clock, Wallet, CheckCircle, AlertTriangle } from 'lucide-react';

export default function LoansPage() {
    const { isRTL } = useLanguage();
    const [loans, setLoans] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [installmentsCount, setInstallmentsCount] = useState('');
    const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);
    const [startYear, setStartYear] = useState(new Date().getFullYear());
    const [reason, setReason] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [loansRes, empRes] = await Promise.all([
                hrApi.getLoans(),
                hrApi.getEmployees()
            ]);
            setLoans(loansRes.data?.data || loansRes.data || []);
            setEmployees(empRes.data?.data || empRes.data || []);
        } catch (err) {
            setLoadError(true);
            toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await hrApi.createLoan({
                employee_id: selectedEmployeeId,
                total_amount: parseFloat(totalAmount),
                installments_count: parseInt(installmentsCount),
                start_month: startMonth,
                start_year: startYear,
                reason
            });
            toast.success(isRTL ? 'تم تسجيل السلفة بنجاح' : 'Loan requested successfully');
            setIsModalOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشل تسجيل السلفة' : 'Failed to create loan'));
        }
    };

    const handleUpdateStatus = async (id: string, status: 'active' | 'paused' | 'cancelled') => {
        try {
            await hrApi.updateLoanStatus(id, { status });
            toast.success(isRTL ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully');
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشل تحديث الحالة' : 'Failed to update status'));
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">{isRTL ? 'نشط' : 'Active'}</span>;
            case 'completed': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">{isRTL ? 'مكتمل' : 'Completed'}</span>;
            case 'paused': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">{isRTL ? 'موقوف' : 'Paused'}</span>;
            case 'cancelled': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">{isRTL ? 'ملغي' : 'Cancelled'}</span>;
            default: return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300 border border-surface-200 dark:border-surface-700">{status}</span>;
        }
    };

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1">{isRTL ? 'إدارة السلف والتقسيط' : 'Loans & Installments'}</h1>
                    <p className="text-surface-500 text-sm">
                        {isRTL ? 'تسجيل ومتابعة سلف الموظفين والأقساط الشهرية' : 'Manage employee loans and monthly installments'}
                    </p>
                </div>
                <button 
                    onClick={() => {
                        setSelectedEmployeeId('');
                        setTotalAmount('');
                        setInstallmentsCount('');
                        setReason('');
                        setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    {isRTL ? 'إضافة سلفة جديدة' : 'New Loan'}
                </button>
            </div>

            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-500 border-b border-surface-200 dark:border-surface-800 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'الموظف' : 'Employee'}</th>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'إجمالي السلفة' : 'Total Amount'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'الأقساط (متبقي/كلي)' : 'Installments'}</th>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'الرصيد المتبقي' : 'Remaining Balance'}</th>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'تاريخ البدء' : 'Start Date'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={`sk-${i}`} className="border-b border-surface-200 dark:border-surface-800">
                                            {Array.from({ length: 7 }).map((__, j) => (
                                                <td key={j} className="p-3"><Skeleton className="w-3/4 h-4" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : loadError ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center">
                                            <p className="mb-3 text-sm" style={{ color: 'var(--text-danger,#dc2626)' }}>{isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}</p>
                                            <button onClick={() => loadData()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                                        </td>
                                    </tr>
                                ) : loans.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-surface-500">
                                            {isRTL ? 'لا توجد سلف مسجلة' : 'No loans found'}
                                        </td>
                                    </tr>
                                ) : (
                                    loans.map(loan => (
                                        <tr key={loan.id} className="border-b border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-surface-900 dark:text-surface-100">
                                                    {loan.employee?.name || 'Unknown'}
                                                </div>
                                                <div className="text-xs text-surface-500">
                                                    {loan.employee?.position || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-medium">
                                                {parseFloat(loan.total_amount).toLocaleString('en-US', {minimumFractionDigits: 2})} SAR
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono">
                                                <span className="text-surface-900 dark:text-surface-100 font-bold">{loan.pending_count || 0}</span>
                                                <span className="text-surface-400 mx-1">/</span>
                                                <span className="text-surface-500">{loan.installments_count}</span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-rose-600 dark:text-rose-400">
                                                {parseFloat(loan.remaining_amount).toLocaleString('en-US', {minimumFractionDigits: 2})} SAR
                                            </td>
                                            <td className="px-6 py-4">
                                                {loan.start_month}/{loan.start_year}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getStatusBadge(loan.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {loan.status === 'active' && (
                                                        <button 
                                                            onClick={() => handleUpdateStatus(loan.id, 'paused')}
                                                            className="px-2 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 rounded transition text-xs font-medium"
                                                        >
                                                            {isRTL ? 'إيقاف مؤقت' : 'Pause'}
                                                        </button>
                                                    )}
                                                    {loan.status === 'paused' && (
                                                        <button 
                                                            onClick={() => handleUpdateStatus(loan.id, 'active')}
                                                            className="px-2 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded transition text-xs font-medium"
                                                        >
                                                            {isRTL ? 'استئناف' : 'Resume'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-surface-200 dark:border-surface-800">
                        <div className="p-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-between items-center">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Wallet size={20} className="text-violet-600" />
                                {isRTL ? 'إضافة سلفة جديدة' : 'New Loan'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleApplyLoan} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'الموظف' : 'Employee'} <span className="text-rose-500">*</span></label>
                                <select 
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                    required
                                >
                                    <option value="" disabled>{isRTL ? 'اختر الموظف' : 'Select Employee'}</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name} ({parseFloat(emp.base_salary).toLocaleString()} SAR)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'المبلغ الإجمالي' : 'Total Amount'} <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        step="0.01"
                                        value={totalAmount}
                                        onChange={(e) => setTotalAmount(e.target.value)}
                                        className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'عدد الأقساط' : 'Installments'} <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        max="60"
                                        value={installmentsCount}
                                        onChange={(e) => setInstallmentsCount(e.target.value)}
                                        className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                        placeholder="1"
                                        required
                                    />
                                </div>
                            </div>
                            
                            {/* Installment preview */}
                            {totalAmount && installmentsCount && parseInt(installmentsCount) > 0 && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg flex justify-between items-center text-sm">
                                    <span className="text-blue-800 dark:text-blue-300">{isRTL ? 'قيمة القسط الشهري:' : 'Monthly Installment:'}</span>
                                    <span className="font-bold font-mono text-blue-700 dark:text-blue-400">
                                        {(parseFloat(totalAmount) / parseInt(installmentsCount)).toLocaleString('en-US', {minimumFractionDigits: 2})} SAR
                                    </span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'شهر البدء' : 'Start Month'} <span className="text-rose-500">*</span></label>
                                    <select 
                                        value={startMonth}
                                        onChange={(e) => setStartMonth(parseInt(e.target.value))}
                                        className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                    >
                                        {Array.from({length: 12}).map((_, i) => (
                                            <option key={i+1} value={i+1}>{isRTL ? `شهر ${i+1}` : `Month ${i+1}`}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'سنة البدء' : 'Start Year'} <span className="text-rose-500">*</span></label>
                                    <select 
                                        value={startYear}
                                        onChange={(e) => setStartYear(parseInt(e.target.value))}
                                        className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                    >
                                        {[new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'السبب / التفاصيل' : 'Reason / Details'}</label>
                                <textarea 
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500 resize-none h-20"
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:bg-surface-800 rounded-lg font-medium transition"
                                >
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium shadow-sm transition flex items-center gap-2"
                                >
                                    <Check size={18} />
                                    {isRTL ? 'حفظ السلفة' : 'Save Loan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
