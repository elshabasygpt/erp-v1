'use client';

import React from 'react';
import { useInvoiceForm } from './InvoiceFormContext';
import { Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export function StickyActionFooter() {
  const { isRTL, locale, loading, handleSubmit, items } = useInvoiceForm();

  const canConfirm = items.length > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#111118]/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">

        <div className="flex items-center gap-3">
          <Link href={`/${locale}/dashboard/sales/list`} className="px-6 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold transition-all flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Link>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            disabled={loading}
            onClick={() => handleSubmit('draft')}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isRTL ? 'حفظ كمسودة' : 'Save Draft'}
          </button>

          <button
            disabled={loading || !canConfirm}
            onClick={() => handleSubmit('confirmed')}
            className="flex-1 sm:flex-none px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:-translate-y-0 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {isRTL ? 'تأكيد الفاتورة' : 'Confirm Invoice'}
          </button>
        </div>

      </div>
    </div>
  );
}
