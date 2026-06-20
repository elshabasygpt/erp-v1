"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { hrApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function EmployeeFormModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    employee 
}: any) {
    const { isRTL } = useLanguage();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        position: '',
        phone: '',
        base_salary: '',
        shift_start: '09:00',
        shift_end: '17:00',
        is_active: true
    });

    useEffect(() => {
        if (employee) {
            setFormData({
                name: employee.name || '',
                position: employee.position || '',
                phone: employee.phone || '',
                base_salary: employee.base_salary || '',
                shift_start: employee.shift_start ? employee.shift_start.substring(0, 5) : '',
                shift_end: employee.shift_end ? employee.shift_end.substring(0, 5) : '',
                is_active: employee.is_active ?? true
            });
        } else {
            setFormData({
                name: '',
                position: '',
                phone: '',
                base_salary: '',
                shift_start: '09:00',
                shift_end: '17:00',
                is_active: true
            });
        }
    }, [employee, isOpen]);

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (employee) {
                await hrApi.updateEmployee(employee.id, formData);
                toast.success(isRTL ? 'تم تحديث الموظف بنجاح' : 'Employee updated successfully');
            } else {
                await hrApi.createEmployee(formData);
                toast.success(isRTL ? 'تم إضافة الموظف بنجاح' : 'Employee added successfully');
            }
            onSuccess();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold">
                        {employee 
                            ? (isRTL ? 'تعديل بيانات موظف' : 'Edit Employee') 
                            : (isRTL ? 'إضافة موظف جديد' : 'Add New Employee')}
                    </h2>
                    <button onClick={onClose} className="p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-full transition">✕</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form id="employeeForm" onSubmit={handleSubmit} className="space-y-4 text-sm">
                        
                        <div>
                            <label className="block font-medium mb-1">{isRTL ? 'اسم الموظف' : 'Employee Name'} *</label>
                            <input 
                                required
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange}
                                className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium mb-1">{isRTL ? 'المسمى الوظيفي' : 'Position'} *</label>
                                <input 
                                    required
                                    type="text" 
                                    name="position" 
                                    value={formData.position} 
                                    onChange={handleChange}
                                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">{isRTL ? 'رقم الهاتف' : 'Phone Number'}</label>
                                <input 
                                    type="text" 
                                    name="phone" 
                                    value={formData.phone} 
                                    onChange={handleChange}
                                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-medium mb-1">{isRTL ? 'الراتب الأساسي' : 'Base Salary'} *</label>
                            <div className="relative">
                                <input 
                                    required
                                    type="number" 
                                    step="0.01"
                                    name="base_salary" 
                                    value={formData.base_salary} 
                                    onChange={handleChange}
                                    className={`w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500 ${isRTL ? 'pl-12' : 'pr-12'}`}
                                />
                                <span className={`absolute top-1/2 -translate-y-1/2 text-surface-500 font-medium ${isRTL ? 'left-4' : 'right-4'}`}>
                                    SAR
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium mb-1">{isRTL ? 'بداية الوردية' : 'Shift Start'}</label>
                                <input 
                                    type="time" 
                                    name="shift_start" 
                                    value={formData.shift_start} 
                                    onChange={handleChange}
                                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">{isRTL ? 'نهاية الوردية' : 'Shift End'}</label>
                                <input 
                                    type="time" 
                                    name="shift_end" 
                                    value={formData.shift_end} 
                                    onChange={handleChange}
                                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <input 
                                type="checkbox" 
                                id="is_active"
                                name="is_active" 
                                checked={formData.is_active} 
                                onChange={handleChange}
                                className="w-4 h-4 text-violet-600 rounded cursor-pointer"
                            />
                            <label htmlFor="is_active" className="font-medium cursor-pointer">
                                {isRTL ? 'موظف نشط' : 'Active Employee'}
                            </label>
                        </div>

                    </form>
                </div>

                <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg transition">
                        {isRTL ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button type="submit" form="employeeForm" disabled={loading} className="px-6 py-2 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition shadow-sm disabled:opacity-50">
                        {loading ? '...' : (isRTL ? 'حفظ الموظف' : 'Save Employee')}
                    </button>
                </div>
            </div>
        </div>
    );
}
