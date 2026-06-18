import React, { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api';
import { X, Loader2, Package, Check, Link2 } from 'lucide-react';

interface PosAlternativesModalProps {
  product: any;
  isRTL: boolean;
  onClose: () => void;
  onAddAlternative: (altProduct: any) => void;
}

export function PosAlternativesModal({ product, isRTL, onClose, onAddAlternative }: PosAlternativesModalProps) {
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlternatives();
  }, [product.id]);

  const loadAlternatives = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getAlternatives(product.id);
      // Ensure we format the stock properly based on warehouseStocks or quantity
      const data = res.data?.data || res.data;
      setAlternatives(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content !max-w-3xl !bg-slate-50 dark:!bg-[#0f0f17]">
        <div className="p-5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#151522] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">
                {isRTL ? 'القطع البديلة والمطابقات' : 'Alternative Products'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-white/50">
                {isRTL ? `لبديل المنتج: ${product.name_ar || product.name}` : `Alternatives for: ${product.name}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
              <p className="text-sm font-bold text-slate-500 dark:text-white/50">
                {isRTL ? 'جاري البحث عن بدائل...' : 'Searching for alternatives...'}
              </p>
            </div>
          ) : alternatives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-16 h-16 text-slate-300 dark:text-white/10 mb-4" />
              <h3 className="text-lg font-black text-slate-700 dark:text-white/80 mb-2">
                {isRTL ? 'لا توجد بدائل مسجلة' : 'No alternatives found'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-white/50 max-w-md">
                {isRTL 
                  ? 'لم يتم ربط أي قطع بديلة بهذا المنتج حتى الآن. يمكنك إضافتها من شاشة إدارة المخزون.'
                  : 'No alternatives have been linked to this product yet. You can add them from the inventory management screen.'}
              </p>
              <button onClick={onClose} className="btn-secondary mt-6 px-6">
                {isRTL ? 'حسناً' : 'OK'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alternatives.map((alt) => {
                // Calculate stock (this might vary depending on how API returns it)
                const stockQty = alt.stock_quantity !== undefined ? alt.stock_quantity : (alt.quantity || 0);
                const outOfStock = stockQty <= 0;
                
                return (
                  <div 
                    key={alt.id}
                    className={`flex flex-col p-4 rounded-2xl border transition-all ${
                      outOfStock 
                        ? 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 opacity-75' 
                        : 'bg-white dark:bg-[#151522] border-blue-200 dark:border-blue-500/30 shadow-md hover:border-blue-500 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex gap-4 mb-3">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {alt.image_url ? (
                          <img src={alt.image_url} alt="" className="w-full h-full object-cover"/>
                        ) : (
                          <Package className="w-8 h-8 text-slate-300 dark:text-white/20" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-2 leading-tight mb-1">
                          {isRTL ? (alt.name_ar || alt.name) : alt.name}
                        </h3>
                        <p className="text-xs font-mono text-slate-500 dark:text-white/50 mb-2">
                          {alt.code}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                            {parseFloat(alt.price).toLocaleString()} <span className="text-[10px] text-slate-400">SAR</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          outOfStock 
                            ? 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400' 
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                        }`}>
                          {isRTL ? 'المخزون:' : 'Stock:'} {stockQty}
                        </span>
                        {alt.brand && <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70">{alt.brand}</span>}
                      </div>
                      
                      <button 
                        disabled={outOfStock}
                        onClick={() => {
                          onAddAlternative(alt);
                          onClose();
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          outOfStock 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-white/5 dark:text-white/30' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30'
                        }`}
                      >
                        {outOfStock ? (
                          isRTL ? 'غير متوفر' : 'Out of stock'
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            {isRTL ? 'اختيار كبديل' : 'Select Alternative'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
