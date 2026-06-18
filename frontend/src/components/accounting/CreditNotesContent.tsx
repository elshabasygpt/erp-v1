'use client';

import React, { useState, useEffect } from 'react';
import { accountingApi, crmApi, salesApi } from '@/lib/api';

export default function CreditNotesContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const [creditNotes, setCreditNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Create form state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [form, setForm] = useState({ customer_id: '', amount: 0, reason: '', date: new Date().toISOString().split('T')[0] });
    
    // Apply form state
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [applyForm, setApplyForm] = useState({ invoice_id: '', amount: 0 });

    useEffect(() => {
        loadCreditNotes();
        loadCustomers();
    }, []);

    const loadCreditNotes = async () => {
        setLoading(true);
        try {
            const res = await accountingApi.getCreditNotes();
            setCreditNotes(res.data?.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadCustomers = async () => {
        try {
            const res = await crmApi.getCustomers();
            setCustomers(res.data?.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await accountingApi.createCreditNote(form);
            setIsCreateModalOpen(false);
            setForm({ customer_id: '', amount: 0, reason: '', date: new Date().toISOString().split('T')[0] });
            loadCreditNotes();
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Error creating credit note');
        }
    };

    const openApplyModal = async (note: any) => {
        setSelectedNote(note);
        setApplyForm({ invoice_id: '', amount: note.remaining_amount || note.amount });
        setIsApplyModalOpen(true);
        
        // Load customer's unpaid invoices
        try {
            const res = await salesApi.getInvoices({ customer_id: note.customer_id, status: 'unpaid' });
            setInvoices(res.data?.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNote) return;
        try {
            await accountingApi.applyCreditNote(selectedNote.id, applyForm);
            setIsApplyModalOpen(false);
            loadCreditNotes();
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Error applying credit note');
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {isRTL ? 'الإشعارات الدائنة' : 'Credit Notes'}
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        {isRTL ? 'إصدار أرصدة للعملاء وتطبيقها على فواتيرهم المفتوحة.' : 'Issue credit to customers and apply it to their open invoices.'}
                    </p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition whitespace-nowrap"
                >
                    + {isRTL ? 'إصدار إشعار دائن' : 'Issue Credit Note'}
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            <tr>
                                <th className={`p-4 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'الرقم المرجعي' : 'Reference'}</th>
                                <th className={`p-4 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'التاريخ' : 'Date'}</th>
                                <th className={`p-4 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'العميل' : 'Customer'}</th>
                                <th className={`p-4 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'القيمة الإجمالية' : 'Total Amount'}</th>
                                <th className={`p-4 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'الرصيد المتبقي' : 'Remaining'}</th>
                                <th className={`p-4 font-semibold ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'الحالة' : 'Status'}</th>
                                <th className={`p-4 font-semibold text-center`}>{isRTL ? 'إجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</td></tr>
                            ) : creditNotes.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-500">{isRTL ? 'لا توجد إشعارات دائنة.' : 'No credit notes found.'}</td></tr>
                            ) : (
                                creditNotes.map(note => (
                                    <tr key={note.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                        <td className={`p-4 font-bold text-indigo-600 dark:text-indigo-400 ${isRTL ? 'text-right' : ''}`}>{note.reference_number || `#CN-${note.id.substring(0,6)}`}</td>
                                        <td className={`p-4 ${isRTL ? 'text-right' : ''}`}>{note.date}</td>
                                        <td className={`p-4 ${isRTL ? 'text-right' : ''}`}>{note.customer?.name}</td>
                                        <td className={`p-4 font-semibold ${isRTL ? 'text-right' : ''}`}>{parseFloat(note.amount).toLocaleString()} SAR</td>
                                        <td className={`p-4 font-bold text-amber-600 dark:text-amber-500 ${isRTL ? 'text-right' : ''}`}>{parseFloat(note.remaining_amount).toLocaleString()} SAR</td>
                                        <td className={`p-4 ${isRTL ? 'text-right' : ''}`}>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                note.status === 'applied' ? 'bg-emerald-100 text-emerald-700' :
                                                note.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {isRTL ? (note.status === 'applied' ? 'مطبق كلياً' : note.status === 'partial' ? 'مطبق جزئياً' : 'مفتوح') : note.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {note.remaining_amount > 0 && (
                                                <button 
                                                    onClick={() => openApplyModal(note)}
                                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-medium rounded-lg text-xs transition"
                                                >
                                                    {isRTL ? 'تطبيق على فاتورة' : 'Apply to Invoice'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="font-bold text-lg">{isRTL ? 'إصدار إشعار دائن جديد' : 'Issue New Credit Note'}</h2>
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'العميل' : 'Customer'}</label>
                                <select required value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <option value="">{isRTL ? '-- اختر العميل --' : '-- Select Customer --'}</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'المبلغ' : 'Amount'}</label>
                                <input required type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'التاريخ' : 'Date'}</label>
                                <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'السبب (اختياري)' : 'Reason (Optional)'}</label>
                                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" rows={3}></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 font-medium text-slate-600">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                            <button type="submit" className="px-6 py-2 font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">{isRTL ? 'إصدار' : 'Issue'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Apply Modal */}
            {isApplyModalOpen && selectedNote && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <form onSubmit={handleApply} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="font-bold text-lg">{isRTL ? 'تطبيق الرصيد المتاح' : 'Apply Available Credit'}</h2>
                            <button type="button" onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-4">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    {isRTL ? 'الرصيد المتاح:' : 'Available Credit:'} <strong className="text-lg ml-2">{parseFloat(selectedNote.remaining_amount).toLocaleString()} SAR</strong>
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'اختر الفاتورة المستحقة' : 'Select Unpaid Invoice'}</label>
                                <select required value={applyForm.invoice_id} onChange={e => setForm({...applyForm, invoice_id: e.target.value} as any)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <option value="">{isRTL ? '-- اختر الفاتورة --' : '-- Select Invoice --'}</option>
                                    {invoices.map(inv => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.invoice_number} - {isRTL ? 'باقي:' : 'Due:'} {parseFloat(inv.due_amount || inv.total).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'المبلغ المراد تطبيقه' : 'Amount to Apply'}</label>
                                <input required type="number" step="0.01" max={selectedNote.remaining_amount} value={applyForm.amount} onChange={e => setForm({...applyForm, amount: parseFloat(e.target.value)} as any)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsApplyModalOpen(false)} className="px-4 py-2 font-medium text-slate-600">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                            <button type="submit" className="px-6 py-2 font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">{isRTL ? 'تطبيق الرصيد' : 'Apply Credit'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
