'use client';

import React from 'react';
import { useInvoiceForm } from './InvoiceFormContext';
import { CreditCard, AlertCircle } from 'lucide-react';

export function PaymentSection() {
  const { isRTL, form, setForm } = useInvoiceForm();

  return (
    <div className="bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-500"/> 
          {isRTL ? 'طريقة الدفع' : 'Payment Method'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            {isRTL ? 'نوع الدفع' : 'Payment Type'}
          </label>
          <select 
            value={form.type} 
            onChange={e => setForm({...form, type: e.target.value})} 
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          >
            <option value="cash">{isRTL ? 'نقدي (كاش)' : 'Cash'}</option>
            <option value="credit">{isRTL ? 'آجل (ذمم)' : 'Credit / On Account'}</option>
          </select>
        </div>

        {form.type === 'credit' && (
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
              {isRTL ? 'مبلغ الدفعة المقدمة (إن وجد)' : 'Down Payment Amount (If any)'}
            </label>
            <div className="relative">
              <input 
                type="number" 
                min="0" 
                value={form.paid_amount || ''} 
                onChange={e => setForm({...form, paid_amount: parseFloat(e.target.value) || 0})} 
                className="w-full pe-12 ps-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white" 
                placeholder="0.00" 
              />
              <span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">SAR</span>
            </div>
          </div>
        )}
      </div>

      {form.type === 'credit' && (
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
              {isRTL ? 'تحذير الائتمان' : 'Credit Limit Warning'}
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.credit_limit_override} 
                onChange={e => setForm({...form, credit_limit_override: e.target.checked})} 
                className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500" 
              />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300/80">
                {isRTL ? 'السماح بتجاوز الحد الائتماني للعميل (يتطلب صلاحية مدير)' : 'Override Credit Limit (Requires Manager Permission)'}
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
