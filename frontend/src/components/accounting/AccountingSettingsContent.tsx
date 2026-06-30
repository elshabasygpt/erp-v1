'use client';

import React, { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { accountingApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AccountingSettingsContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const [activeTab, setActiveTab] = useState<'mappings' | 'fiscal_periods'>('mappings');

    // Mappings state
    const [mappings, setMappings] = useState<Record<string, string>>({
        cash: '', bank: '', ar: '', ap: '', revenue: '', cogs: '', inventory: '', vat_payable: '', vat_input: '', discount: '', finished_goods_inventory: '', accumulated_depreciation: '', depreciation_expense: ''
    });
    const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);
    const [savingMappings, setSavingMappings] = useState(false);
    const confirm = useConfirm();

    // Fiscal Periods state
    const [periods, setPeriods] = useState<any[]>([]);
    const [loadingPeriods, setLoadingPeriods] = useState(false);
    const [newPeriod, setNewPeriod] = useState({ name: '', start_date: '', end_date: '' });

    useEffect(() => {
        if (activeTab === 'mappings') {
            loadMappings();
            loadChartOfAccounts();
        } else {
            loadPeriods();
        }
    }, [activeTab]);

    const loadMappings = async () => {
        try {
            const res = await accountingApi.getAccountMappings();
            const data = res.data?.data || res.data || {};
            setMappings(prev => ({ ...prev, ...data }));
        } catch (error) {
        }
    };

    const loadChartOfAccounts = async () => {
        try {
            const res = await accountingApi.getAccountsTree();
            const tree = res.data?.data || res.data || [];
            const flatAccounts: any[] = [];
            const flatten = (nodes: any[]) => {
                nodes.forEach(node => {
                    flatAccounts.push(node);
                    if (node.children && node.children.length > 0) {
                        flatten(node.children);
                    }
                });
            };
            flatten(tree);
            setChartOfAccounts(flatAccounts);
        } catch (error) {
        }
    };

    const handleSaveMappings = async () => {
        setSavingMappings(true);
        try {
            await accountingApi.updateAccountMappings(mappings);
            toast.success(isRTL ? 'تم حفظ الربط المحاسبي بنجاح' : 'Account mappings saved successfully');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error saving mappings');
        } finally {
            setSavingMappings(false);
        }
    };

    const updateMapping = (key: string, accountId: string) => {
        setMappings(prev => ({ ...prev, [key]: accountId }));
    };

    const loadPeriods = async () => {
        setLoadingPeriods(true);
        try {
            const res = await accountingApi.listFiscalPeriods();
            setPeriods(res.data?.data || []);
        } catch (error) {

        } finally {
            setLoadingPeriods(false);
        }
    };

    const handleCreatePeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await accountingApi.createFiscalPeriod(newPeriod);
            setNewPeriod({ name: '', start_date: '', end_date: '' });
            loadPeriods();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error creating period');
        }
    };

    const handleTogglePeriodStatus = async (period: any) => {
        if (!await confirm(isRTL ? 'هل أنت متأكد من تغيير حالة هذه الفترة؟' : 'Are you sure you want to change this period status?')) return;
        try {
            if (period.status === 'open') {
                await accountingApi.closeFiscalPeriod(period.id);
            } else {
                await accountingApi.reopenFiscalPeriod(period.id);
            }
            loadPeriods();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error updating status');
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {isRTL ? 'الإعدادات المحاسبية' : 'Accounting Settings'}
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        {isRTL ? 'إدارة الربط المحاسبي والفترات المالية' : 'Manage account mappings and fiscal periods'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setActiveTab('mappings')}
                    className={`py-3 px-4 font-semibold text-sm border-b-2 transition-all ${activeTab === 'mappings' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {isRTL ? 'الربط المحاسبي للعمليات الآلية' : 'Automatic Account Mappings'}
                </button>
                <button 
                    onClick={() => setActiveTab('fiscal_periods')}
                    className={`py-3 px-4 font-semibold text-sm border-b-2 transition-all ${activeTab === 'fiscal_periods' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {isRTL ? 'الفترات المالية' : 'Fiscal Periods'}
                </button>
            </div>

            {/* Mappings Tab */}
            {activeTab === 'mappings' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        {isRTL ? 'حدد الحسابات الافتراضية التي سيتم توجيه القيود الآلية إليها عند إجراء المبيعات، المشتريات، وتسويات المخزون.' : 'Select default accounts for automatic journal entries created from sales, purchases, and inventory adjustments.'}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Cash & Bank */}
                        <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                                {isRTL ? 'النقدية والبنوك' : 'Cash & Bank'}
                            </h3>
                            {['cash', 'bank'].map((key) => (
                                <div key={key} className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {key === 'cash' ? (isRTL ? 'حساب الصندوق الرئيسي' : 'Main Cash Account') : (isRTL ? 'حساب البنك الرئيسي' : 'Main Bank Account')}
                                    </label>
                                    <select 
                                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                        value={mappings[key] || ''}
                                        onChange={(e) => updateMapping(key, e.target.value)}
                                    >
                                        <option value="">{isRTL ? '-- غير محدد --' : '-- Not Set --'}</option>
                                        {chartOfAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.code} - {isRTL ? acc.name_ar : acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        {/* Sales & Receivables */}
                        <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                                {isRTL ? 'المبيعات والعملاء' : 'Sales & Receivables'}
                            </h3>
                            {['revenue', 'ar', 'discount'].map((key) => (
                                <div key={key} className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {key === 'revenue' ? (isRTL ? 'حساب إيرادات المبيعات' : 'Sales Revenue') : key === 'ar' ? (isRTL ? 'حساب العملاء' : 'Accounts Receivable (AR)') : (isRTL ? 'الخصومات المسموح بها' : 'Discount Allowed')}
                                    </label>
                                    <select 
                                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                        value={mappings[key] || ''}
                                        onChange={(e) => updateMapping(key, e.target.value)}
                                    >
                                        <option value="">{isRTL ? '-- غير محدد --' : '-- Not Set --'}</option>
                                        {chartOfAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.code} - {isRTL ? acc.name_ar : acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        {/* Purchases & Payables */}
                        <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                                {isRTL ? 'المشتريات والموردين' : 'Purchases & Payables'}
                            </h3>
                            {['inventory', 'cogs', 'ap'].map((key) => (
                                <div key={key} className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {key === 'inventory' ? (isRTL ? 'حساب المخزون (أصول)' : 'Inventory Asset') : key === 'cogs' ? (isRTL ? 'تكلفة البضاعة المباعة' : 'COGS') : (isRTL ? 'حساب الموردين' : 'Accounts Payable (AP)')}
                                    </label>
                                    <select 
                                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                        value={mappings[key] || ''}
                                        onChange={(e) => updateMapping(key, e.target.value)}
                                    >
                                        <option value="">{isRTL ? '-- غير محدد --' : '-- Not Set --'}</option>
                                        {chartOfAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.code} - {isRTL ? acc.name_ar : acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        {/* Manufacturing */}
                        <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                                {isRTL ? 'التصنيع والتجميع' : 'Manufacturing & Assembly'}
                            </h3>
                            {['finished_goods_inventory'].map((key) => (
                                <div key={key} className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {isRTL ? 'حساب مخزون المنتجات الجاهزة' : 'Finished Goods Inventory'}
                                    </label>
                                    <select
                                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                        value={mappings[key] || ''}
                                        onChange={(e) => updateMapping(key, e.target.value)}
                                    >
                                        <option value="">{isRTL ? '-- غير محدد --' : '-- Not Set --'}</option>
                                        {chartOfAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.code} - {isRTL ? acc.name_ar : acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        {/* Fixed Assets */}
                        <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                                {isRTL ? 'الأصول الثابتة' : 'Fixed Assets'}
                            </h3>
                            {['accumulated_depreciation', 'depreciation_expense'].map((key) => (
                                <div key={key} className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {key === 'accumulated_depreciation' ? (isRTL ? 'مجمع الإهلاك (أصول)' : 'Accumulated Depreciation') : (isRTL ? 'مصروف الإهلاك' : 'Depreciation Expense')}
                                    </label>
                                    <select
                                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                        value={mappings[key] || ''}
                                        onChange={(e) => updateMapping(key, e.target.value)}
                                    >
                                        <option value="">{isRTL ? '-- غير محدد --' : '-- Not Set --'}</option>
                                        {chartOfAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.code} - {isRTL ? acc.name_ar : acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        {/* Taxes */}
                        <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                                {isRTL ? 'الضرائب (VAT)' : 'Taxes (VAT)'}
                            </h3>
                            {['vat_payable', 'vat_input'].map((key) => (
                                <div key={key} className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {key === 'vat_payable' ? (isRTL ? 'ضريبة القيمة المضافة المحصلة' : 'VAT Payable (Output)') : (isRTL ? 'ضريبة المدخلات' : 'VAT Receivable (Input)')}
                                    </label>
                                    <select 
                                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                        value={mappings[key] || ''}
                                        onChange={(e) => updateMapping(key, e.target.value)}
                                    >
                                        <option value="">{isRTL ? '-- غير محدد --' : '-- Not Set --'}</option>
                                        {chartOfAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.code} - {isRTL ? acc.name_ar : acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                        <button 
                            onClick={handleSaveMappings}
                            disabled={savingMappings}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl font-medium transition disabled:opacity-50"
                        >
                            {savingMappings ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ الربط المحاسبي' : 'Save Mappings')}
                        </button>
                    </div>
                </div>
            )}

            {/* Fiscal Periods Tab */}
            {activeTab === 'fiscal_periods' && (
                <div className="space-y-6">
                    {/* Create Form */}
                    <form onSubmit={handleCreatePeriod} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="font-bold text-lg mb-4">{isRTL ? 'إضافة فترة مالية جديدة' : 'Add New Fiscal Period'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'اسم الفترة (مثال: 2024)' : 'Period Name (e.g. 2024)'}</label>
                                <input required type="text" value={newPeriod.name} onChange={e => setNewPeriod({...newPeriod, name: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'تاريخ البداية' : 'Start Date'}</label>
                                <input required type="date" value={newPeriod.start_date} onChange={e => setNewPeriod({...newPeriod, start_date: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'تاريخ النهاية' : 'End Date'}</label>
                                <div className="flex gap-2">
                                    <input required type="date" value={newPeriod.end_date} onChange={e => setNewPeriod({...newPeriod, end_date: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                                    <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium whitespace-nowrap">
                                        {isRTL ? 'إضافة' : 'Add'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* List */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className={`p-4 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'اسم الفترة' : 'Period Name'}</th>
                                    <th className={`p-4 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'من' : 'From'}</th>
                                    <th className={`p-4 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'إلى' : 'To'}</th>
                                    <th className={`p-4 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'الحالة' : 'Status'}</th>
                                    <th className={`p-4 font-semibold text-center`}>{isRTL ? 'إجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingPeriods ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading...</td></tr>
                                ) : periods.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">{isRTL ? 'لا توجد فترات مالية.' : 'No fiscal periods found.'}</td></tr>
                                ) : periods.map(p => (
                                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className={`p-4 font-bold ${isRTL ? 'text-right' : ''}`}>{p.name}</td>
                                        <td className={`p-4 ${isRTL ? 'text-right' : ''}`}>{p.start_date}</td>
                                        <td className={`p-4 ${isRTL ? 'text-right' : ''}`}>{p.end_date}</td>
                                        <td className={`p-4 ${isRTL ? 'text-right' : ''}`}>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {p.status === 'open' ? (isRTL ? 'مفتوحة' : 'Open') : (isRTL ? 'مغلقة' : 'Closed')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => handleTogglePeriodStatus(p)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${p.status === 'open' ? 'border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                                            >
                                                {p.status === 'open' ? (isRTL ? 'إغلاق الفترة' : 'Close Period') : (isRTL ? 'إعادة فتح' : 'Reopen')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
