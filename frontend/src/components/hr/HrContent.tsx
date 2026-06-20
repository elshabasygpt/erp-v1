'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function HrContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'leaves' | 'payroll'>('employees');

    // Modals
    const [showEmpModal, setShowEmpModal] = useState(false);
    const [newEmp, setNewEmp] = useState({ name: '', position: '', phone: '', base_salary: 0, shift_start: '09:00', shift_end: '17:00' });

    const [showAttModal, setShowAttModal] = useState(false);
    const [newAtt, setNewAtt] = useState({ employee_id: '', type: 'check_in', time: '' });

    const [showPayModal, setShowPayModal] = useState(false);
    const [payData, setPayData] = useState({ employee_id: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });

    const { data: employees = [], isLoading: loadingEmployees } = useQuery<any[]>({
        queryKey: ['hr', 'employees'],
        queryFn: async () => {
            const res = await hrApi.getEmployees();
            return res.data?.data || [];
        },
    });

    const { data: attendances = [], isLoading: loadingAttendance } = useQuery<any[]>({
        queryKey: ['hr', 'attendance'],
        queryFn: async () => {
            const res = await hrApi.getAttendance();
            return res.data?.data || [];
        },
        enabled: activeTab === 'attendance',
    });

    const { data: payrolls = [], isLoading: loadingPayroll } = useQuery<any[]>({
        queryKey: ['hr', 'payrolls'],
        queryFn: async () => {
            const res = await hrApi.getPayrolls();
            return res.data?.data || [];
        },
        enabled: activeTab === 'payroll',
    });

    const loading = activeTab === 'employees' ? loadingEmployees : activeTab === 'attendance' ? loadingAttendance : activeTab === 'payroll' ? loadingPayroll : false;

    const fetchData = () => {
        queryClient.invalidateQueries({ queryKey: ['hr'] });
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(val || 0);

    const handleCreateEmployee = async () => {
        try {
            await hrApi.createEmployee(newEmp);
            setShowEmpModal(false);
            fetchData();
        } catch (e) {

        }
    };

    const handleRecordAttendance = async () => {
        try {
            if (newAtt.type === 'check_in') {
                await hrApi.checkIn({ employee_id: newAtt.employee_id, time: newAtt.time || undefined });
            } else {
                await hrApi.checkOut({ employee_id: newAtt.employee_id, time: newAtt.time || undefined });
            }
            setShowAttModal(false);
            fetchData();
        } catch (e) {

            toast.error("Attendance action failed. Ensure the employee has checked in today if checking out.");
        }
    };

    const handleGeneratePayroll = async () => {
        try {
            await hrApi.generatePayroll(payData);
            setShowPayModal(false);
            fetchData();
        } catch (e) {

        }
    };

    const handlePayPayroll = async (payrollId: string) => {
        const safeId = prompt(isRTL ? "أدخل ID الخزينة لدفع الراتب (للتبسيط، انسخ ID من صفحة الحسابات):" : "Enter Safe ID to pay from:");
        if (!safeId) return;
        try {
            await hrApi.markPayrollAsPaid(payrollId);
            fetchData();
        } catch (e) {

            toast.error("Failed to pay payroll. Check safe balance.");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'نظام الموارد البشرية (HR)' : 'Human Resources (HR)'}
                    </h1>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'employees' && (
                        <button onClick={() => setShowEmpModal(true)} className="btn-primary">
                            + {isRTL ? 'إضافة موظف' : 'Add Employee'}
                        </button>
                    )}
                    {activeTab === 'attendance' && (
                        <button onClick={() => setShowAttModal(true)} className="btn-secondary">
                            🕒 {isRTL ? 'تسجيل حضور / انصراف' : 'Log Attendance'}
                        </button>
                    )}
                    {activeTab === 'payroll' && (
                        <button onClick={() => setShowPayModal(true)} className="btn-danger">
                            💰 {isRTL ? 'إصدار راتب' : 'Generate Payroll'}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 space-x-1 rtl:space-x-reverse rounded-xl" style={{ background: 'var(--bg-surface-secondary)' }}>
                {['employees', 'attendance', 'leaves', 'payroll'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`
                            flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300
                            ${activeTab === tab ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'text-surface-400 hover:text-white hover:bg-surface-800'}
                        `}
                    >
                        {isRTL 
                            ? (tab === 'employees' ? 'الموظفين' : tab === 'attendance' ? 'الحضور والانصراف' : tab === 'leaves' ? 'الإجازات' : 'مسيرات الرواتب')
                            : (tab === 'employees' ? 'Employees' : tab === 'attendance' ? 'Attendance' : tab === 'leaves' ? 'Leaves' : 'Payrolls')}
                    </button>
                ))}
            </div>

            {/* Employees Tab */}
            {activeTab === 'employees' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loading ? <p>Loading...</p> : employees.map(emp => (
                        <div key={emp.id} className="glass-card p-6 border-l-4 border-primary-500">
                            <h3 className="text-lg font-bold text-white">{emp.name}</h3>
                            <p className="text-sm opacity-70 mt-1">{emp.position || 'Employee'}</p>
                            <div className="mt-4 text-sm bg-white/5 p-3 rounded">
                                <p><strong>{isRTL ? 'الراتب الأساسي:' : 'Base Salary:'}</strong> {formatCurrency(emp.base_salary)}</p>
                                <p><strong>{isRTL ? 'وردية الدوام:' : 'Shift:'}</strong> {emp.shift_start} - {emp.shift_end}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
                <div className="glass-card p-6">
                    {loading ? <p>Loading...</p> : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{isRTL ? 'الموظف' : 'Employee'}</th>
                                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                    <th>{isRTL ? 'دخول' : 'Check In'}</th>
                                    <th>{isRTL ? 'خروج' : 'Check Out'}</th>
                                    <th>{isRTL ? 'دقائق التأخير' : 'Late (Mins)'}</th>
                                    <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendances.map(att => (
                                    <tr key={att.id}>
                                        <td>{att.employee?.name}</td>
                                        <td>{att.date}</td>
                                        <td className="text-blue-400 font-mono">{att.check_in || '---'}</td>
                                        <td className="text-green-400 font-mono">{att.check_out || '---'}</td>
                                        <td className={att.late_minutes > 0 ? "text-red-400 font-bold" : ""}>{att.late_minutes}</td>
                                        <td>
                                            <span className={`px-2 py-1 text-xs rounded uppercase ${att.status === 'late' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                                {att.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Payrolls Tab */}
            {activeTab === 'payroll' && (
                <div className="glass-card p-6">
                    {loading ? <p>Loading...</p> : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{isRTL ? 'الموظف' : 'Employee'}</th>
                                    <th>{isRTL ? 'الشهر/السنة' : 'Period'}</th>
                                    <th>{isRTL ? 'الأساسي' : 'Base'}</th>
                                    <th>{isRTL ? 'الخصومات' : 'Deductions'}</th>
                                    <th>{isRTL ? 'الصافي' : 'Net Salary'}</th>
                                    <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                    <th>{isRTL ? 'إجراء' : 'Action'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrolls.map(pay => (
                                    <tr key={pay.id}>
                                        <td className="font-bold">{pay.employee?.name}</td>
                                        <td>{pay.month} / {pay.year}</td>
                                        <td>{formatCurrency(pay.base_salary)}</td>
                                        <td className="text-red-400">-{formatCurrency(pay.deductions)}</td>
                                        <td className="text-green-400 font-bold">{formatCurrency(pay.net_salary)}</td>
                                        <td>
                                            <span className={`px-2 py-1 text-xs rounded uppercase ${pay.status === 'paid' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                {pay.status}
                                            </span>
                                        </td>
                                        <td>
                                            {pay.status === 'draft' && (
                                                <button onClick={() => handlePayPayroll(pay.id)} className="btn-primary text-xs py-1">
                                                    {isRTL ? 'دفع الآن' : 'Pay Now'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'leaves' && (
                <div className="glass-card p-12 text-center text-surface-400">
                    {isRTL ? 'نظام الإجازات قيد التطوير' : 'Leaves module under development'}
                </div>
            )}

            {/* Modals */}
            {showEmpModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEmpModal(false)}>
                    <div className="modal-content max-w-sm p-6">
                        <h2 className="text-xl font-bold mb-4">{isRTL ? 'إضافة موظف' : 'Add Employee'}</h2>
                        <div className="space-y-4">
                            <input className="input-field" placeholder={isRTL ? 'الاسم' : 'Name'} value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} />
                            <input className="input-field" placeholder={isRTL ? 'المسمى الوظيفي' : 'Position'} value={newEmp.position} onChange={e => setNewEmp({...newEmp, position: e.target.value})} />
                            <input className="input-field" type="number" placeholder={isRTL ? 'الراتب الأساسي' : 'Base Salary'} value={newEmp.base_salary} onChange={e => setNewEmp({...newEmp, base_salary: parseFloat(e.target.value) || 0})} />
                            <div className="flex gap-2">
                                <input className="input-field" type="time" title="Shift Start" value={newEmp.shift_start} onChange={e => setNewEmp({...newEmp, shift_start: e.target.value})} />
                                <input className="input-field" type="time" title="Shift End" value={newEmp.shift_end} onChange={e => setNewEmp({...newEmp, shift_end: e.target.value})} />
                            </div>
                            <div className="flex gap-2">
                                <button className="btn-secondary flex-1" onClick={() => setShowEmpModal(false)}>Cancel</button>
                                <button className="btn-primary flex-1" onClick={handleCreateEmployee}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAttModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAttModal(false)}>
                    <div className="modal-content max-w-sm p-6">
                        <h2 className="text-xl font-bold mb-4">{isRTL ? 'تسجيل بصمة/حضور' : 'Log Attendance'}</h2>
                        <div className="space-y-4">
                            <select className="select-field" value={newAtt.employee_id} onChange={e => setNewAtt({...newAtt, employee_id: e.target.value})}>
                                <option value="">{isRTL ? 'اختر الموظف...' : 'Select Employee...'}</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <select className="select-field" value={newAtt.type} onChange={e => setNewAtt({...newAtt, type: e.target.value})}>
                                <option value="check_in">{isRTL ? 'تسجيل دخول (Check In)' : 'Check In'}</option>
                                <option value="check_out">{isRTL ? 'تسجيل خروج (Check Out)' : 'Check Out'}</option>
                            </select>
                            <input className="input-field" type="time" value={newAtt.time} onChange={e => setNewAtt({...newAtt, time: e.target.value})} />
                            <div className="flex gap-2">
                                <button className="btn-secondary flex-1" onClick={() => setShowAttModal(false)}>Cancel</button>
                                <button className="btn-secondary flex-1" onClick={handleRecordAttendance}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPayModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPayModal(false)}>
                    <div className="modal-content max-w-sm p-6">
                        <h2 className="text-xl font-bold mb-4">{isRTL ? 'إصدار راتب الشهر' : 'Generate Payroll'}</h2>
                        <div className="space-y-4">
                            <select className="select-field" value={payData.employee_id} onChange={e => setPayData({...payData, employee_id: e.target.value})}>
                                <option value="">{isRTL ? 'اختر الموظف...' : 'Select Employee...'}</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <input className="input-field" type="number" placeholder="Month (1-12)" value={payData.month} onChange={e => setPayData({...payData, month: parseInt(e.target.value)})} />
                            <input className="input-field" type="number" placeholder="Year" value={payData.year} onChange={e => setPayData({...payData, year: parseInt(e.target.value)})} />
                            <div className="flex gap-2">
                                <button className="btn-secondary flex-1" onClick={() => setShowPayModal(false)}>Cancel</button>
                                <button className="btn-danger flex-1" onClick={handleGeneratePayroll}>Generate</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
