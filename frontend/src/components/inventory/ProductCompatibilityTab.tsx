import React, { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api';
import { Car, Search, Plus, X, Loader2 } from 'lucide-react';

interface ProductCompatibilityTabProps {
  productId: string;
  isRTL: boolean;
}

export function ProductCompatibilityTab({ productId, isRTL }: ProductCompatibilityTabProps) {
  const [compatibleVehicles, setCompatibleVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Quick Add states
  const [q, setQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadCompatibility();
  }, [productId]);

  const loadCompatibility = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getProductCompatibility(productId);
      setCompatibleVehicles(res.data?.data || res.data);
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
      const res = await inventoryApi.vehicleQuickLookup(val);
      setSearchResults(res.data?.data || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleAttach = async (vehicleYearId: string) => {
    try {
      await inventoryApi.attachVehicle(productId, { vehicle_year_id: vehicleYearId });
      await loadCompatibility();
      setQ('');
      setSearchResults([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDetach = async (vehicleYearId: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return;
    try {
      await inventoryApi.detachVehicle(productId, vehicleYearId);
      await loadCompatibility();
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
          {isRTL ? 'إضافة توافق سريع' : 'Quick Add Compatibility'}
        </label>
        <div className="relative">
          <div className="flex items-center bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 rounded-lg px-3 focus-within:border-blue-500 transition-colors">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text"
              value={q}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={isRTL ? 'ابحث باسم الماركة أو الموديل (مثال: تويوتا كامري)...' : 'Search make or model (e.g. Toyota Camry)...'}
              className="w-full h-10 bg-transparent border-none outline-none px-3 text-sm"
            />
            {searching && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 rounded-lg shadow-xl z-10">
              {searchResults.map(res => {
                const isAttached = compatibleVehicles.some(v => v.vehicle_year_id === res.vehicle_year_id);
                return (
                  <div key={res.vehicle_year_id} className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <span className="text-sm font-medium">{isRTL ? res.label_ar : res.label}</span>
                    <button 
                      disabled={isAttached}
                      onClick={() => handleAttach(res.vehicle_year_id)}
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
          <Car className="w-4 h-4 text-blue-500" />
          {isRTL ? 'السيارات المتوافقة' : 'Compatible Vehicles'}
        </h3>
        {compatibleVehicles.length === 0 ? (
          <div className="text-center py-8 text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-white/10">
            {isRTL ? 'لا يوجد سيارات مرتبطة بهذا المنتج' : 'No vehicles attached to this product'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {compatibleVehicles.map(v => {
              const yearTo = v.year.year_to ? `-${v.year.year_to}` : '-Present';
              const engine = v.year.engine_size ? ` (${v.year.engine_size})` : '';
              return (
                <div key={v.vehicle_year_id} className="flex justify-between items-center p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151522]">
                  <div>
                    <p className="font-bold text-sm">{isRTL ? `${v.make.name_ar} ${v.model.name_ar}` : `${v.make.name} ${v.model.name}`}</p>
                    <p className="text-xs text-slate-500 dark:text-white/50">{`${v.year.year_from}${yearTo}${engine}`}</p>
                  </div>
                  <button onClick={() => handleDetach(v.vehicle_year_id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
