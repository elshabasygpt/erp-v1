'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { hrApi } from '@/lib/api';
import AddLoanModal from './AddLoanModal';

interface EmployeeLoansContentProps {
    dict: any;
    locale: string;
}

export default function EmployeeLoansContent({ dict, locale }: EmployeeLoansContentProps) {
    const isRTL = locale === 'ar';
    const queryClient = useQueryClient();
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

    const { data: loans = [], isLoading: loading } = useQuery<any[]>({
        queryKey: ['loans', 'list', filterStatus],
        queryFn: async () => {
            const res = await hrApi.getLoans({ status: filterStatus !== 'all' ? (filterStatus as any) : undefined });
            return res.data.data.data;
        },
    });

    const { data: summary } = useQuery({
        queryKey: ['loans', 'summary'],
        queryFn: async () => {
            const res = await hrApi.getLoansSummary();
            return res.data.data;
        },
    });

    const { data: employees = [] } = useQuery<any[]>({
        queryKey: ['employees', 'list', { limit: 1000 }],
        queryFn: async () => {
            const res = await hrApi.getEmployees({ limit: 1000 });
            return res.data.data.data || res.data.data;
        },
    });

    const { data: selectedLoan = null } = useQuery({
        queryKey: ['loans', 'detail', selectedLoanId],
        queryFn: async () => {
            const res = await hrApi.getLoan(selectedLoanId as string);
            return res.data.data;
        },
        enabled: !!selectedLoanId,
    });

    const refreshLoans = () => queryClient.invalidateQueries({ queryKey: ['loans'] });

    const handleCreateLoan = async (data: any) => {
        await hrApi.createLoan(data);
        setIsAddModalOpen(false);
        refreshLoans();
    };

    const handleUpdateStatus = async (id: string, status: 'active' | 'paused' | 'cancelled') => {
        if (!confirm(isRTL ? 'هل أنت متأكد من تغيير حالة السلفة؟' : 'Are you sure you want to change loan status?')) return;
        await hrApi.updateLoanStatus(id, { status });
        refreshLoans();
    };

    const handleSkipInstallment = async (id: string) => {
        if (!confirm(isRTL ? 'هل أنت متأكد من تأجيل هذا القسط للشهر التالي؟' : 'Are you sure you want to skip this installment?')) return;
        await hrApi.skipInstallment(id);
        if (selectedLoanId) {
            queryClient.invalidateQueries({ queryKey: ['loans', 'detail', selectedLoanId] });
        }
    };

    const openDetails = (id: string) => {
        setSelectedLoanId(id);
    };

    const statusConfig: Record<string, { label: string; labelEn: string; className: string }> = {
        active:    { label: 'نشط',    labelEn: 'Active',    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        completed: { label: 'مكتمل',  labelEn: 'Completed', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        paused:    { label: 'موقوف',  labelEn: 'Paused',    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        cancelled: { label: 'ملغي',   labelEn: 'Cancelled', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>💰</span> {isRTL ? 'السلف والتقسيط' : 'Loans & Installments'}
                </h1>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {isRTL ? 'منح سلفة جديدة' : 'Grant New Loan'}
                </button>
            </div>

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'سلف نشطة' : 'Active Loans'}</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.active_loans}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'إجمالي مُعطى' : 'Total Given'}</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_given.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'متبقي' : 'Remaining'}</div>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.total_remaining.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'هذا الشهر' : 'This Month Deductions'}</div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.this_month_deductions.toLocaleString()}</div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto">
                    {['all', 'active', 'completed', 'paused'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                                filterStatus === status
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            {status === 'all' ? (isRTL ? 'الكل' : 'All') : isRTL ? statusConfig[status].label : statusConfig[status].labelEn}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4">{isRTL ? 'رقم السلفة' : 'Loan Number'}</th>
                                <th className="px-6 py-4">{isRTL ? 'الموظف' : 'Employee'}</th>
                                <th className="px-6 py-4">{isRTL ? 'المبلغ' : 'Amount'}</th>
                                <th className="px-6 py-4">{isRTL ? 'الأقساط' : 'Installments'}</th>
                                <th className="px-6 py-4">{isRTL ? 'تقدم السداد' : 'Progress'}</th>
                                <th className="px-6 py-4">{isRTL ? 'الحالة' : 'Status'}</th>
                                <th className="px-6 py-4 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        {isRTL ? 'جاري التحميل...' : 'Loading...'}
                                    </td>
                                </tr>
                            ) : loans.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        {isRTL ? 'لا توجد سلف' : 'No loans found'}
                                    </td>
                                </tr>
                            ) : (
                                loans.map((loan) => (
                                    <tr key={loan.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 font-medium">{loan.loan_number}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {loan.employee?.name}
                                            </div>
                                            <div className="text-xs text-gray-500">{loan.employee?.position}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{parseFloat(loan.total_amount).toLocaleString()}</div>
                                            <div className="text-xs text-gray-500">{parseFloat(loan.installment_amount).toLocaleString()} / {isRTL ? 'شهر' : 'mo'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {loan.installments_count - loan.pending_count} / {loan.installments_count}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 min-w-[120px]">
                                                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${
                                                            loan.repayment_percentage >= 100 ? 'bg-green-500' :
                                                            loan.repayment_percentage >= 50  ? 'bg-blue-500'  : 'bg-amber-500'
                                                        }`}
                                                        style={{ width: `${Math.min(loan.repayment_percentage, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {loan.repayment_percentage}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig[loan.status]?.className}`}>
                                                {isRTL ? statusConfig[loan.status]?.label : statusConfig[loan.status]?.labelEn}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="relative group inline-block">
                                                <button className="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                    </svg>
                                                </button>
                                                <div className="absolute z-10 hidden group-hover:block w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 right-0 top-full">
                                                    <button onClick={() => openDetails(loan.id)} className="w-full text-left rtl:text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        {isRTL ? 'عرض التفاصيل' : 'View Details'}
                                                    </button>
                                                    {loan.status === 'active' && (
                                                        <button onClick={() => handleUpdateStatus(loan.id, 'paused')} className="w-full text-left rtl:text-right px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                                            {isRTL ? 'تعليق السلفة' : 'Pause Loan'}
                                                        </button>
                                                    )}
                                                    {loan.status === 'paused' && (
                                                        <button onClick={() => handleUpdateStatus(loan.id, 'active')} className="w-full text-left rtl:text-right px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                                                            {isRTL ? 'استئناف السلفة' : 'Resume Loan'}
                                                        </button>
                                                    )}
                                                    {(loan.status === 'active' || loan.status === 'paused') && (
                                                        <button onClick={() => handleUpdateStatus(loan.id, 'cancelled')} className="w-full text-left rtl:text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                            {isRTL ? 'إلغاء السلفة' : 'Cancel Loan'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isAddModalOpen && (
                <AddLoanModal
                    employees={employees}
                    isRTL={isRTL}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={handleCreateLoan}
                />
            )}

            <AnimatePresence>
                {selectedLoan && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {isRTL ? 'تفاصيل السلفة' : 'Loan Details'} {selectedLoan.loan_number} — {selectedLoan.employee?.name}
                                </h2>
                                <button onClick={() => setSelectedLoanId(null)} className="text-gray-400 hover:text-gray-500">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'المبلغ الكلي' : 'Total Amount'}</div>
                                        <div className="font-bold text-gray-900 dark:text-white">{parseFloat(selectedLoan.total_amount).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'القسط الشهري' : 'Installment'}</div>
                                        <div className="font-bold text-gray-900 dark:text-white">{parseFloat(selectedLoan.installment_amount).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'عدد الأقساط' : 'Count'}</div>
                                        <div className="font-bold text-gray-900 dark:text-white">{selectedLoan.installments_count}</div>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                                        <div className="text-sm text-amber-600 dark:text-amber-400 mb-1">{isRTL ? 'المتبقي' : 'Remaining'}</div>
                                        <div className="font-bold text-amber-700 dark:text-amber-300">{parseFloat(selectedLoan.remaining_amount).toLocaleString()}</div>
                                    </div>
                                </div>

                                {(selectedLoan.reason || selectedLoan.notes) && (
                                    <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-sm text-gray-700 dark:text-gray-300">
                                        {selectedLoan.reason && <p><span className="font-bold">{isRTL ? 'السبب:' : 'Reason:'}</span> {selectedLoan.reason}</p>}
                                        {selectedLoan.notes && <p className="mt-1"><span className="font-bold">{isRTL ? 'ملاحظات:' : 'Notes:'}</span> {selectedLoan.notes}</p>}
                                    </div>
                                )}

                                <h3 className="font-bold text-lg mb-4">{isRTL ? 'جدول الأقساط' : 'Installments Schedule'}</h3>
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm text-left rtl:text-right">
                                        <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                                            <tr>
                                                <th className="px-4 py-3">#</th>
                                                <th className="px-4 py-3">{isRTL ? 'الشهر' : 'Month'}</th>
                                                <th className="px-4 py-3">{isRTL ? 'المبلغ' : 'Amount'}</th>
                                                <th className="px-4 py-3">{isRTL ? 'الحالة' : 'Status'}</th>
                                                <th className="px-4 py-3 text-center">{isRTL ? 'إجراء' : 'Action'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedLoan.installments?.map((inst: any) => (
                                                <tr key={inst.id} className="border-t border-gray-100 dark:border-gray-700">
                                                    <td className="px-4 py-3 font-medium">{inst.installment_number}</td>
                                                    <td className="px-4 py-3">{inst.month} / {inst.year}</td>
                                                    <td className="px-4 py-3 font-medium">{parseFloat(inst.amount).toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        {inst.status === 'deducted' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                                ✅ {isRTL ? `خُصم في ${inst.payroll?.month}/${inst.payroll?.year}` : 'Deducted'}
                                                            </span>
                                                        )}
                                                        {inst.status === 'pending' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                                ⏳ {isRTL ? 'معلق' : 'Pending'}
                                                            </span>
                                                        )}
                                                        {inst.status === 'skipped' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                                ⏭️ {isRTL ? 'مؤجل' : 'Skipped'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {inst.status === 'pending' && selectedLoan.status === 'active' && (
                                                            <button
                                                                onClick={() => handleSkipInstallment(inst.id)}
                                                                className="text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors dark:bg-amber-900/20 dark:hover:bg-amber-900/40"
                                                            >
                                                                {isRTL ? 'تأجيل' : 'Skip'}
                                                            </button>
                                                        )}
                                                        {inst.status === 'deducted' && (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
