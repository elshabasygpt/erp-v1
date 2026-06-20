"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { accountingApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AccountFormModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    account, 
    parentId,
    allAccounts 
}: any) {
    const { isRTL } = useLanguage();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        name_ar: '',
        type: 'asset',
        parent_id: parentId || '',
        is_active: true,
        description: ''
    });

    useEffect(() => {
        if (account) {
            setFormData({
                code: account.code || '',
                name: account.name || '',
                name_ar: account.name_ar || '',
                type: account.type || 'asset',
                parent_id: account.parent_id || '',
                is_active: account.is_active ?? true,
                description: account.description || ''
            });
        }
    }, [account]);

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
            if (account) {
                await accountingApi.updateAccount(account.id, formData);
                toast.success(isRTL ? 'تم تحديث الحساب بنجاح' : 'Account updated successfully');
            } else {
                await accountingApi.createAccount(formData);
                toast.success(isRTL ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully');
            }
            onSuccess();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Helper to flatten tree for the select dropdown
    const flattenAccounts = (nodes: any[], level = 0): {id: string, name: string, code: string, level: number}[] => {
        let result: any[] = [];
        nodes.forEach(node => {
            // Don't show the currently editing account as a potential parent for itself
            if (account && node.id === account.id) return;

            result.push({
                id: node.id,
                name: isRTL ? node.name_ar : node.name,
                code: node.code,
                level
            });
            if (node.children && node.children.length > 0) {
                result = result.concat(flattenAccounts(node.children, level + 1));
            }
        });
        return result;
    };

    const flatAccounts = flattenAccounts(allAccounts || []);

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold">
                        {account 
                            ? (isRTL ? 'تعديل حساب' : 'Edit Account') 
                            : (parentId ? (isRTL ? 'إضافة حساب فرعي' : 'Add Sub-Account') : (isRTL ? 'إضافة حساب رئيسي' : 'Add Root Account'))}
                    </h2>
                    <button onClick={onClose} className="p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-full transition">✕</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form id="accountForm" onSubmit={handleSubmit} className="space-y-4 text-sm">
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium mb-1">{isRTL ? 'كود الحساب' : 'Account Code'} *</label>
                                <input 
                                    required
                                    type="text" 
                                    name="code" 
                                    value={formData.code} 
                                    onChange={handleChange}
                                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">{isRTL ? 'نوع الحساب' : 'Account Type'} *</label>
                                <select 
                                    name="type" 
                                    value={formData.type} 
                                    onChange={handleChange}
                                    disabled={!!formData.parent_id} // Child inherits parent type
                                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500 disabled:opacity-50"
                                >
                                    <option value="asset">{isRTL ? 'أصول' : 'Asset'}</option>
                                    <option value="liability">{isRTL ? 'خصوم' : 'Liability'}</option>
                                    <option value="equity">{isRTL ? 'حقوق الملكية' : 'Equity'}</option>
                                    <option value="revenue">{isRTL ? 'إيرادات' : 'Revenue'}</option>
                                    <option value="expense">{isRTL ? 'مصروفات' : 'Expense'}</option>
                                </select>
                                {formData.parent_id && <p className="text-[10px] text-surface-400 mt-1">{isRTL ? 'موروث من الحساب الرئيسي' : 'Inherited from parent'}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block font-medium mb-1">{isRTL ? 'اسم الحساب (إنجليزي)' : 'Account Name (En)'} *</label>
                            <input 
                                required
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange}
                                className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                            />
                        </div>

                        <div>
                            <label className="block font-medium mb-1">{isRTL ? 'اسم الحساب (عربي)' : 'Account Name (Ar)'} *</label>
                            <input 
                                required
                                type="text" 
                                name="name_ar" 
                                value={formData.name_ar} 
                                onChange={handleChange}
                                className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                            />
                        </div>

                        <div>
                            <label className="block font-medium mb-1">{isRTL ? 'الحساب الرئيسي' : 'Parent Account'}</label>
                            <select 
                                name="parent_id" 
                                value={formData.parent_id} 
                                onChange={handleChange}
                                className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                            >
                                <option value="">-- {isRTL ? 'بدون (حساب رئيسي)' : 'None (Root Account)'} --</option>
                                {flatAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {'\u00A0'.repeat(acc.level * 4)} {acc.code} - {acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-medium mb-1">{isRTL ? 'الوصف' : 'Description'}</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange}
                                rows={2}
                                className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <input 
                                type="checkbox" 
                                id="is_active"
                                name="is_active" 
                                checked={formData.is_active} 
                                onChange={handleChange}
                                className="w-4 h-4 text-violet-600 rounded"
                            />
                            <label htmlFor="is_active" className="font-medium cursor-pointer">
                                {isRTL ? 'حساب نشط' : 'Active Account'}
                            </label>
                        </div>

                    </form>
                </div>

                <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg transition">
                        {isRTL ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button type="submit" form="accountForm" disabled={loading} className="px-6 py-2 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition shadow-sm disabled:opacity-50">
                        {loading ? '...' : (isRTL ? 'حفظ الحساب' : 'Save Account')}
                    </button>
                </div>
            </div>
        </div>
    );
}
