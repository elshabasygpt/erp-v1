'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useInvoiceForm } from './InvoiceFormContext';
import { Search, Trash2, Package, Link2 } from 'lucide-react';
import { PosAlternativesModal } from '@/components/pos/PosAlternativesModal';

export function ProductsTable() {
  const {
    isRTL, items, products, addItem, updateItem, removeItem
  } = useInvoiceForm();

  const [searchProduct, setSearchProduct] = useState('');
  const [alternativesProduct, setAlternativesProduct] = useState<any>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchProduct('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddItem = (p: any) => {
    addItem(p);
    setSearchProduct('');
  };

  return (
    <div className="bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-500"/> 
          {isRTL ? 'المنتجات' : 'Products'}
        </h3>
      </div>

      <div className="relative mb-6" ref={searchRef}>
        <Search className="w-5 h-5 absolute top-1/2 -translate-y-1/2 start-4 text-blue-500" />
        <input 
          type="text" 
          placeholder={isRTL ? 'ابحث عن منتج أو امسح الباركود...' : 'Search product or scan barcode...'}
          value={searchProduct}
          onChange={(e) => setSearchProduct(e.target.value)}
          className="w-full ps-12 pe-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-blue-200 dark:border-blue-500/30 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-white font-bold transition-all shadow-sm"
        />
        {searchProduct && (
          <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#1e1e36] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto custom-scrollbar">
            {products.filter(p => 
              (p.name && p.name.toLowerCase().includes(searchProduct.toLowerCase())) || 
              (p.name_ar && p.name_ar.includes(searchProduct)) || 
              (p.sku && p.sku.includes(searchProduct)) || 
              (p.barcode && p.barcode.includes(searchProduct))
            ).map(p => (
              <button key={p.id} onClick={() => handleAddItem(p)} className="w-full text-start px-4 py-3 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 flex justify-between items-center gap-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-white/10">
                      {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white">{isRTL ? (p.name_ar || p.name) : p.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 tracking-wider">{p.sku || p.barcode}</div>
                  </div>
                </div>
                <div className="font-black text-blue-600 dark:text-blue-400 text-lg">{p.sell_price || 0} <span className="text-[10px] text-slate-400">SAR</span></div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto min-h-[250px] border border-slate-200 dark:border-white/5 rounded-xl">
        <table className="w-full text-sm text-left rtl:text-right text-slate-500 dark:text-slate-400">
          <thead className="text-[10px] text-slate-500 uppercase bg-slate-100/50 dark:bg-white/5 font-black tracking-widest border-b border-slate-200 dark:border-white/5">
            <tr>
              <th className="px-4 py-4">{isRTL ? 'المنتج' : 'Product'}</th>
              <th className="px-4 py-4 w-28">{isRTL ? 'السعر' : 'Price'}</th>
              <th className="px-4 py-4 w-24">{isRTL ? 'الكمية' : 'Qty'}</th>
              <th className="px-4 py-4 w-24">{isRTL ? 'الخصم %' : 'Disc %'}</th>
              <th className="px-4 py-4 w-24">{isRTL ? 'الضريبة %' : 'Tax %'}</th>
              <th className="px-4 py-4 w-32 text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
              <th className="px-4 py-4 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {items.map((item, index) => {
              const itemNet = (item.quantity * item.unit_price) * (1 - (item.discount_percent / 100));
              const itemTotal = itemNet * (1 + (item.vat_rate / 100));
              return (
                <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group/row">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.printed_name ?? item.name}
                      onChange={e => updateItem(index, 'printed_name', e.target.value)}
                      className="w-full bg-transparent border-b border-dashed border-slate-300 dark:border-white/20 outline-none text-slate-800 dark:text-white font-bold focus:border-blue-500 transition-colors pb-0.5"
                      title={isRTL ? 'اسم الصنف في الفاتورة' : 'Item name on invoice'}
                    />
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 tracking-wider">{item.code}</span>
                      {item.stock === 0 && (
                        <button
                          type="button"
                          onClick={() => setAlternativesProduct({ id: item.product_id, name: item.name, name_ar: item.name })}
                          className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:hover:bg-orange-500/30 transition-colors"
                          title={isRTL ? 'عرض القطع البديلة' : 'Show alternatives'}
                        >
                          <Link2 className="w-2.5 h-2.5" />
                          {isRTL ? 'بدائل' : 'Alternatives'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="0" step="any" value={item.unit_price} onChange={e=>updateItem(index, 'unit_price', Math.max(0, Number(e.target.value)))} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="1" step="any" value={item.quantity} onChange={e=>updateItem(index, 'quantity', Math.max(1, Number(e.target.value)))} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="0" max="100" step="any" value={item.discount_percent} onChange={e=>updateItem(index, 'discount_percent', Math.min(100, Math.max(0, Number(e.target.value))))} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="0" step="any" value={item.vat_rate} onChange={e=>updateItem(index, 'vat_rate', Math.max(0, Number(e.target.value)))} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  </td>
                  <td className="px-4 py-3 font-black text-end text-slate-800 dark:text-white text-base">
                    {itemTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => removeItem(index)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2 rounded-xl transition-all opacity-100 md:opacity-0 md:group-hover/row:opacity-100">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-20 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                    <Package className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-bold tracking-wide">{isRTL ? 'لم يتم إضافة منتجات بعد. ابحث عن منتج للإضافة.' : 'No items added yet. Search for a product to add.'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {alternativesProduct && (
        <PosAlternativesModal
          product={alternativesProduct}
          isRTL={isRTL}
          onClose={() => setAlternativesProduct(null)}
          onAddAlternative={(alt) => {
            addItem(alt);
            setAlternativesProduct(null);
          }}
        />
      )}
    </div>
  );
}
