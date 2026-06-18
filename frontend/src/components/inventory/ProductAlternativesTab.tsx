import React, { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api';
import { Link2, Search, X, Loader2, Package } from 'lucide-react';

interface ProductAlternativesTabProps {
  productId: string;
  isRTL: boolean;
}

export function ProductAlternativesTab({ productId, isRTL }: ProductAlternativesTabProps) {
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Quick Add states
  const [q, setQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadAlternatives();
  }, [productId]);

  const loadAlternatives = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getAlternatives(productId);
      setAlternatives(res.data?.data || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (val: string) => {
    setQ(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await inventoryApi.searchProducts(val);
      // Exclude current product from results
      const results = (res.data?.data || res.data).filter((p: any) => p.id !== productId);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleAttach = async (alternativeId: string) => {
    try {
      await inventoryApi.attachAlternative(productId, alternativeId);
      await loadAlternatives();
      setQ('');
      setSearchResults([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDetach = async (alternativeId: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return;
    try {
      await inventoryApi.detachAlternative(productId, alternativeId);
      await loadAlternatives();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and Attach */}
      <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
        <label className="block text-xs font-bold mb-2 text-slate-700 dark:text-white">
          {isRTL ? 'إضافة قطعة بديلة' : 'Add Alternative Product'}
        </label>
        <div className="relative">
          <div className="flex items-center bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 rounded-lg px-3 focus-within:border-blue-500 transition-colors">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text"
              value={q}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={isRTL ? 'ابحث باسم المنتج، الكود، أو الباركود...' : 'Search by name, code, or barcode...'}
              className="w-full h-10 bg-transparent border-none outline-none px-3 text-sm"
            />
            {searching && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 rounded-lg shadow-xl z-10">
              {searchResults.map(res => {
                const isAttached = alternatives.some(a => a.id === res.id);
                return (
                  <div key={res.id} className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                        {res.image_url ? <img src={res.image_url} alt="" className="w-full h-full object-cover"/> : <Package className="w-5 h-5 text-slate-400" />}
                      </div>
                      <div>
                        <span className="text-sm font-bold line-clamp-1">{isRTL ? (res.name_ar || res.name) : res.name}</span>
                        <span className="text-xs text-slate-500 dark:text-white/50">{res.code}</span>
                      </div>
                    </div>
                    <button 
                      disabled={isAttached}
                      onClick={() => handleAttach(res.id)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                    >
                      {isAttached ? (isRTL ? 'مضاف' : 'Attached') : (isRTL ? 'إضافة' : 'Add')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-white">
          <Link2 className="w-4 h-4 text-blue-500" />
          {isRTL ? 'القطع البديلة المرتبطة' : 'Linked Alternatives'}
        </h3>
        {alternatives.length === 0 ? (
          <div className="text-center py-8 text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-white/10">
            {isRTL ? 'لا يوجد قطع بديلة مرتبطة بهذا المنتج' : 'No alternatives attached to this product'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {alternatives.map(alt => (
              <div key={alt.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151522] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                    {alt.image_url ? <img src={alt.image_url} alt="" className="w-full h-full object-cover"/> : <Package className="w-6 h-6 text-slate-400" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm line-clamp-1 text-slate-800 dark:text-white">{isRTL ? (alt.name_ar || alt.name) : alt.name}</p>
                    <div className="flex gap-2 text-xs font-mono text-slate-500 dark:text-white/50 mt-1">
                      <span>{alt.code}</span>
                      {alt.brand && <span className="bg-slate-100 dark:bg-white/10 px-1 rounded">{alt.brand}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDetach(alt.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
