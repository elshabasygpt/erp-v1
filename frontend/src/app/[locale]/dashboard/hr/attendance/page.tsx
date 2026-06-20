"use client";

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { hrApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, Clock, LogIn, LogOut, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function AttendancePage() {
    const { isRTL } = useLanguage();
    const [attendances, setAttendances] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    
    // Check-in modal state
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<'check-in' | 'check-out'>('check-in');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [actionTime, setActionTime] = useState('');
    const [actionNotes, setActionNotes] = useState('');

    useEffect(() => {
        loadData();
    }, [dateFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [attRes, empRes] = await Promise.all([
                hrApi.getAttendance({ date: dateFilter }),
                hrApi.getEmployees()
            ]);
            setAttendances(attRes.data?.data || attRes.data || []);
            setEmployees(empRes.data?.data || empRes.data || []);
        } catch (err) {
            toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAction = (type: 'check-in' | 'check-out', empId?: string) => {
        setActionType(type);
        setSelectedEmployeeId(empId || '');
        const now = new Date();
        const timeString = now.toTimeString().substring(0, 5); // HH:mm
        setActionTime(timeString);
        setActionNotes('');
        setIsActionModalOpen(true);
    };

    const handleSubmitAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployeeId || !actionTime) {
            toast.error(isRTL ? 'يرجى إكمال الحقول المطلوبة' : 'Please fill required fields');
            return;
        }

        try {
            const payload = {
                employee_id: selectedEmployeeId,
                date: dateFilter,
                time: actionTime,
                notes: actionNotes
            };

            if (actionType === 'check-in') {
                await hrApi.checkIn(payload);
                toast.success(isRTL ? 'تم تسجيل الدخول بنجاح' : 'Checked in successfully');
            } else {
                await hrApi.checkOut(payload);
                toast.success(isRTL ? 'تم تسجيل الخروج بنجاح' : 'Checked out successfully');
            }
            
            setIsActionModalOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'حدث خطأ' : 'An error occurred'));
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'absent': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
            case 'late': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            case 'on_leave': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300';
        }
    };

    const getStatusText = (status: string) => {
        const map: any = {
            'present': isRTL ? 'حاضر' : 'Present',
            'absent': isRTL ? 'غائب' : 'Absent',
            'late': isRTL ? 'متأخر' : 'Late',
            'on_leave': isRTL ? 'في إجازة' : 'On Leave'
        };
        return map[status] || status;
    };

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1">{isRTL ? 'سجل الحضور والانصراف' : 'Attendance Log'}</h1>
                    <p className="text-surface-500 text-sm">
                        {isRTL ? 'تتبع حضور الموظفين وأوقات الدخول والخروج' : 'Track employee attendance and check-ins/outs'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500 text-sm"
                    />
                    <button 
                        onClick={() => handleOpenAction('check-in')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2"
                    >
                        <LogIn size={16} />
                        {isRTL ? 'تسجيل دخول' : 'Check In'}
                    </button>
                    <button 
                        onClick={() => handleOpenAction('check-out')}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2"
                    >
                        <LogOut size={16} />
                        {isRTL ? 'تسجيل خروج' : 'Check Out'}
                    </button>
                </div>
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
                                    <th className="px-6 py-4 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'وقت الدخول' : 'Check In'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'وقت الخروج' : 'Check Out'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'التأخير (دقائق)' : 'Late (Mins)'}</th>
                                    <th className="px-6 py-4 text-start">{isRTL ? 'ملاحظات' : 'Notes'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendances.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                                            {isRTL ? 'لا يوجد سجلات حضور لهذا اليوم' : 'No attendance records for this date'}
                                        </td>
                                    </tr>
                                ) : (
                                    attendances.map(att => (
                                        <tr key={att.id} className="border-b border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-surface-900 dark:text-surface-100">
                                                    {att.employee?.name || 'Unknown'}
                                                </div>
                                                <div className="text-xs text-surface-500">
                                                    {att.employee?.position || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(att.status)}`}>
                                                    {getStatusText(att.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono">
                                                {att.check_in ? att.check_in.substring(0, 5) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono">
                                                {att.check_out ? att.check_out.substring(0, 5) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {att.late_minutes > 0 ? (
                                                    <span className="text-rose-600 dark:text-rose-400 font-bold">{att.late_minutes}</span>
                                                ) : (
                                                    <span className="text-surface-400">0</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-surface-500 text-xs max-w-xs truncate" title={att.notes}>
                                                {att.notes || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {isActionModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-surface-200 dark:border-surface-800">
                        <div className={`p-4 flex items-center gap-3 text-white ${actionType === 'check-in' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                            {actionType === 'check-in' ? <LogIn size={20} /> : <LogOut size={20} />}
                            <h2 className="font-bold text-lg">
                                {actionType === 'check-in' 
                                    ? (isRTL ? 'تسجيل دخول (Check In)' : 'Check In')
                                    : (isRTL ? 'تسجيل خروج (Check Out)' : 'Check Out')}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmitAction} className="p-5 space-y-4">
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
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'الوقت' : 'Time'} <span className="text-rose-500">*</span></label>
                                <input 
                                    type="time" 
                                    value={actionTime}
                                    onChange={(e) => setActionTime(e.target.value)}
                                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                                <textarea 
                                    value={actionNotes}
                                    onChange={(e) => setActionNotes(e.target.value)}
                                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500 resize-none h-20"
                                    placeholder={isRTL ? 'اكتب ملاحظاتك هنا...' : 'Write notes here...'}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-800">
                                <button
                                    type="button"
                                    onClick={() => setIsActionModalOpen(false)}
                                    className="px-4 py-2 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg font-medium transition"
                                >
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    className={`px-4 py-2 text-white rounded-lg font-medium shadow-sm transition ${actionType === 'check-in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
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
