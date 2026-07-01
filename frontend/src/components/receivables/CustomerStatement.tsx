'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import Skeleton from '@/components/ui/Skeleton';

export default function CustomerStatement({ isRTL }: { isRTL: boolean }) {
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [statement, setStatement] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    
    const [filters, setFilters] = useState({
        from_date: '',
        to_date: ''
    });

    const extractArray = (res: any) => {
        const data = res.data?.data?.data || res.data?.data || res.data || [];
        return Array.isArray(data) ? data : [];
    };

    useEffect(() => {
        api.get('/crm/customers').then(res => setCustomers(extractArray(res)));
    }, []);

    const fetchStatement = () => {
        if (!selectedCustomer) return;
        setLoading(true);
        setLoadError(false);
        const query = new URLSearchParams(filters).toString();
        api.get(`/crm/receivables/statement/${selectedCustomer}?${query}`)
            .then(res => setStatement(res.data?.data || []))
            .catch(() => setLoadError(true))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchStatement();
    }, [selectedCustomer]);

    const handlePrint = () => {
        window.print();
    };

    const customerData = customers.find(c => c.id === selectedCustomer);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-2xl font-bold">{isRTL ? 'كشف حساب عميل' : 'Customer Statement'}</h1>
                <button onClick={handlePrint} className="btn-secondary flex items-center gap-2" disabled={!selectedCustomer}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    {isRTL ? 'طباعة الكشف' : 'Print Statement'}
                </button>
            </div>

            <Card className="p-5 mb-6 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-sm mb-1 font-semibold">{isRTL ? 'اختر العميل' : 'Select Customer'}</label>
                        <select className="input-field w-full" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                            <option value="">{isRTL ? 'اختر...' : 'Select...'}</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm mb-1">{isRTL ? 'من تاريخ' : 'From Date'}</label>
                        <input type="date" className="input-field w-full" value={filters.from_date} onChange={e => setFilters({...filters, from_date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">{isRTL ? 'إلى تاريخ' : 'To Date'}</label>
                        <div className="flex gap-2">
                            <input type="date" className="input-field w-full" value={filters.to_date} onChange={e => setFilters({...filters, to_date: e.target.value})} />
                            <button onClick={fetchStatement} className="btn-primary whitespace-nowrap">{isRTL ? 'تحديث' : 'Refresh'}</button>
                        </div>
                    </div>
                </div>
            </Card>

            {selectedCustomer && customerData && (
                <Card className="p-8 bg-white dark:bg-black/40 text-black dark:text-white print:shadow-none print:border-none print:p-0">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold uppercase tracking-wider">{isRTL ? 'كشف حساب' : 'Statement of Account'}</h2>
                    </div>

                    <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">{isRTL ? 'بيانات العميل:' : 'Customer Details:'}</p>
                            <h3 className="text-xl font-bold">{customerData.name}</h3>
                            {customerData.phone && <p className="text-sm mt-1">{customerData.phone}</p>}
                            {customerData.tax_number && <p className="text-sm mt-1">{isRTL ? 'الرقم الضريبي:' : 'VAT:'} {customerData.tax_number}</p>}
                        </div>
                        <div className="text-end">
                            <p className="text-sm text-gray-500 mb-1">{isRTL ? 'الرصيد الحالي المستحق:' : 'Current Due Balance:'}</p>
                            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{Number(customerData.balance).toFixed(2)} SAR</h3>
                        </div>
                    </div>

                    <div className="overflow-x-auto"><table className="w-full text-start text-sm">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                                <th className="p-3 font-semibold text-start">{isRTL ? 'التاريخ' : 'Date'}</th>
                                <th className="p-3 font-semibold text-start">{isRTL ? 'النوع' : 'Type'}</th>
                                <th className="p-3 font-semibold text-start">{isRTL ? 'رقم المرجع' : 'Reference'}</th>
                                <th className="p-3 font-semibold text-start">{isRTL ? 'البيان' : 'Description'}</th>
                                <th className="p-3 font-semibold text-end">{isRTL ? 'مدين (مبيعات)' : 'Debit (Sales)'}</th>
                                <th className="p-3 font-semibold text-end">{isRTL ? 'دائن (سداد)' : 'Credit (Paid)'}</th>
                                <th className="p-3 font-semibold text-end">{isRTL ? 'الرصيد' : 'Balance'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={`sk-${i}`} className="border-b">
                                        {Array.from({ length: 7 }).map((__, j) => (
                                            <td key={j} className="p-3"><Skeleton className="w-3/4 h-4" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : loadError ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center">
                                        <p className="mb-3 text-sm text-red-600">{isRTL ? 'تعذّر تحميل كشف الحساب.' : 'Failed to load statement.'}</p>
                                        <button onClick={() => fetchStatement()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                                    </td>
                                </tr>
                            ) : statement.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">{isRTL ? 'لا توجد حركات مسجلة' : 'No transactions found'}</td></tr>
                            ) : (
                                statement.map((row, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="p-3">{row.date}</td>
                                        <td className="p-3">
                                            {row.type === 'invoice' 
                                                ? <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">{isRTL ? 'فاتورة' : 'Invoice'}</span>
                                                : <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded">{isRTL ? 'سداد' : 'Payment'}</span>
                                            }
                                        </td>
                                        <td className="p-3 font-medium">{row.reference}</td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400">{row.description || '-'}</td>
                                        <td className="p-3 text-end font-medium text-red-600">{Number(row.debit) > 0 ? Number(row.debit).toFixed(2) : '-'}</td>
                                        <td className="p-3 text-end font-medium text-emerald-600">{Number(row.credit) > 0 ? Number(row.credit).toFixed(2) : '-'}</td>
                                        <td className="p-3 text-end font-bold" dir="ltr">{Number(row.running_balance).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table></div>
                </Card>
            )}
        </div>
    );
}
