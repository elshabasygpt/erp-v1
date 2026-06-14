"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { hrApi, usersApi } from '@/lib/api';

export default function EmployeesPage() {
    const { d, isRTL } = useLanguage();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<any>({
        name: '', position: '', phone: '', base_salary: 0, shift_start: '09:00', shift_end: '17:00', is_active: true, user_id: ''
    });
    
    // Quick fetch users if we want to link employee to a system user
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
        fetchUsers();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await hrApi.getEmployees({ limit: 100 });
            setEmployees(res.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await usersApi.getUsers({ limit: 50 });
            setUsers(res.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await hrApi.updateEmployee(formData.id, formData);
                showToast(isRTL ? 'تم تحديث بيانات الموظف ✓' : 'Employee updated ✓');
            } else {
                await hrApi.createEmployee(formData);
                showToast(isRTL ? 'تم إضافة الموظف بنجاح ✓' : 'Employee added ✓');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            showToast(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving employee', 'error');
        }
    };

    const handleDelete = async (emp: any) => {
        if (!confirm(isRTL ? `هل أنت متأكد من حذف "${emp.name}"?` : `Delete employee "${emp.name}"?`)) return;
        try {
            await hrApi.deleteEmployee(emp.id);
            showToast(isRTL ? 'تم حذف الموظف بنجاح' : 'Employee deleted');
            fetchData();
        } catch (err: any) {
            showToast(err?.response?.data?.message || (isRTL ? 'فشل الحذف' : 'Delete failed'), 'error');
        }
    };

    const handleEdit = (emp: any) => {
        setFormData({ ...emp });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in p-4 sm:p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-[200] px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold flex items-center gap-2 animate-scale-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}
            <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-primary-500">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        {d.hr?.employees || (isRTL ? 'الموظفين' : 'Employees')}
                    </h1>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                        {d.hr?.title || (isRTL ? 'إدارة الموارد البشرية وبيانات الموظفين' : 'Human Resources and Employee Data Management')}
                    </p>
                </div>
                <button
                    onClick={() => { setFormData({ name: '', position: '', phone: '', base_salary: 0, shift_start: '09:00', shift_end: '17:00', is_active: true, user_id: '' }); setIsModalOpen(true); }}
                    className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/30"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {d.hr?.addEmployee || (isRTL ? 'إضافة موظف' : 'Add Employee')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    { label: isRTL ? 'إجمالي الموظفين' : 'Total Employees', value: employees.length, icon: '👥', gradient: 'from-blue-500/20 to-blue-600/5', color: 'text-blue-500' },
                    { label: isRTL ? 'موظفين نشطين' : 'Active Employees', value: employees.filter(e => e.is_active).length, icon: '🟢', gradient: 'from-emerald-500/20 to-emerald-600/5', color: 'text-emerald-500' },
                    { label: isRTL ? 'متوسط الرواتب' : 'Average Salary', value: employees.length ? (employees.reduce((s, e) => s + parseFloat(e.base_salary || 0), 0) / employees.length).toFixed(0) : '0', icon: '💰', gradient: 'from-purple-500/20 to-purple-600/5', color: 'text-purple-500' },
                ].map((st, i) => (
                    <div key={i} className="stat-card relative overflow-hidden group">
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${st.gradient} opacity-50 transition-opacity group-hover:opacity-100`} />
                        <div className="relative flex items-start justify-between p-2">
                            <div>
                                <p className="text-sm font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{st.label}</p>
                                <p className={`text-3xl font-black ${st.color}`}>{st.value}</p>
                            </div>
                            <span className="text-4xl opacity-80 group-hover:scale-110 transition-transform">{st.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        📋 {isRTL ? 'قائمة الموظفين' : 'Employee Directory'}
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
                                    <th>{d.hr?.position || (isRTL ? 'المسمى الوظيفي' : 'Position')}</th>
                                    <th>{d.hr?.baseSalary || (isRTL ? 'الراتب الأساسي' : 'Base Salary')}</th>
                                    <th>{isRTL ? 'أوقات الدوام (Shift)' : 'Shift'}</th>
                                    <th>{d.hr?.status || (isRTL ? 'الحالة' : 'Status')}</th>
                                    <th className="text-center">{d.hr?.actions || (isRTL ? 'إجراءات' : 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.id} className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800">
                                        <td>
                                            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{emp.name}</div>
                                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{emp.phone || '-'}</div>
                                        </td>
                                        <td>
                                            <span className="px-2 py-1 bg-surface-100 dark:bg-surface-800 rounded-md font-medium text-xs border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                                                {emp.position || '-'}
                                            </span>
                                        </td>
                                        <td className="font-bold text-primary-600 dark:text-primary-400">
                                            {parseFloat(emp.base_salary).toFixed(2)}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1.5 text-xs font-mono bg-surface-50 dark:bg-surface-900 w-max px-2 py-1 rounded border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                                                <span>{emp.shift_start?.slice(0,5)}</span>
                                                <span className="text-surface-400">→</span>
                                                <span>{emp.shift_end?.slice(0,5)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {emp.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    {isRTL ? 'نشط' : 'Active'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                    {isRTL ? 'غير نشط' : 'Inactive'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleEdit(emp)} 
                                                    className="btn-icon text-primary-500 hover:text-primary-600 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50"
                                                    title={d.common?.edit || 'Edit'}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(emp)} 
                                                    className="btn-icon text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50"
                                                    title={isRTL ? 'حذف' : 'Delete'}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {employees.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={6}>
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <span className="text-5xl mb-3 grayscale opacity-40">📇</span>
                                                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {isRTL ? 'لا يوجد موظفين مسجلين' : 'No employees registered.'}
                                                </p>
                                                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                                    {isRTL ? 'انقر على "إضافة موظف" للبدء' : 'Click "Add Employee" to begin.'}
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
                        <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-default)' }}>
                            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <span className="text-xl">{formData.id ? '✏️' : '➕'}</span>
                                {formData.id ? (d.hr?.editEmployee || (isRTL ? 'تعديل بيانات الموظف' : 'Edit Employee')) : (d.hr?.addEmployee || (isRTL ? 'إضافة موظف جديد' : 'Add Employee'))}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{d.hr?.employeeName || (isRTL ? 'اسم الموظف' : 'Name')}</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field py-2.5 w-full" required />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{d.hr?.position || (isRTL ? 'المسمى الوظيفي' : 'Position')}</label>
                                    <input type="text" value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} className="input-field py-2.5 w-full" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{d.hr?.baseSalary || (isRTL ? 'الراتب الأساسي' : 'Base Salary')}</label>
                                    <input type="number" step="0.01" value={formData.base_salary} onChange={(e) => setFormData({...formData, base_salary: e.target.value})} className="input-field py-2.5 w-full" required />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border" style={{ borderColor: 'var(--border-default)' }}>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{d.hr?.shiftStart || (isRTL ? 'وقت الحضور' : 'Shift Start')}</label>
                                    <input type="time" value={formData.shift_start} onChange={(e) => setFormData({...formData, shift_start: e.target.value})} className="input-field py-2 w-full text-center font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{d.hr?.shiftEnd || (isRTL ? 'وقت الانصراف' : 'Shift End')}</label>
                                    <input type="time" value={formData.shift_end} onChange={(e) => setFormData({...formData, shift_end: e.target.value})} className="input-field py-2 w-full text-center font-mono" />
                                </div>
                            </div>
                            
                            <div className="pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'ربط بحساب مستخدم (اختياري)' : 'Link to System User (Optional)'}</label>
                                <select value={formData.user_id || ''} onChange={(e) => setFormData({...formData, user_id: e.target.value})} className="select-field py-2.5 w-full">
                                    <option value="">-- {isRTL ? 'بدون ربط' : 'None'} --</option>
                                    {users.map((u: any) => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex items-center gap-2 pt-2">
                                <input 
                                    type="checkbox" 
                                    id="is_active" 
                                    checked={formData.is_active} 
                                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})} 
                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                                    {isRTL ? 'حالة الموظف نشطة (على رأس العمل)' : 'Employee is Active'}
                                </label>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3 border-t mt-6" style={{ borderColor: 'var(--border-default)' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                                    {d.common?.cancel || (isRTL ? 'إلغاء' : 'Cancel')}
                                </button>
                                <button type="submit" className="btn-primary shadow-lg shadow-primary-500/30">
                                    {d.common?.save || (isRTL ? 'حفظ البيانات' : 'Save Details')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
