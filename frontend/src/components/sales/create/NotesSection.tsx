'use client';

import React from 'react';
import { useInvoiceForm } from './InvoiceFormContext';
import { AlignLeft } from 'lucide-react';

export function NotesSection() {
  const { isRTL, form, setForm } = useInvoiceForm();

  return (
    <div className="bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <AlignLeft className="w-5 h-5 text-blue-500"/> 
          {isRTL ? 'ملاحظات الفاتورة' : 'Invoice Notes'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            {isRTL ? 'ملاحظات للعميل (تظهر في الفاتورة المطبوعة)' : 'Customer Notes (Visible on Printed Invoice)'}
          </label>
          <textarea 
            value={form.notes} 
            onChange={e => setForm({...form, notes: e.target.value})} 
            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white resize-none" 
            rows={3} 
            placeholder={isRTL ? 'مثال: شكراً لتعاملكم معنا...' : 'Example: Thank you for your business...'}
          />
        </div>
        
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            {isRTL ? 'ملاحظات داخلية (لا تظهر للعميل)' : 'Internal Notes (Hidden from Customer)'}
          </label>
          <textarea 
            value={form.internal_notes} 
            onChange={e => setForm({...form, internal_notes: e.target.value})} 
            className="w-full px-4 py-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-500/20 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-800 dark:text-white resize-none" 
            rows={3} 
            placeholder={isRTL ? 'ملاحظات لموظفي المبيعات...' : 'Notes for sales staff...'}
          />
        </div>
      </div>
    </div>
  );
}
