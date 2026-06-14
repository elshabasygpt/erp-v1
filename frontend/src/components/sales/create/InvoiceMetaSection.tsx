'use client';

import React from 'react';
import { useInvoiceForm } from './InvoiceFormContext';
import { FileText } from 'lucide-react';

export function InvoiceMetaSection() {
  const { isRTL, form, setForm, branches, warehouses, salesChannels } = useInvoiceForm();

  return (
    <div className="bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-5">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500"/> 
          {isRTL ? 'تفاصيل الفاتورة' : 'Invoice Details'}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            {isRTL ? 'الفرع' : 'Branch'}
          </label>
          <select 
            value={form.branch_id} 
            onChange={e => setForm({...form, branch_id: e.target.value})} 
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          >
            <option value="">{isRTL ? 'اختر الفرع' : 'Select Branch'}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            {isRTL ? 'المستودع *' : 'Warehouse *'}
          </label>
          <select 
            value={form.warehouse_id} 
            onChange={e => setForm({...form, warehouse_id: e.target.value})} 
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          >
            <option value="">{isRTL ? 'اختر المستودع' : 'Select Warehouse'}</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            {isRTL ? 'قناة البيع' : 'Sales Channel'}
          </label>
          <select 
            value={form.sales_channel_id} 
            onChange={e => setForm({...form, sales_channel_id: e.target.value})} 
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          >
            <option value="">{isRTL ? 'المتجر (افتراضي)' : 'In-Store (Default)'}</option>
            {salesChannels.map(c => <option key={c.id} value={c.id}>{c.name} {c.pricing_method === 'percentage' ? `(+${c.markup_percentage}%)` : `(+${c.fixed_markup})`}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            {isRTL ? 'تاريخ الفاتورة' : 'Invoice Date'}
          </label>
          <input 
            type="date" 
            value={form.invoice_date} 
            onChange={e => setForm({...form, invoice_date: e.target.value})} 
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white" 
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            {isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}
          </label>
          <input 
            type="date" 
            value={form.due_date} 
            onChange={e => setForm({...form, due_date: e.target.value})} 
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white" 
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            {isRTL ? 'رقم مرجعي' : 'Reference No'}
          </label>
          <input 
            type="text" 
            value={form.reference_no} 
            onChange={e => setForm({...form, reference_no: e.target.value})} 
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white" 
            placeholder="PO-12345" 
          />
        </div>
      </div>
    </div>
  );
}
