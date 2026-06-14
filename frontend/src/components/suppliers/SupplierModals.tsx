'use client';

interface DeleteConfirmProps { dict: any; supplierName: string; onConfirm: () => void; onCancel: () => void; }

export function DeleteConfirmModal({ dict, supplierName, onConfirm, onCancel }: DeleteConfirmProps) {
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
            <div className="modal-content !max-w-md">
                <div className="p-6 text-center">
                    <span className="text-5xl mb-4 block">⚠️</span>
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{dict.suppliers.deleteSupplier}</h3>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{supplierName}</p>
                    <div className="flex justify-center gap-3">
                        <button onClick={onCancel} className="btn-secondary">{dict.common.cancel}</button>
                        <button onClick={onConfirm} className="btn-primary !bg-red-600 !shadow-red-600/30">{dict.suppliers.deleteSupplier}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ViewAccountProps { dict: any; locale: string; supplier: any; onClose: () => void; formatCurrency: (v: number) => string; }

const mockTransactions = [
    { id: 'PO-001', type: 'purchase', amount: 32500, date: '2026-02-23', paid: 32500 },
    { id: 'PO-002', type: 'purchase', amount: 18700, date: '2026-02-20', paid: 10000 },
    { id: 'PAY-001', type: 'payment', amount: 8700, date: '2026-02-21', paid: 8700 },
    { id: 'PO-003', type: 'purchase', amount: 45000, date: '2026-02-18', paid: 45000 },
    { id: 'RET-001', type: 'return', amount: -5200, date: '2026-02-17', paid: -5200 },
];

import { crmApi } from '@/lib/api';
import { useEffect, useState } from 'react';

export function ViewAccountModal({ dict, locale, supplier, onClose, formatCurrency }: ViewAccountProps) {
    const isRTL = locale === 'ar';
    const s = dict.suppliers;
    const pct = supplier.creditLimit > 0 ? Math.round((supplier.balance / supplier.creditLimit) * 100) : 0;
    
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentType, setPaymentType] = useState('payment');
    const [paymentNotes, setPaymentNotes] = useState('');
    
    const [statementData, setStatementData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadStatement = async () => {
        try {
            setLoading(true);
            const res = await crmApi.getSupplierStatement(supplier.id);
            setStatementData(res?.data || null);
        } catch (e) {
            console.error('Failed to load statement', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (supplier?.id && supplier.id.length > 10) {
            loadStatement();
        } else {
            setLoading(false);
        }
    }, [supplier]);

    const txWithBalance = statementData ? statementData.statement : mockTransactions.map(t => ({...t, runningBalance: t.amount}));
    const currentBalance = statementData ? statementData.current_balance : supplier.balance;

    const handleRecordVoucher = async () => {
        if (!paymentAmount || Number(paymentAmount) <= 0) return;
        try {
            await crmApi.createVoucher({
                type: paymentType,
                amount: Number(paymentAmount),
                date: new Date().toISOString().split('T')[0],
                supplier_id: supplier.id,
                notes: paymentNotes || 'سند مورد'
            });
            setShowPaymentForm(false);
            setPaymentAmount('');
            setPaymentNotes('');
            loadStatement();
        } catch (e) {
            console.error(e);
            alert('Failed to record voucher');
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-4xl">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2"><span className="text-xl">🏭</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{s.viewAccount} - كشف حساب</h2></div>
                    <button onClick={onClose} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[{ l: s.code, v: supplier.id.substring(0,8) }, { l: s.supplierName, v: isRTL ? (supplier.nameAr||supplier.name) : supplier.name }, { l: s.phone, v: supplier.phone }, { l: s.paymentType, v: supplier.paymentType === 'credit' ? s.creditSupplier : s.cashSupplier }].map((item, i) => (
                            <div key={i} className="glass-card p-3 text-center">
                                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{item.l}</p>
                                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{item.v}</p>
                            </div>
                        ))}
                    </div>
                    {supplier.paymentType === 'credit' && (
                        <div className="glass-card p-4">
                            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>💳 {s.creditInfo}</h4>
                            <div className="grid grid-cols-3 gap-4 mb-3">
                                <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.creditLimit}</p><p className="font-bold text-primary-400">{formatCurrency(supplier.creditLimit || 0)}</p></div>
                                <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.usedCredit}</p><p className="font-bold text-red-500">{formatCurrency(currentBalance)}</p></div>
                                <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.availableCredit}</p><p className="font-bold text-green-500">{formatCurrency(Math.max((supplier.creditLimit || 0) - currentBalance, 0))}</p></div>
                            </div>
                            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-secondary)' }}>
                                <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{pct}% {isRTL ? 'مستخدم من الخصم' : 'of credit used'}</p>
                        </div>
                    )}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>📋 {isRTL ? 'كشف الحساب' : 'Account Statement'}</h4>
                            <button onClick={() => setShowPaymentForm(!showPaymentForm)} className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                                💰 {isRTL ? 'إصدار سند صرف/خصم' : 'Issue Voucher'}
                            </button>
                        </div>
                        {showPaymentForm && (
                            <div className="mb-3 p-4 rounded-xl space-y-3" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <div className="flex gap-3">
                                    <select className="select-field py-1.5 text-sm w-32" value={paymentType} onChange={e => setPaymentType(e.target.value)}>
                                        <option value="payment">سند صرف</option>
                                        <option value="discount">إشعار خصم</option>
                                        <option value="receipt">صرف مرتجع (قبض)</option>
                                    </select>
                                    <input type="number" className="input-field flex-1 py-1.5 text-sm" placeholder={isRTL ? 'المبلغ (ر.س)' : 'Amount (SAR)'} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} dir="ltr" />
                                    <input type="text" className="input-field flex-1 py-1.5 text-sm" placeholder={isRTL ? 'ملاحظات السند' : 'Notes'} value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} />
                                    <button className="btn-primary py-1.5 px-4 text-sm whitespace-nowrap" onClick={handleRecordVoucher}>{isRTL ? 'تأكيد السند' : 'Confirm'}</button>
                                </div>
                            </div>
                        )}
                        {loading ? (
                            <div className="text-center py-6 text-sm text-gray-500">جاري تحميل كشف الحساب...</div>
                        ) : (
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="data-table text-sm">
                                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                                        <tr><th>#</th><th>{isRTL ? 'البيان' : 'Type'}</th><th>{isRTL ? 'مدين (دفعنا)' : 'Debit'}</th><th>{isRTL ? 'دائن (مشتريات)' : 'Credit'}</th><th>{isRTL ? 'الرصيد للتسديد' : 'Balance'}</th><th>{isRTL ? 'التاريخ' : 'Date'}</th></tr>
                                    </thead>
                                    <tbody>{txWithBalance.map((t: any, i: number) => (
                                        <tr key={i}>
                                            <td className="font-mono text-primary-400 text-xs">{t.reference || t.id}</td>
                                            <td><span className={`badge ${t.type?.includes('invoice') ? 'badge-warning' : t.type?.includes('payment') ? 'badge-info' : 'badge-success'}`}>{t.description || t.type}</span></td>
                                            <td className="text-red-400 font-medium">{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                                            <td className="text-green-400 font-medium">{t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                                            <td className="font-bold whitespace-nowrap">{formatCurrency(t.balance !== undefined ? t.balance : t.runningBalance)}</td>
                                            <td style={{ color: 'var(--text-muted)' }} className="text-xs whitespace-nowrap">{t.date}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface CategoriesProps { dict: any; locale: string; suppliers: any[]; onClose: () => void; }

export function SupplierCategoriesModal({ dict, locale, suppliers, onClose }: CategoriesProps) {
    const isRTL = locale === 'ar';
    const s = dict.suppliers;
    const cats = [
        { key: 'local', label: s.catLocal, icon: '🏠', color: 'from-green-500/20 to-emerald-600/5', count: suppliers.filter(x => x.category === 'local').length },
        { key: 'importer', label: s.catImporter, icon: '🚢', color: 'from-blue-500/20 to-cyan-600/5', count: suppliers.filter(x => x.category === 'importer').length },
        { key: 'manufacturer', label: s.catManufacturer, icon: '🏭', color: 'from-purple-500/20 to-violet-600/5', count: suppliers.filter(x => x.category === 'manufacturer').length },
        { key: 'distributor', label: s.catDistributor, icon: '🚛', color: 'from-yellow-500/20 to-amber-600/5', count: suppliers.filter(x => x.category === 'distributor').length },
    ];
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-lg">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2"><span className="text-xl">🏷️</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{s.supplierCategories}</h2></div>
                    <button onClick={onClose} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">
                    {cats.map(c => (
                        <div key={c.key} className="glass-card p-5 text-center relative overflow-hidden">
                            <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-50`} />
                            <div className="relative"><span className="text-3xl block mb-2">{c.icon}</span><p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{c.label}</p><p className="text-2xl font-bold text-primary-400 mt-1">{c.count}</p><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'مورد' : 'suppliers'}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface ImportProps { dict: any; locale: string; onClose: () => void; }

export function ImportSuppliersModal({ dict, locale, onClose }: ImportProps) {
    const isRTL = locale === 'ar';
    const s = dict.suppliers;

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
            
            const res = await crmApi.importSuppliers(formData);
            alert(isRTL ? `تم استيراد ${res.data.imported} مورد بنجاح!` : `Successfully imported ${res.data.imported} suppliers!`);
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
                    <div className="flex items-center gap-2"><span className="text-xl">📥</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{s.importSuppliers}</h2></div>
                    <button onClick={onClose} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
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
                        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'الأعمدة المطلوبة:' : 'Required Columns:'}</p>
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
