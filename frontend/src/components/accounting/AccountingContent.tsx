'use client';

import { useState, useEffect } from 'react';
import { treasuryApi } from '@/lib/api';

export default function AccountingContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const [activeTab, setActiveTab] = useState<'safes' | 'expenses' | 'transfers' | 'reports'>('safes');
    
    // Data states
    const [safes, setSafes] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [showSafeModal, setShowSafeModal] = useState(false);
    const [newSafe, setNewSafe] = useState({ name: '', type: 'cash', balance: 0 });

    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [newExpense, setNewExpense] = useState({ category_id: '', safe_id: '', amount: 0, description: '' });

    const [transferData, setTransferData] = useState({ from_safe_id: '', to_safe_id: '', amount: 0, description: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'safes' || activeTab === 'transfers') {
                const res = await treasuryApi.getSafes();
                setSafes(res.data?.data || []);
            } else if (activeTab === 'expenses') {
                const [expRes, catRes, safeRes] = await Promise.all([
                    treasuryApi.getExpenses(),
                    treasuryApi.getExpenseCategories(),
                    treasuryApi.getSafes()
                ]);
                setExpenses(expRes.data?.data || []);
                setCategories(catRes.data?.data || []);
                setSafes(safeRes.data?.data || []);
            }
        } catch (error) {
            console.error("Failed fetching data", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(val || 0);

    const handleCreateSafe = async () => {
        try {
            await treasuryApi.createSafe(newSafe);
            setShowSafeModal(false);
            setNewSafe({ name: '', type: 'cash', balance: 0 });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateExpense = async () => {
        try {
            await treasuryApi.createExpense(newExpense);
            setShowExpenseModal(false);
            setNewExpense({ category_id: '', safe_id: '', amount: 0, description: '' });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleExecuteTransfer = async () => {
        if (!transferData.from_safe_id || !transferData.to_safe_id || transferData.amount <= 0) {
            alert(isRTL ? "يرجى إكمال بيانات التحويل" : "Please complete transfer details");
            return;
        }
        setLoading(true);
        try {
            await treasuryApi.transfer(transferData);
            setTransferData({ from_safe_id: '', to_safe_id: '', amount: 0, description: '' });
            fetchData();
            alert(isRTL ? "تم التحويل بنجاح" : "Transfer completed successfully");
        } catch (e: any) {
            alert(e.response?.data?.message || (isRTL ? "فشل التحويل" : "Transfer failed"));
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'الخزائن والحسابات' : 'Treasury & Accounting'}
                    </h1>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'safes' && (
                        <button onClick={() => setShowSafeModal(true)} className="btn-primary">
                            + {isRTL ? 'إضافة خزينة' : 'Add Safe'}
                        </button>
                    )}
                    {activeTab === 'expenses' && (
                        <button onClick={() => setShowExpenseModal(true)} className="btn-danger">
                            - {isRTL ? 'تسجيل مصروف' : 'Record Expense'}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 space-x-1 rtl:space-x-reverse rounded-xl" style={{ background: 'var(--bg-surface-secondary)' }}>
                {['safes', 'expenses', 'transfers', 'reports'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`
                            flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300
                            ${activeTab === tab ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'text-surface-400 hover:text-white hover:bg-surface-800'}
                        `}
                    >
                        {isRTL 
                            ? (tab === 'safes' ? 'الخزائن' : tab === 'expenses' ? 'المصروفات' : tab === 'transfers' ? 'التحويلات' : 'التقارير المالية')
                            : (tab === 'safes' ? 'Safes' : tab === 'expenses' ? 'Expenses' : tab === 'transfers' ? 'Transfers' : 'Financial Reports')}
                    </button>
                ))}
            </div>

            {/* Safes Tab */}
            {activeTab === 'safes' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loading ? <p>Loading...</p> : safes.map(safe => (
                        <div key={safe.id} className="glass-card p-6 border-l-4" style={{ borderLeftColor: safe.type === 'bank' ? '#3b82f6' : '#22c55e' }}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-white">{safe.name}</h3>
                                <span className={`px-2 py-1 rounded text-xs uppercase ${safe.type === 'bank' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {safe.type}
                                </span>
                            </div>
                            <p className="text-3xl font-bold mt-4" style={{ color: 'var(--text-primary)' }}>
                                {formatCurrency(safe.balance)}
                            </p>
                            <p className="text-sm opacity-50 mt-1">Status: {safe.is_active ? 'Active' : 'Inactive'}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
                <div className="glass-card p-6">
                    {loading ? <p>Loading...</p> : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{isRTL ? 'البيان' : 'Description'}</th>
                                    <th>{isRTL ? 'التصنيف' : 'Category'}</th>
                                    <th>{isRTL ? 'الخزينة المسحوب منها' : 'Safe'}</th>
                                    <th>{isRTL ? 'المبلغ' : 'Amount'}</th>
                                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map(exp => (
                                    <tr key={exp.id}>
                                        <td>{exp.description || '---'}</td>
                                        <td><span className="badge badge-info">{exp.category?.name}</span></td>
                                        <td>{exp.safe?.name}</td>
                                        <td className="text-red-400 font-bold">-{formatCurrency(exp.amount)}</td>
                                        <td className="opacity-70">{new Date(exp.expense_date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'transfers' && (
                <div className="space-y-6">
                    <div className="glass-card p-6 max-w-2xl mx-auto">
                        <h3 className="text-xl font-bold mb-6 text-white border-b border-surface-800 pb-3">
                            {isRTL ? 'إجراء تحويل نقدي جديد' : 'Execute New Cash Transfer'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm opacity-70 mb-1">{isRTL ? 'من خزينة' : 'From Safe'}</label>
                                <select 
                                    className="select-field" 
                                    value={transferData.from_safe_id} 
                                    onChange={e => setTransferData({...transferData, from_safe_id: e.target.value})}
                                >
                                    <option value="">{isRTL ? 'اختر المصدر...' : 'Select Source...'}</option>
                                    {safes.map(s => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.balance)})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm opacity-70 mb-1">{isRTL ? 'إلى خزينة' : 'To Safe'}</label>
                                <select 
                                    className="select-field" 
                                    value={transferData.to_safe_id} 
                                    onChange={e => setTransferData({...transferData, to_safe_id: e.target.value})}
                                >
                                    <option value="">{isRTL ? 'اختر الوجهة...' : 'Select Destination...'}</option>
                                    {safes.map(s => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.balance)})</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm opacity-70 mb-1">{isRTL ? 'المبلغ المراد تحويله' : 'Transfer Amount'}</label>
                                <input 
                                    className="input-field" 
                                    type="number" 
                                    value={transferData.amount} 
                                    onChange={e => setTransferData({...transferData, amount: parseFloat(e.target.value) || 0})}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm opacity-70 mb-1">{isRTL ? 'ملاحظات إضافية' : 'Notes'}</label>
                                <input 
                                    className="input-field" 
                                    type="text" 
                                    value={transferData.description} 
                                    onChange={e => setTransferData({...transferData, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <button 
                            className="btn-primary w-full mt-6 py-3 text-lg font-bold shadow-xl shadow-primary-500/20"
                            onClick={handleExecuteTransfer}
                            disabled={loading}
                        >
                            {loading ? '...' : (isRTL ? 'تأكيد عملية التحويل' : 'Confirm Transfer')}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: isRTL ? 'ميزان المراجعة' : 'Trial Balance', icon: '⚖️', color: '#6366f1', link: '/accounting/reports/trial-balance' },
                        { title: isRTL ? 'كشف الميزانية' : 'Balance Sheet', icon: '🏛️', color: '#10b981', link: '/accounting/reports/balance-sheet' },
                        { title: isRTL ? 'الأرباح والخسائر' : 'P&L Statement', icon: '📈', color: '#f59e0b', link: '/accounting/reports/income-statement' },
                        { title: isRTL ? 'الأستاذ العام' : 'General Ledger', icon: '📖', color: '#8b5cf6', link: '/accounting/reports/general-ledger' },
                    ].map((report, idx) => (
                        <div key={idx} className="glass-card p-6 flex flex-col items-center text-center group cursor-pointer hover:border-primary-500 transition-all">
                            <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">{report.icon}</span>
                            <h3 className="font-bold text-white mb-2">{report.title}</h3>
                            <p className="text-xs opacity-50 mb-4">{isRTL ? 'تقارير محاسبية تفصيلية مطابقة للمعايير' : 'Standard detailed accounting reports'}</p>
                            <button className="text-xs font-semibold py-1.5 px-3 rounded-lg bg-surface-800 text-surface-300 hover:bg-primary-600 hover:text-white transition-colors">
                                {isRTL ? 'عرض التقرير' : 'View Report'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {showSafeModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSafeModal(false)}>
                    <div className="modal-content max-w-sm p-6">
                        <h2 className="text-xl font-bold mb-4">{isRTL ? 'تعريف خزينة/بنك' : 'Create Safe'}</h2>
                        <div className="space-y-4">
                            <input className="input-field" placeholder={isRTL ? 'اسم الخزينة' : 'Safe Name'} value={newSafe.name} onChange={e => setNewSafe({...newSafe, name: e.target.value})} />
                            <select className="select-field" value={newSafe.type} onChange={e => setNewSafe({...newSafe, type: e.target.value as any})}>
                                <option value="cash">{isRTL ? 'صندوق نقدي (كاشير)' : 'Cash Drawer'}</option>
                                <option value="bank">{isRTL ? 'حساب بنكي' : 'Bank Account'}</option>
                            </select>
                            <input className="input-field" type="number" placeholder={isRTL ? 'رصيد افتتاحي' : 'Opening Balance'} value={newSafe.balance} onChange={e => setNewSafe({...newSafe, balance: parseFloat(e.target.value) || 0})} />
                            <div className="flex gap-2">
                                <button className="btn-secondary flex-1" onClick={() => setShowSafeModal(false)}>Cancel</button>
                                <button className="btn-primary flex-1" onClick={handleCreateSafe}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showExpenseModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowExpenseModal(false)}>
                    <div className="modal-content max-w-md p-6">
                        <h2 className="text-xl font-bold text-red-500 mb-4">{isRTL ? 'تسجيل مصروف/سلفة' : 'Record Expense'}</h2>
                        <div className="space-y-4 text-left">
                           <label className="block text-sm opacity-70 mb-1">{isRTL ? 'التصنيف' : 'Category'}</label>
                            <select className="select-field" value={newExpense.category_id} onChange={e => setNewExpense({...newExpense, category_id: e.target.value})}>
                                <option value="">Select Category...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <label className="block text-sm opacity-70 mb-1">{isRTL ? 'الخزينة المخصوم منها' : 'Safe'}</label>
                            <select className="select-field" value={newExpense.safe_id} onChange={e => setNewExpense({...newExpense, safe_id: e.target.value})}>
                                <option value="">Select Safe...</option>
                                {safes.map(s => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.balance)})</option>)}
                            </select>

                            <label className="block text-sm opacity-70 mb-1">{isRTL ? 'المبلغ' : 'Amount'}</label>
                            <input className="input-field" type="number" min="0" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})} />
                            
                            <label className="block text-sm opacity-70 mb-1">{isRTL ? 'الوصف' : 'Description'}</label>
                            <input className="input-field" type="text" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                            
                            <div className="flex gap-2 pt-2">
                                <button className="btn-secondary flex-1" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                                <button className="btn-danger flex-1" onClick={handleCreateExpense}>Record Expense</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
