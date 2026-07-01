'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';

export default function CollectPaymentScreen({ isRTL }: { isRTL: boolean }) {
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [loadError, setLoadError] = useState(false);
    
    const [form, setForm] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0,
        payment_method: 'cash',
        bank_name: '',
        transaction_id: '',
        notes: ''
    });

    const [allocations, setAllocations] = useState<Record<string, number>>({});

    const extractArray = (res: any) => {
        const data = res.data?.data?.data || res.data?.data || res.data || [];
        return Array.isArray(data) ? data : [];
    };

    useEffect(() => {
        api.get('/crm/customers').then(res => setCustomers(extractArray(res)));
    }, []);

    const loadInvoices = () => {
        if (!selectedCustomer) {
            setInvoices([]);
            return;
        }
        setLoadingInvoices(true);
        setLoadError(false);
        api.get(`/sales/invoices?customer_id=${selectedCustomer}&payment_status=unpaid`)
            .then(res => setInvoices(extractArray(res).filter((i:any) => i.type === 'credit' && i.payment_status !== 'paid')))
            .catch(() => setLoadError(true))
            .finally(() => setLoadingInvoices(false));
    };

    useEffect(() => {
        loadInvoices();
    }, [selectedCustomer]);

    const handleAllocateAll = () => {
        let remaining = Number(form.amount);
        const newAlloc: Record<string, number> = {};
        
        // Sort by oldest due_date first
        const sorted = [...invoices].sort((a, b) => new Date(a.due_date || a.invoice_date).getTime() - new Date(b.due_date || b.invoice_date).getTime());
        
        sorted.forEach(inv => {
            if (remaining <= 0) return;
            const due = Number(inv.total) - Number(inv.paid_amount);
            const allocate = Math.min(due, remaining);
            newAlloc[inv.id] = allocate;
            remaining -= allocate;
        });

        setAllocations(newAlloc);
    };

    const handleAllocationChange = (invId: string, val: number) => {
        setAllocations(prev => ({ ...prev, [invId]: val }));
    };

    const handleSubmit = async () => {
        if (!selectedCustomer) return toast.error('Select customer');
        if (form.amount <= 0) return toast.error('Enter amount greater than 0');

        const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + Number(v), 0);
        if (totalAllocated > form.amount) {
            return toast.error('Allocations exceed total payment amount');
        }

        const allocArray = Object.entries(allocations)
            .filter(([_, amt]) => amt > 0)
            .map(([invId, amt]) => ({ invoice_id: invId, amount: amt }));

        try {
            await api.post('/crm/receivables/collect', {
                customer_id: selectedCustomer,
                ...form,
                allocations: allocArray
            });
            toast.success(isRTL ? 'تم تحصيل الدفعة بنجاح' : 'Payment collected successfully');
            setForm({...form, amount: 0, transaction_id: '', notes: ''});
            setAllocations({});
            // Reload invoices
            loadInvoices();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Error collecting payment');
        }
    };

    const allocatedTotal = Object.values(allocations).reduce((sum, v) => sum + Number(v), 0);
    const unallocated = Number(form.amount) - allocatedTotal;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">{isRTL ? 'تحصيل المديونيات' : 'Collect Payment'}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <Card className="p-5">
                        <h2 className="font-semibold mb-4 border-b pb-2">{isRTL ? 'تفاصيل الدفعة' : 'Payment Details'}</h2>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm mb-1">{isRTL ? 'العميل' : 'Customer'}</label>
                                <select className="input-field w-full" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                                    <option value="">{isRTL ? 'اختر العميل...' : 'Select Customer...'}</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm mb-1">{isRTL ? 'المبلغ' : 'Amount'}</label>
                                <input type="number" min="0" step="0.01" className="input-field w-full font-bold text-lg text-blue-600" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} />
                            </div>

                            <div>
                                <label className="block text-sm mb-1">{isRTL ? 'طريقة الدفع' : 'Payment Method'}</label>
                                <select className="input-field w-full" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                                    <option value="cash">{isRTL ? 'كاش' : 'Cash'}</option>
                                    <option value="card">{isRTL ? 'بطاقة ائتمان / مدى' : 'Card / Mada'}</option>
                                    <option value="bank_transfer">{isRTL ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                                </select>
                            </div>

                            {form.payment_method !== 'cash' && (
                                <>
                                    <div>
                                        <label className="block text-sm mb-1">{isRTL ? 'اسم البنك' : 'Bank Name'}</label>
                                        <input type="text" className="input-field w-full" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">{isRTL ? 'رقم العملية' : 'Transaction ID'}</label>
                                        <input type="text" className="input-field w-full" value={form.transaction_id} onChange={e => setForm({...form, transaction_id: e.target.value})} />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                                <textarea className="input-field w-full" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t">
                            <div className="flex justify-between text-sm mb-2">
                                <span>{isRTL ? 'المبلغ المخصص:' : 'Allocated:'}</span>
                                <span className="font-semibold text-emerald-600">{allocatedTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-4">
                                <span>{isRTL ? 'غير مخصص (يبقى في الرصيد):' : 'Unallocated (Saved to balance):'}</span>
                                <span className="font-semibold text-blue-600">{unallocated.toFixed(2)}</span>
                            </div>
                            <button onClick={handleSubmit} className="btn-primary w-full py-3 text-lg" disabled={form.amount <= 0 || unallocated < 0}>
                                {isRTL ? 'تأكيد التحصيل' : 'Confirm Payment'}
                            </button>
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card className="p-5 h-full">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h2 className="font-semibold">{isRTL ? 'الفواتير المستحقة' : 'Due Invoices'}</h2>
                            {invoices.length > 0 && (
                                <button onClick={handleAllocateAll} className="text-sm text-blue-600 hover:underline">
                                    {isRTL ? 'تخصيص تلقائي للأقدم' : 'Auto-allocate to oldest'}
                                </button>
                            )}
                        </div>

                        {loadingInvoices ? (
                            <div className="space-y-3">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={`sk-${i}`} className="border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-white/5">
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-1/3" />
                                            <Skeleton className="h-3 w-2/3" />
                                        </div>
                                        <Skeleton className="h-9 w-full sm:w-1/3" />
                                    </div>
                                ))}
                            </div>
                        ) : loadError ? (
                            <div className="text-center py-20">
                                <p className="mb-3 text-sm text-red-600">{isRTL ? 'تعذّر تحميل الفواتير المستحقة.' : 'Failed to load due invoices.'}</p>
                                <button onClick={() => loadInvoices()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                            </div>
                        ) : !selectedCustomer ? (
                            <div className="text-center py-20 text-slate-400">
                                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <p>{isRTL ? 'اختر عميلاً لعرض الفواتير المستحقة' : 'Select a customer to view due invoices'}</p>
                            </div>
                        ) : invoices.length === 0 ? (
                            <div className="text-center py-20 text-emerald-500">
                                <p className="text-xl font-bold">{isRTL ? 'لا توجد فواتير مستحقة!' : 'No due invoices!'}</p>
                                <p className="text-sm mt-2">{isRTL ? 'هذا العميل قام بسداد جميع فواتيره.' : 'This customer has paid all invoices.'}</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {invoices.map(inv => {
                                    const due = Number(inv.total) - Number(inv.paid_amount);
                                    const alloc = allocations[inv.id] || '';
                                    return (
                                        <div key={inv.id} className="border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-white/5">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold">{inv.invoice_number}</span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                                        {due.toFixed(2)} SAR {isRTL ? 'متبقي' : 'Due'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {isRTL ? 'الإجمالي:' : 'Total:'} {Number(inv.total).toFixed(2)} | 
                                                    {isRTL ? ' التاريخ:' : ' Date:'} {inv.invoice_date} | 
                                                    {isRTL ? ' الاستحقاق:' : ' Due:'} <span className={new Date(inv.due_date) < new Date() ? 'text-red-500 font-bold' : ''}>{inv.due_date || '-'}</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 w-full sm:w-1/3">
                                                <span className="text-xs whitespace-nowrap">{isRTL ? 'تخصيص' : 'Allocate'}:</span>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max={due} 
                                                    step="0.01"
                                                    className="input-field w-full text-end" 
                                                    placeholder="0.00"
                                                    value={alloc}
                                                    onChange={e => handleAllocationChange(inv.id, parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
