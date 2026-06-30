"use client";

import React, { useEffect, useState } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useLanguage } from '@/i18n/LanguageContext';
import { hrApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';
import { Plus, Edit2, Trash2, Search, User } from 'lucide-react';
import EmployeeFormModal from '@/components/hr/EmployeeFormModal';

export default function EmployeesPage() {
    const { isRTL } = useLanguage();
    const confirm = useConfirm();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [search, setSearch] = useState('');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const res = await hrApi.getEmployees();
            setEmployees(res.data?.data || res.data || []);
        } catch (err) {
            setLoadError(true);
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm(isRTL ? 'هل أنت متأكد من حذف هذا الموظف؟' : 'Are you sure you want to delete this employee?')) return;
        
        try {
            await hrApi.deleteEmployee(id);
            toast.success(isRTL ? 'تم حذف الموظف بنجاح' : 'Employee deleted successfully');
            loadEmployees();
        } catch (err) {
            toast.error('Failed to delete employee');
        }
    };

    const handleOpenModal = (employee?: any) => {
        setEditingEmployee(employee || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEmployee(null);
    };

    const handleModalSuccess = () => {
        handleCloseModal();
        loadEmployees();
    };

    const filteredEmployees = employees.filter(emp => 
        (emp.name && emp.name.toLowerCase().includes(search.toLowerCase())) ||
        (emp.position && emp.position.toLowerCase().includes(search.toLowerCase())) ||
        (emp.phone && emp.phone.includes(search))
    );

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1">{isRTL ? 'دليل الموظفين' : 'Employee Directory'}</h1>
                    <p className="text-surface-500 text-sm">
                        {isRTL ? 'إدارة بيانات الموظفين ورواتبهم' : 'Manage your workforce and base salaries.'}
                    </p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    {isRTL ? 'إضافة موظف' : 'Add Employee'}
                </button>
            </div>

            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
                <div className="p-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className={`absolute top-1/2 -translate-y-1/2 text-surface-400 ${isRTL ? 'right-3' : 'left-3'}`} size={18} />
                        <input 
                            type="text" 
                            placeholder={isRTL ? 'البحث بالاسم، الوظيفة أو الهاتف...' : 'Search by name, position or phone...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`w-full p-2.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500 transition-colors ${isRTL ? 'pr-10' : 'pl-10'}`}
                        />
                    </div>
                </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-500 border-b border-surface-200 dark:border-surface-800 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">{isRTL ? 'الموظف' : 'Employee'}</th>
                                    <th className="px-6 py-4">{isRTL ? 'المسمى الوظيفي' : 'Position'}</th>
                                    <th className="px-6 py-4">{isRTL ? 'الراتب الأساسي' : 'Base Salary'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'مواعيد الوردية' : 'Shift'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                                    <th className="px-6 py-4 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={`sk-${i}`} className="border-b border-surface-200 dark:border-surface-800">
                                            {Array.from({ length: 6 }).map((__, j) => (
                                                <td key={j} className="p-3"><Skeleton className="w-3/4 h-4" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : loadError ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center">
                                            <p className="mb-3 text-sm" style={{ color: 'var(--text-danger,#dc2626)' }}>{isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}</p>
                                            <button onClick={() => loadEmployees()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                                        </td>
                                    </tr>
                                ) : filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                                            {isRTL ? 'لا يوجد موظفين' : 'No employees found'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map(emp => (
                                        <tr key={emp.id} className="border-b border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                                                        <User size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold">{emp.name}</div>
                                                        <div className="text-xs text-surface-500">{emp.phone || '-'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-surface-600 dark:text-surface-300">
                                                {emp.position}
                                            </td>
                                            <td className="px-6 py-4 font-mono font-medium">
                                                {parseFloat(emp.base_salary).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                                            </td>
                                            <td className="px-6 py-4 text-center text-surface-500">
                                                {emp.shift_start ? `${emp.shift_start.substring(0,5)} - ${emp.shift_end?.substring(0,5)}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {emp.is_active ? (
                                                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                                                        {isRTL ? 'نشط' : 'Active'}
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                                                        {isRTL ? 'غير نشط' : 'Inactive'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleOpenModal(emp)}
                                                        className="p-2 text-surface-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition"
                                                        title={isRTL ? 'تعديل' : 'Edit'}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(emp.id)}
                                                        className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                        title={isRTL ? 'حذف' : 'Delete'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
            </div>

            <EmployeeFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSuccess={handleModalSuccess}
                employee={editingEmployee}
            />
        </div>
    );
}
