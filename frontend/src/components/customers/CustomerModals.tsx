'use client';

import { useState } from 'react';
import { exportTableToPDF } from '@/lib/pdf-export';

interface DeleteConfirmProps {
    dict: any;
    customerName: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteConfirmModal({ dict, customerName, onConfirm, onCancel }: DeleteConfirmProps) {
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
            <div className="modal-content !max-w-md">
                <div className="p-6 text-center">
                    <span className="text-5xl mb-4 block">⚠️</span>
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{dict.customers.deleteCustomer}</h3>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                        {customerName}
                    </p>
                    <div className="flex justify-center gap-3">
                        <button onClick={onCancel} className="btn-secondary">{dict.common.cancel}</button>
                        <button onClick={onConfirm} className="btn-primary !bg-red-600 !shadow-red-600/30">
                            {dict.customers.deleteCustomer}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ViewAccountProps {
    dict: any;
    locale: string;
    customer: any;
    onClose: () => void;
    formatCurrency: (v: number) => string;
}

const mockTransactions = [
    { id: 'INV-001', type: 'invoice', amount: 15750, date: '2026-02-23', paid: 15750 },
    { id: 'INV-002', type: 'invoice', amount: 8900, date: '2026-02-20', paid: 5000 },
    { id: 'PAY-001', type: 'payment', amount: 3900, date: '2026-02-21', paid: 3900 },
    { id: 'INV-003', type: 'invoice', amount: 23400, date: '2026-02-18', paid: 23400 },
    { id: 'RET-001', type: 'return', amount: -2500, date: '2026-02-17', paid: -2500 },
    { id: 'INV-004', type: 'invoice', amount: 6200, date: '2026-02-15', paid: 6200 },
];

import { crmApi } from '@/lib/api';
import { useEffect } from 'react';

export function ViewAccountModal({ dict, locale, customer, onClose, formatCurrency }: ViewAccountProps) {
    const isRTL = locale === 'ar';
    const c = dict.customers;
    const usedPercent = customer.creditLimit > 0 ? Math.round((customer.balance / customer.creditLimit) * 100) : 0;

    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentType, setPaymentType] = useState('receipt');
    const [paymentNotes, setPaymentNotes] = useState('');
    
    const [statementData, setStatementData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadStatement = async () => {
        try {
            setLoading(true);
            const res = await crmApi.getCustomerStatement(customer.id);
            setStatementData(res?.data || null);
        } catch (e) {
            console.error('Failed to load statement', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (customer?.id && customer.id.length > 10) { // Check if real UUID
            loadStatement();
        } else {
            // Mock data fallback 
            setLoading(false);
        }
    }, [customer]);

    const txWithBalance = statementData ? statementData.statement : mockTransactions.map(t => ({...t, runningBalance: t.amount}));
    const currentBalance = statementData ? statementData.current_balance : customer.balance;

    const handleRecordVoucher = async () => {
        if (!paymentAmount || Number(paymentAmount) <= 0) return;
        try {
            await crmApi.createVoucher({
                type: paymentType,
                amount: Number(paymentAmount),
                date: new Date().toISOString().split('T')[0],
                customer_id: customer.id,
                notes: paymentNotes || 'دفعة مسجلة'
            });
            setShowPaymentForm(false);
            setPaymentAmount('');
            setPaymentNotes('');
            loadStatement(); // Refresh ledger
        } catch (e) {
            console.error(e);
            alert('Failed to record voucher');
        }
    };

    const handlePrintStatement = () => {
        const headers = [
            isRTL ? '#' : '#',
            isRTL ? 'النوع' : 'Type',
            isRTL ? 'مدين' : 'Debit',
            isRTL ? 'دائن' : 'Credit',
            isRTL ? 'الرصيد' : 'Balance',
            isRTL ? 'التاريخ' : 'Date',
        ];
        const rows = txWithBalance.map((t: any) => [
            t.reference || t.id,
            t.description || t.type,
            formatCurrency(t.debit || Math.abs(t.amount || 0)),
            formatCurrency(t.credit || Math.abs(t.paid || 0)),
            formatCurrency(t.balance || t.runningBalance || 0),
            t.date,
        ]);
        const summaryCards = [
            { label: isRTL ? 'الرصيد الافتتاحي' : 'Opening', value: formatCurrency(statementData?.opening_balance || 0) },
            { label: isRTL ? 'الرصيد المستحق' : 'Outstanding', value: formatCurrency(currentBalance) },
            { label: isRTL ? 'حد الائتمان' : 'Credit Limit', value: formatCurrency(customer.creditLimit || 0) },
        ];
        exportTableToPDF(
            isRTL ? `كشف حساب: ${customer.nameAr || customer.name}` : `Account Statement: ${customer.name}`,
            isRTL ? `رقم العميل: ${customer.id}` : `Customer: ${customer.id}`,
            headers,
            rows,
            summaryCards,
            isRTL
        );
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-4xl">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">💰</span>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{c.viewAccount} - كشف حساب</h2>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Customer Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoCard label={c.code} value={customer.id.substring(0, 8)} />
                        <InfoCard label={c.customerName} value={isRTL ? (customer.nameAr || customer.name) : customer.name} />
                        <InfoCard label={c.phone} value={customer.phone} />
                        <InfoCard label={c.paymentType} value={customer.paymentType === 'credit' ? c.creditCustomer : c.cashCustomer} badge={customer.paymentType === 'credit' ? 'badge-info' : 'badge-success'} />
                    </div>

                    {/* Credit Info */}
                    {customer.paymentType === 'credit' && (
                        <div className="glass-card p-4">
                            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>💳 {c.creditInfo}</h4>
                            <div className="grid grid-cols-3 gap-4 mb-3">
                                <div>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.creditLimit}</p>
                                    <p className="font-bold text-primary-400">{formatCurrency(customer.creditLimit || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.usedCredit}</p>
                                    <p className="font-bold text-red-500">{formatCurrency(currentBalance)}</p>
                                </div>
                                <div>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.availableCredit}</p>
                                    <p className="font-bold text-green-500">{formatCurrency(Math.max((customer.creditLimit || 0) - currentBalance, 0))}</p>
                                </div>
                            </div>
                            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-secondary)' }}>
                                <div className={`h-full rounded-full ${usedPercent > 80 ? 'bg-red-500' : usedPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(usedPercent, 100)}%` }} />
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{usedPercent}% {isRTL ? 'مستخدم من حد الائتمان' : 'of credit limit used'}</p>
                        </div>
                    )}

                    {/* Transaction History */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>📋 {isRTL ? 'كشف الحساب (Ledger)' : 'Account Statement'}</h4>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                                    style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
                                >
                                    💰 {isRTL ? 'إصدار سند (دفع/خصم)' : 'Issue Voucher'}
                                </button>
                                <button
                                    onClick={handlePrintStatement}
                                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                                    style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}
                                >
                                    🖨️ {isRTL ? 'طباعة / PDF' : 'Print / PDF'}
                                </button>
                            </div>
                        </div>

                        {showPaymentForm && (
                            <div className="mb-3 p-4 rounded-xl space-y-3" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <div className="flex gap-3">
                                    <select className="select-field py-1.5 text-sm w-32" value={paymentType} onChange={e => setPaymentType(e.target.value)}>
                                        <option value="receipt">سند قبض</option>
                                        <option value="discount">إشعار خصم</option>
                                        <option value="service">رسوم خدمات</option>
                                    </select>
                                    <input
                                        type="number"
                                        className="input-field flex-1 py-1.5 text-sm"
                                        placeholder={isRTL ? 'المبلغ (ر.س)' : 'Amount (SAR)'}
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                        dir="ltr"
                                    />
                                    <input
                                        type="text"
                                        className="input-field flex-1 py-1.5 text-sm"
                                        placeholder={isRTL ? 'ملاحظات السند' : 'Notes'}
                                        value={paymentNotes}
                                        onChange={e => setPaymentNotes(e.target.value)}
                                    />
                                    <button
                                        className="btn-primary py-1.5 px-4 text-sm whitespace-nowrap"
                                        onClick={handleRecordVoucher}
                                    >
                                        {isRTL ? 'تأكيد السند' : 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center py-6 text-sm text-gray-500">جاري تحميل كشف الحساب...</div>
                        ) : (
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="data-table text-sm">
                                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                                        <tr>
                                            <th>#</th>
                                            <th>{isRTL ? 'البيان' : 'Description'}</th>
                                            <th>{isRTL ? 'مدين (له)' : 'Debit'}</th>
                                            <th>{isRTL ? 'دائن (عليه)' : 'Credit'}</th>
                                            <th>{isRTL ? 'الرصيد' : 'Balance'}</th>
                                            <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {txWithBalance.map((t: any, i: number) => (
                                            <tr key={i}>
                                                <td className="font-mono text-primary-400 text-xs">{(t.reference || t.id)}</td>
                                                <td>
                                                    <span className={`badge ${t.type?.includes('invoice') ? 'badge-warning' : t.type?.includes('receipt') ? 'badge-success' : 'badge-info'}`}>
                                                        {t.description || t.type}
                                                    </span>
                                                </td>
                                                <td className="text-red-400 font-medium">{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                                                <td className="text-green-400 font-medium">{t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                                                <td className="font-bold whitespace-nowrap">
                                                    {formatCurrency(t.balance !== undefined ? t.balance : t.runningBalance)}
                                                </td>
                                                <td style={{ color: 'var(--text-muted)' }} className="text-xs whitespace-nowrap">{t.date}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoCard({ label, value, badge }: { label: string; value: string; badge?: string }) {
    return (
        <div className="glass-card p-3 text-center">
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            {badge ? <span className={`badge ${badge}`}>{value}</span> : <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{value}</p>}
        </div>
    );
}

interface GroupsModalProps {
    dict: any;
    locale: string;
    customers: any[];
    onClose: () => void;
}

export function CustomerGroupsModal({ dict, locale, customers, onClose }: GroupsModalProps) {
    const isRTL = locale === 'ar';
    const c = dict.customers;
    
    // Find unique custom groups from customers data
    const defaultGroupKeys = ['vip', 'wholesale', 'retail', 'individual'];
    const customGroups = customers.reduce((acc, cu) => {
        if (!defaultGroupKeys.includes(cu.group) && !acc.find((g: string) => g === cu.group)) {
            acc.push(cu.group);
        }
        return acc;
    }, [] as string[]);

    const initialGroups = [
        { key: 'vip', label: c.groupVip || 'VIP', icon: '⭐', color: 'from-yellow-500/20 to-amber-600/5' },
        { key: 'wholesale', label: c.groupWholesale || 'جملة', icon: '🏭', color: 'from-blue-500/20 to-cyan-600/5' },
        { key: 'retail', label: c.groupRetail || 'قطاعي', icon: '🏪', color: 'from-green-500/20 to-emerald-600/5' },
        { key: 'individual', label: c.groupIndividual || 'أفراد', icon: '👤', color: 'from-purple-500/20 to-violet-600/5' },
        ...customGroups.map((grp: string) => ({
            key: grp, label: grp, icon: '📁', color: 'from-slate-500/20 to-slate-600/5'
        }))
    ];

    const [groupsList, setGroupsList] = useState(initialGroups);
    const [isAdding, setIsAdding] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    const handleAddGroup = () => {
        if (!newGroupName.trim()) return;
        const newKey = newGroupName.toLowerCase().replace(/\s+/g, '_');
        if (groupsList.find(g => g.key === newKey || g.label === newGroupName.trim())) {
            alert(isRTL ? 'المجموعة موجودة مسبقاً' : 'Group already exists');
            return;
        }
        
        setGroupsList([...groupsList, {
            key: newKey,
            label: newGroupName.trim(),
            icon: '🏷️',
            color: 'from-indigo-500/20 to-indigo-600/5'
        }]);
        setNewGroupName('');
        setIsAdding(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in">
                <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md z-10" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🏷️</span>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{c.customerGroups}</h2>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="p-5">
                    {/* Add Group Action */}
                    <div className="mb-5">
                        {!isAdding ? (
                            <button 
                                onClick={() => setIsAdding(true)} 
                                className="w-full py-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all hover:border-primary-500 hover:bg-primary-500/5 text-primary-500"
                                style={{ borderColor: 'var(--border-default)' }}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                {isRTL ? 'إضافة مجموعة جديدة' : 'Add New Group'}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 animate-fade-in bg-primary-500/5 p-3 rounded-xl border border-primary-500/20">
                                <input 
                                    type="text" 
                                    className="input-field py-2 text-sm flex-1 bg-white dark:bg-surface-950" 
                                    placeholder={isRTL ? 'اسم المجموعة...' : 'Group name...'} 
                                    value={newGroupName} 
                                    onChange={e => setNewGroupName(e.target.value)}
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                                />
                                <button onClick={handleAddGroup} className="btn-primary py-2 px-4 whitespace-nowrap text-sm">{dict.common.save}</button>
                                <button onClick={() => { setIsAdding(false); setNewGroupName(''); }} className="btn-secondary py-2 px-4 whitespace-nowrap text-sm">{dict.common.cancel}</button>
                            </div>
                        )}
                    </div>

                    {/* Groups Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {groupsList.map(g => {
                            const count = customers.filter(c => c.group === g.key).length;
                            return (
                                <div key={g.key} className={`glass-card p-4 text-center relative overflow-hidden group hover:border-primary-500/30 transition-all`}>
                                    <div className={`absolute inset-0 bg-gradient-to-br ${g.color} opacity-50 group-hover:opacity-80 transition-opacity`} />
                                    <div className="relative">
                                        <span className="text-3xl block mb-2 transform group-hover:scale-110 transition-transform">{g.icon}</span>
                                        <p className="font-bold text-sm mb-1 truncate px-1" style={{ color: 'var(--text-primary)' }} title={g.label}>{g.label}</p>
                                        <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold bg-white/50 dark:bg-black/20 text-primary-600 dark:text-primary-400">
                                            {count} {isRTL ? 'عميل' : 'customers'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ImportModalProps {
    dict: any;
    locale: string;
    onClose: () => void;
}

export function ImportCustomersModal({ dict, locale, onClose }: ImportModalProps) {
    const isRTL = locale === 'ar';
    const c = dict.customers;
    
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!file) {
            alert(isRTL ? 'الرجاء اختيار ملف' : 'Please select a file');
            return;
        }

        try {
            setImporting(true);
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await crmApi.importCustomers(formData);
            alert(isRTL ? `تم استيراد ${res.data.imported} عميل بنجاح!` : `Successfully imported ${res.data.imported} customers!`);
            onClose();
        } catch (e) {
            console.error('Import failed', e);
            alert(isRTL ? 'فشل الاستيراد' : 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-md">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📥</span>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{c.importCustomers}</h2>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <label className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors hover:border-primary-500/40 block" style={{ borderColor: 'var(--border-default)' }}>
                        <span className="text-4xl block mb-3">📄</span>
                        <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                            {file ? file.name : (isRTL ? 'اسحب الملف هنا أو اضغط للاختيار' : 'Drag file here or click to browse')}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>CSV, XLSX, XLS (max 5MB)</p>
                        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                    </label>
                    <div className="glass-card p-3">
                        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'الأعمدة المطلوبة (الترتيب):' : 'Required Columns (Order):'}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {['Name', 'Email', 'Phone', 'Address', 'Tax Number', 'Opening Balance'].map((col: string) => (
                                <span key={col} className="badge bg-primary-500/10 text-primary-400 text-[10px]">{col}</span>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <button onClick={onClose} disabled={importing} className="btn-secondary">{dict.common.cancel}</button>
                    <button onClick={handleImport} disabled={importing || !file} className="btn-primary">
                        {importing ? (isRTL ? 'جاري الاستيراد...' : 'Importing...') : (isRTL ? 'استيراد' : 'Import')}
                    </button>
                </div>
            </div>
        </div>
    );
}
