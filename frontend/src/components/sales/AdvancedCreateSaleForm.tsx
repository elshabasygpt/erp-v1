'use client';

import React from 'react';
import { InvoiceFormProvider, useInvoiceForm } from './create/InvoiceFormContext';
import { CustomerSection } from './create/CustomerSection';
import { InvoiceMetaSection } from './create/InvoiceMetaSection';
import { ProductsTable } from './create/ProductsTable';
import { PaymentSection } from './create/PaymentSection';
import { NotesSection } from './create/NotesSection';
import { InvoiceSummarySidebar } from './create/InvoiceSummarySidebar';
import { StickyActionFooter } from './create/StickyActionFooter';
import { Printer } from 'lucide-react';

function PrintPreviewModal() {
  const { isRTL, showPrintPreview, savedInvoiceData, products, handlePrintConfirm, handlePrintSkip } = useInvoiceForm();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPrintPreview) {
        handlePrintSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPrintPreview, handlePrintSkip]);

  if (!showPrintPreview || !savedInvoiceData) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:bg-white print:p-0 print:block">
      <div className="bg-white dark:bg-[#1a1a2e] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:h-auto print:max-w-full print:max-h-none">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10 print:hidden">
          <h3 className="font-bold text-slate-800 dark:text-white">{isRTL ? 'معاينة الطباعة' : 'Print Preview'}</h3>
          <div className="flex gap-3">
            <button onClick={handlePrintConfirm} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md"><Printer className="w-4 h-4"/> {isRTL ? 'طباعة الان' : 'Print Now'}</button>
            <button onClick={handlePrintSkip} className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold transition-all">{isRTL ? 'تخطي' : 'Skip'}</button>
          </div>
        </div>
        <div className="p-10 print:p-0 overflow-y-auto">
          <div className="text-center mb-8 border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-black text-slate-800">{isRTL ? 'فاتورة ضريبية' : 'Tax Invoice'}</h1>
            <p className="text-sm mt-2 text-slate-500 font-bold">NO: {savedInvoiceData.invoice_number}</p>
            <p className="text-sm text-slate-500">{savedInvoiceData.invoice_date}</p>
          </div>
          <table className="w-full text-sm mb-8 text-slate-800">
            <thead className="border-b-2 border-slate-300 text-start">
              <tr>
                <th className="py-3 text-start font-black">{isRTL ? 'الصنف' : 'Item'}</th>
                <th className="py-3 text-center font-black">Qty</th>
                <th className="py-3 text-center font-black">Price</th>
                <th className="py-3 text-end font-black">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {savedInvoiceData.items?.map((item: any, i: number) => {
                  const itemNet = (item.quantity * item.unit_price) * (1 - (item.discount_percent / 100));
                  const itemTotal = itemNet * (1 + (item.vat_rate / 100));
                  return (
                    <tr key={i}>
                      <td className="py-3 font-bold">{products.find(p => p.id === item.product_id)?.name || 'Unknown Item'}</td>
                      <td className="py-3 text-center">{item.quantity}</td>
                      <td className="py-3 text-center">{item.unit_price}</td>
                      <td className="py-3 text-end font-bold">{itemTotal.toFixed(2)}</td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
          <div className="border-t-2 border-slate-300 pt-6 space-y-2 text-sm flex flex-col items-end text-slate-800">
            <div className="flex w-64 justify-between font-bold"><span>{isRTL ? 'المجموع الفرعي' : 'Subtotal'}:</span> <span>{savedInvoiceData.subtotal.toFixed(2)}</span></div>
            <div className="flex w-64 justify-between font-bold"><span>{isRTL ? 'الضريبة المضافة' : 'VAT'}:</span> <span>{savedInvoiceData.vat_amount.toFixed(2)}</span></div>
            <div className="flex w-64 justify-between font-black text-xl pt-4 border-t border-slate-200 mt-2"><span>{isRTL ? 'الإجمالي' : 'Total'}:</span> <span>{savedInvoiceData.total.toFixed(2)}</span></div>
          </div>
          <div className="mt-12 text-center text-sm font-bold text-slate-400">
              {isRTL ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceFormLayout() {
  const { isRTL, items } = useInvoiceForm();

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (items.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [items]);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`min-h-screen bg-slate-50 dark:bg-[#0a0a10] pb-32 animate-in fade-in duration-500 print:bg-white print:p-0 ${isRTL ? 'font-sans' : ''}`}>
      
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-white/5 px-4 sm:px-6 lg:px-8 py-6 mb-8 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              {isRTL ? 'إنشاء فاتورة مبيعات' : 'Create Sales Invoice'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
              {isRTL ? 'يرجى إدخال تفاصيل الفاتورة بدقة لإتمام عملية البيع بنجاح' : 'Enter invoice details accurately to process the sale'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:hidden">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* MAIN FORM COLUMNS (70%) */}
          <div className="flex-1 space-y-8">
            <CustomerSection />
            <InvoiceMetaSection />
            <ProductsTable />
            <PaymentSection />
            <NotesSection />
          </div>

          {/* SIDEBAR SUMMARY (30%) */}
          <div className="w-full lg:w-[380px] shrink-0">
            <InvoiceSummarySidebar />
          </div>

        </div>
      </div>

      <StickyActionFooter />
      <PrintPreviewModal />
    </div>
  );
}

export default function AdvancedCreateSaleForm() {
  return (
    <InvoiceFormProvider>
      <InvoiceFormLayout />
    </InvoiceFormProvider>
  );
}
