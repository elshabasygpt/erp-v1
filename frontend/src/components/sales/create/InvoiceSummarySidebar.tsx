'use client';

import React from 'react';
import { useInvoiceForm } from './InvoiceFormContext';
import { Calculator } from 'lucide-react';

export function InvoiceSummarySidebar() {
  const { isRTL, subtotal, discountTotal, taxTotal, grandTotal, dueAmount, form } = useInvoiceForm();

  return (
    <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden sticky top-6">
      <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-lg">
          <Calculator className="w-5 h-5 text-blue-500"/> 
          {isRTL ? 'ملخص الفاتورة' : 'Invoice Summary'}
        </h3>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500 font-bold">{isRTL ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
          <span className="font-black text-slate-800 dark:text-white tracking-wide">{subtotal.toFixed(2)} SAR</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500 font-bold">{isRTL ? 'إجمالي الخصومات:' : 'Total Discounts:'}</span>
          <span className="font-black text-rose-500 tracking-wide">-{discountTotal.toFixed(2)} SAR</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500 font-bold">{isRTL ? 'الضريبة المضافة (VAT):' : 'Total VAT:'}</span>
          <span className="font-black text-slate-800 dark:text-white tracking-wide">{taxTotal.toFixed(2)} SAR</span>
        </div>

        <div className="h-px w-full bg-slate-200 dark:bg-white/10 my-4" />

        <div className="flex justify-between items-center">
          <span className="text-base font-black text-slate-800 dark:text-white">{isRTL ? 'الإجمالي الكلي:' : 'Grand Total:'}</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{grandTotal.toFixed(2)} <span className="text-xs text-blue-400/70">SAR</span></span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 space-y-3 mt-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 font-bold">{isRTL ? 'المدفوع:' : 'Paid Amount:'}</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400">{(form.type === 'cash' ? grandTotal : form.paid_amount).toFixed(2)} SAR</span>
          </div>
          {form.type === 'credit' && (
            <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-200 dark:border-white/10">
              <span className="text-slate-500 font-bold">{isRTL ? 'المتبقي (الآجل):' : 'Due Amount:'}</span>
              <span className={`font-black ${dueAmount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{dueAmount.toFixed(2)} SAR</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
