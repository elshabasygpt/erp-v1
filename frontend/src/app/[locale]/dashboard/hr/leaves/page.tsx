"use client";

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { hrApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Check, X, Clock, Calendar } from 'lucide-react';

export default function LeavesPage() {
    const { isRTL } = useLanguage();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [type, setType] = useState('annual');
    const [reason, setReason] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [leavesRes, empRes] = await Promise.all([
                hrApi.getLeaves(),
                hrApi.getEmployees()
            ]);
            setLeaves(leavesRes.data?.data || leavesRes.data || []);
            setEmployees(empRes.data?.data || empRes.data || []);
        } catch (err) {
            toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await hrApi.applyLeave({
                employee_id: selectedEmployeeId,
                start_date: startDate,
                end_date: endDate,
                type,
                reason
            });
            toast.success(isRTL ? 'تم تسجيل طلب الإجازة بنجاح' : 'Leave request submitted');
            setIsModalOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشل إرسال الطلب' : 'Failed to submit request'));
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await hrApi.updateLeaveStatus(id, status);
            toast.success(isRTL ? 'تم تحديث حالة الطلب' : 'Status updated');
            loadData();
        } catch (err) {
            toast.error(isRTL ? 'فشل تحديث الحالة' : 'Failed to update status');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 w-max"><Check size={12}/> {isRTL ? 'مقبول' : 'Approved'}</span>;
            case 'rejected': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1 w-max"><X size={12}/> {isRTL ? 'مرفوض' : 'Rejected'}</span>;
            case 'pending': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1 w-max"><Clock size={12}/> {isRTL ? 'قيد الانتظار' : 'Pending'}</span>;
            default: return null;
        }
    };

    const getTypeLabel = (type: string) => {
        const map: any = {
            'annual': isRTL ? 'سنوية' : 'Annual',
            'sick': isRTL ? 'مرضية' : 'Sick',
            'unpaid': isRTL ? 'غير مدفوعة' : 'Unpaid',
            'other': isRTL ? 'أخرى' : 'Other'
        };
        return map[type] || type;
    };

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1">{isRTL ? 'إدارة الإجازات' : 'Leave Management'}</h1>
                    <p className="text-surface-500 text-sm">
                        {isRTL ? 'طلبات إجازات الموظفين واعتماداتها' : 'Employee leave requests and approvals'}
                    </p>
                </div>
                <button 
                    onClick={() => {
                        setSelectedEmployeeId('');
                        setStartDate('');
                        setEndDate('');
                        setType('annual');
                        setReason('');
                        setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    {isRTL ? 'إضافة إجازة' : 'Add Leave'}
                </button>
            </div>

            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-surface-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-500 border-b border-surface-200 dark:border-surface-800 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'الموظف' : 'Employee'}</th>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'النوع' : 'Type'}</th>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'المدة' : 'Duration'}</th>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'الحالة' : 'Status'}</th>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'ملاحظات' : 'Reason'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                                            {isRTL ? 'لا توجد طلبات إجازة' : 'No leave requests found'}
                                        </td>
                                    </tr>
                                ) : (
                                    leaves.map(leave => (
                                        <tr key={leave.id} className="border-b border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-surface-900 dark:text-surface-100">
                                                    {leave.employee?.name || 'Unknown'}
                                                </div>
                                                <div className="text-xs text-surface-500">
                                                    {leave.employee?.position || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-surface-700 dark:text-surface-300">
                                                    <Calendar size={14} className="text-surface-400" />
                                                    {getTypeLabel(leave.type)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium">{leave.start_date}</div>
                                                <div className="text-xs text-surface-500">
                                                    {isRTL ? 'إلى' : 'to'} {leave.end_date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(leave.status)}
                                            </td>
                                            <td className="px-6 py-4 text-surface-500 text-xs max-w-[200px] truncate" title={leave.reason}>
                                                {leave.reason || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {leave.status === 'pending' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleUpdateStatus(leave.id, 'approved')}
                                                                className="px-2 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 rounded transition text-xs font-medium flex items-center gap-1"
                                                            >
                                                                <Check size={14} /> {isRTL ? 'قبول' : 'Approve'}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleUpdateStatus(leave.id, 'rejected')}
                                                                className="px-2 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 rounded transition text-xs font-medium flex items-center gap-1"
                                                            >
                                                                <X size={14} /> {isRTL ? 'رفض' : 'Reject'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-surface-200 dark:border-surface-800">
                        <div className="p-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-between items-center">
                            <h2 className="font-bold text-lg">{isRTL ? 'طلب إجازة جديد' : 'New Leave Request'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleApplyLeave} className="p-5 space-y-4">
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
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'من تاريخ' : 'Start Date'} <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'إلى تاريخ' : 'End Date'} <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'نوع الإجازة' : 'Leave Type'} <span className="text-rose-500">*</span></label>
                                <select 
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                    required
                                >
                                    <option value="annual">{isRTL ? 'سنوية' : 'Annual'}</option>
                                    <option value="sick">{isRTL ? 'مرضية' : 'Sick'}</option>
                                    <option value="unpaid">{isRTL ? 'غير مدفوعة' : 'Unpaid'}</option>
                                    <option value="other">{isRTL ? 'أخرى' : 'Other'}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'السبب' : 'Reason'}</label>
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
                                    className="px-4 py-2 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg font-medium transition"
                                >
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium shadow-sm transition"
                                >
                                    {isRTL ? 'حفظ' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
