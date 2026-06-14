'use client';

import React from 'react';
import { useInvoiceForm } from './InvoiceFormContext';
import { UserPlus } from 'lucide-react';

export function CustomerSection() {
  const { isRTL, form, setForm, customers } = useInvoiceForm();
  
  const selectedCustomer = customers.find(c => c.id === form.customer_id);

  return (
    <div className="bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-500"/> 
          {isRTL ? 'بيانات العميل' : 'Customer Info'}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            {isRTL ? 'العميل (اختياري للنقدي)' : 'Customer (Optional for Cash)'}
          </label>
          <select 
            value={form.customer_id} 
            onChange={e => setForm({...form, customer_id: e.target.value})} 
            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">{isRTL ? 'عميل نقدي سريع' : 'Walk-in Cash Customer'}</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || c.email || 'N/A'})</option>)}
          </select>
        </div>

        {selectedCustomer && (
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10 rounded-xl border border-blue-100 dark:border-blue-500/20 flex flex-col justify-center">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">{isRTL ? 'الرصيد الحالي:' : 'Current Balance:'}</span>
              <span className="font-black text-slate-800 dark:text-white">{selectedCustomer.balance} SAR</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-blue-600 dark:text-blue-400 font-bold">{isRTL ? 'الحد الائتماني:' : 'Credit Limit:'}</span>
              <span className="font-black text-slate-800 dark:text-white">{selectedCustomer.credit_limit || 0} SAR</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
