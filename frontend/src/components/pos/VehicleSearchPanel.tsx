'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Car, Package, Plus, Loader2 } from 'lucide-react';
import { inventoryApi } from '@/lib/api';

interface VehicleSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: any) => void;
  warehouseId: string | null;
  locale: string;
}

export function VehicleSearchPanel({
  isOpen,
  onClose,
  onAddToCart,
  warehouseId,
  locale,
}: VehicleSearchPanelProps) {
  const isAr = locale === 'ar';

  const [makes, setMakes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);

  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [oemSearch, setOemSearch] = useState('');
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Load makes on mount
  useEffect(() => {
    setLoadingMakes(true);
    inventoryApi.getVehicleMakes()
      .then((res: any) => setMakes(res.data?.data || res.data))
      .catch(console.error)
      .finally(() => setLoadingMakes(false));
  }, []);

  // Load models when make changes
  useEffect(() => {
    setSelectedModel('');
    setSelectedYear('');
    setModels([]);
    setYears([]);
    setProducts([]);
    if (selectedMake) {
      setLoadingModels(true);
      inventoryApi.getVehicleModels(selectedMake)
        .then((res: any) => setModels(res.data?.data || res.data))
        .catch(console.error)
        .finally(() => setLoadingModels(false));
    }
  }, [selectedMake]);

  // Set years when model changes
  useEffect(() => {
    setSelectedYear('');
    setYears([]);
    setProducts([]);
    if (selectedModel) {
      const model = models.find(m => m.id === selectedModel);
      if (model && model.years) {
        setYears(model.years);
      }
    }
  }, [selectedModel, models]);

  // Search by vehicle when year changes
  useEffect(() => {
    if (selectedYear) {
      const yearObj = years.find(y => y.id === selectedYear);
      if (yearObj) {
        performVehicleSearch({
          make_id: selectedMake,
          model_id: selectedModel,
          year: yearObj.year_from,
          warehouse_id: warehouseId || undefined,
        });
      }
    }
  }, [selectedYear]);

  const performVehicleSearch = async (params: any) => {
    setLoading(true);
    try {
      const res = await inventoryApi.searchByVehicle(params);
      setProducts(res.data?.data || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOemSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oemSearch.trim()) return;
    
    setLoading(true);
    try {
      const res = await inventoryApi.searchProducts(oemSearch);
      setProducts(res.data?.data || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getQualityBadge = (grade: string) => {
    switch (grade) {
      case 'original': return { class: 'bg-emerald-100 text-emerald-800', label: isAr ? 'أصلي' : 'Original' };
      case 'oem': return { class: 'bg-blue-100 text-blue-800', label: 'OEM' };
      case 'aftermarket': return { class: 'bg-amber-100 text-amber-800', label: isAr ? 'بديل' : 'Aftermarket' };
      case 'used': return { class: 'bg-gray-100 text-gray-700', label: isAr ? 'مستعمل' : 'Used' };
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 transition-opacity" dir={isAr ? 'rtl' : 'ltr'}>
      <div className={`absolute top-0 bottom-0 ${isAr ? 'left-0 border-r' : 'right-0 border-l'} w-full max-w-md bg-white shadow-2xl flex flex-col`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            {isAr ? 'بحث بالسيارة 🚗' : 'Search by Car 🚗'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-50 border-b space-y-4">
          
          {/* OEM Search */}
          <form onSubmit={handleOemSearch}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isAr ? 'بحث برقم OEM أو رقم القطعة' : 'Search by OEM or Part Number'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={oemSearch}
                onChange={(e) => setOemSearch(e.target.value)}
                placeholder={isAr ? 'أدخل الرقم...' : 'Enter number...'}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                dir="ltr"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </form>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">
              {isAr ? 'أو عبر موديل السيارة' : 'OR BY VEHICLE MODEL'}
            </span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Cascade Dropdowns */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isAr ? 'ماركة السيارة' : 'Vehicle Make'}
              </label>
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                disabled={loadingMakes}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              >
                <option value="">{loadingMakes ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'اختر الماركة...' : 'Select Make...')}</option>
                {makes.map(m => (
                  <option key={m.id} value={m.id}>{isAr ? m.name_ar : m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isAr ? 'الموديل' : 'Model'}
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!selectedMake || loadingModels}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              >
                <option value="">{loadingModels ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'اختر الموديل...' : 'Select Model...')}</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{isAr ? m.name_ar : m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isAr ? 'السنة' : 'Year'}
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={!selectedModel}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              >
                <option value="">{isAr ? 'اختر سنة الصنع...' : 'Select Year...'}</option>
                {years.map(y => {
                  const toYear = y.year_to ? `-${y.year_to}` : '-Present';
                  const engine = y.engine_size ? ` (${y.engine_size})` : '';
                  const fuel = y.fuel_type ? ` ${y.fuel_type}` : '';
                  return (
                    <option key={y.id} value={y.id}>
                      {`${y.year_from}${toYear}${engine}${fuel}`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-40 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span>{isAr ? 'جاري البحث...' : 'Searching...'}</span>
            </div>
          ) : products.length > 0 ? (
            <div className="space-y-3">
              {products.map(p => {
                const badge = getQualityBadge(p.quality_grade);
                const stockQty = p.stock_quantity !== undefined ? Number(p.stock_quantity) : (p.warehouseStocks?.reduce((sum: number, ws: any) => sum + Number(ws.quantity), 0) || 0);
                
                return (
                  <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900 line-clamp-2">{isAr ? p.name_ar || p.name : p.name}</h4>
                        <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          {p.oem_number && <span className="flex items-center gap-1"><Package className="w-3 h-3"/> OEM: {p.oem_number}</span>}
                          {p.part_number && <span>PN: {p.part_number}</span>}
                          {p.brand && <span>{p.brand}</span>}
                        </div>
                      </div>
                      {badge && (
                        <span className={`text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap ${badge.class}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <div className="flex flex-col">
                        <span className="font-bold text-lg text-gray-900">{Number(p.sell_price).toFixed(2)}</span>
                        <span className={`text-xs ${stockQty > 0 ? 'text-emerald-600' : 'text-red-500 font-medium'}`}>
                          {isAr ? 'المخزون:' : 'Stock:'} {stockQty}
                        </span>
                      </div>
                      <button
                        onClick={() => onAddToCart(p)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">{isAr ? 'إضافة' : 'Add'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Car className="w-12 h-12 mb-3 opacity-20" />
              <p>{isAr ? 'لم يتم العثور على قطع غيار مطابقة' : 'No matching parts found'}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
