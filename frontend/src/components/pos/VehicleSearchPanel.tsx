'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Car, Package, Plus, Loader2, ChevronDown, CheckCircle2, Hash } from 'lucide-react';
import { inventoryApi } from '@/lib/api';
import Skeleton from '@/components/ui/Skeleton';

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

  const [activeTab, setActiveTab] = useState<'oem' | 'vehicle'>('oem');
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
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setLoadingMakes(true);
    inventoryApi.getVehicleMakes()
      .then((res: any) => setMakes(res.data?.data || res.data))
      .catch(console.error)
      .finally(() => setLoadingMakes(false));
  }, []);

  useEffect(() => {
    setSelectedModel('');
    setSelectedYear('');
    setModels([]);
    setYears([]);
    setProducts([]);
    setSearched(false);
    if (selectedMake) {
      setLoadingModels(true);
      inventoryApi.getVehicleModels(selectedMake)
        .then((res: any) => setModels(res.data?.data || res.data))
        .catch(console.error)
        .finally(() => setLoadingModels(false));
    }
  }, [selectedMake]);

  useEffect(() => {
    setSelectedYear('');
    setYears([]);
    setProducts([]);
    setSearched(false);
    if (selectedModel) {
      const model = models.find(m => m.id === selectedModel);
      if (model?.years) setYears(model.years);
    }
  }, [selectedModel, models]);

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
    setSearched(true);
    try {
      const res = await inventoryApi.searchByVehicle(params);
      setProducts(res.data?.data || res.data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOemSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!oemSearch.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await inventoryApi.searchProducts(oemSearch);
      setProducts(res.data?.data || res.data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getQualityBadge = (grade: string) => {
    switch (grade) {
      case 'original': return { class: 'bg-emerald-100 text-emerald-700 border border-emerald-200', label: isAr ? 'أصلي' : 'Original' };
      case 'oem':      return { class: 'bg-blue-100 text-blue-700 border border-blue-200', label: 'OEM' };
      case 'aftermarket': return { class: 'bg-amber-100 text-amber-700 border border-amber-200', label: isAr ? 'بديل' : 'Aftermarket' };
      case 'used':     return { class: 'bg-gray-100 text-gray-600 border border-gray-200', label: isAr ? 'مستعمل' : 'Used' };
      default: return null;
    }
  };

  // Stepper progress: how many vehicle fields are filled
  const vehicleStep = selectedMake ? (selectedModel ? (selectedYear ? 3 : 2) : 1) : 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity flex"
      dir={isAr ? 'rtl' : 'ltr'}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`absolute top-0 bottom-0 ${isAr ? 'left-0' : 'right-0'} w-full max-w-[420px] bg-white flex flex-col shadow-2xl`}
        style={{ animation: 'slideIn 0.25s ease-out' }}
      >
        {/* ═══ HEADER ═══ */}
        <div className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-5 pt-5 pb-6">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-4 w-16 h-16 bg-white/5 rounded-full translate-y-1/2 pointer-events-none" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 rounded-xl p-2.5">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  {isAr ? 'بحث بالسيارة' : 'Vehicle Parts Search'}
                </h2>
                <p className="text-blue-200 text-xs mt-0.5">
                  {isAr ? 'ابحث بالرقم أو الموديل' : 'Search by number or model'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/15 hover:bg-white/25 text-white rounded-full p-1.5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="relative mt-4 flex bg-white/10 rounded-xl p-1 gap-1">
            <button
              onClick={() => { setActiveTab('oem'); setProducts([]); setSearched(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'oem'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              {isAr ? 'رقم القطعة' : 'Part Number'}
            </button>
            <button
              onClick={() => { setActiveTab('vehicle'); setProducts([]); setSearched(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'vehicle'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              {isAr ? 'موديل السيارة' : 'Vehicle Model'}
            </button>
          </div>
        </div>

        {/* ═══ FILTER BODY ═══ */}
        <div className="bg-gray-50 px-4 pt-4 pb-3 border-b">

          {/* ── OEM Tab ── */}
          {activeTab === 'oem' && (
            <form onSubmit={handleOemSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`} />
                <input
                  type="text"
                  value={oemSearch}
                  onChange={(e) => setOemSearch(e.target.value)}
                  placeholder={isAr ? 'رقم OEM أو رقم القطعة...' : 'OEM or part number...'}
                  className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition`}
                  dir="ltr"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!oemSearch.trim() || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 font-semibold text-sm transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isAr ? 'بحث' : 'Search'}
              </button>
            </form>
          )}

          {/* ── Vehicle Tab ── */}
          {activeTab === 'vehicle' && (
            <div className="space-y-3">
              {/* Progress stepper */}
              <div className="flex items-center gap-1 mb-1">
                {[1, 2, 3].map((step, i) => (
                  <React.Fragment key={step}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      vehicleStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {vehicleStep > step ? <CheckCircle2 className="w-4 h-4" /> : step}
                    </div>
                    {i < 2 && (
                      <div className={`flex-1 h-0.5 rounded-full transition-all ${vehicleStep > step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                ))}
                <span className="text-xs text-gray-400 ms-2">
                  {isAr
                    ? ['اختر الماركة', 'اختر الموديل', 'اختر السنة'][Math.min(vehicleStep, 2)]
                    : ['Select Make', 'Select Model', 'Select Year'][Math.min(vehicleStep, 2)]}
                </span>
              </div>

              {/* Make */}
              <SelectField
                label={isAr ? 'ماركة السيارة' : 'Vehicle Make'}
                value={selectedMake}
                onChange={setSelectedMake}
                disabled={loadingMakes}
                active={vehicleStep === 0}
              >
                <option value="">
                  {loadingMakes ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'اختر الماركة...' : 'Select Make...')}
                </option>
                {makes.map(m => (
                  <option key={m.id} value={m.id}>{isAr ? m.name_ar : m.name}</option>
                ))}
              </SelectField>

              {/* Model */}
              <SelectField
                label={isAr ? 'الموديل' : 'Model'}
                value={selectedModel}
                onChange={setSelectedModel}
                disabled={!selectedMake || loadingModels}
                active={vehicleStep === 1}
              >
                <option value="">
                  {loadingModels ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'اختر الموديل...' : 'Select Model...')}
                </option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{isAr ? m.name_ar : m.name}</option>
                ))}
              </SelectField>

              {/* Year */}
              <SelectField
                label={isAr ? 'سنة الصنع' : 'Year'}
                value={selectedYear}
                onChange={setSelectedYear}
                disabled={!selectedModel}
                active={vehicleStep === 2}
              >
                <option value="">{isAr ? 'اختر السنة...' : 'Select Year...'}</option>
                {years.map(y => {
                  const to = y.year_to ? `-${y.year_to}` : '';
                  const engine = y.engine_size ? ` (${y.engine_size})` : '';
                  const fuel = y.fuel_type ? ` · ${y.fuel_type}` : '';
                  return (
                    <option key={y.id} value={y.id}>
                      {`${y.year_from}${to}${engine}${fuel}`}
                    </option>
                  );
                })}
              </SelectField>
            </div>
          )}
        </div>

        {/* ═══ RESULTS ═══ */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-400 font-medium">
                {isAr ? `${products.length} نتيجة` : `${products.length} results`}
              </p>
              {products.map(p => {
                const badge = getQualityBadge(p.quality_grade);
                const stockQty = p.stock_quantity !== undefined
                  ? Number(p.stock_quantity)
                  : (p.warehouseStocks?.reduce((s: number, w: any) => s + Number(w.quantity), 0) || 0);
                const inStock = stockQty > 0;

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="p-3.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                            {isAr ? p.name_ar || p.name : p.name}
                          </h4>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                            {p.oem_number && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Package className="w-3 h-3 shrink-0" />
                                OEM: <span className="font-mono text-gray-700">{p.oem_number}</span>
                              </span>
                            )}
                            {p.part_number && (
                              <span className="text-xs text-gray-500 font-mono">PN: {p.part_number}</span>
                            )}
                            {p.brand && (
                              <span className="text-xs text-blue-600 font-semibold">{p.brand}</span>
                            )}
                          </div>
                        </div>
                        {badge && (
                          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-lg font-semibold ${badge.class}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center justify-between px-3.5 py-2.5 border-t ${inStock ? 'bg-gray-50' : 'bg-red-50'}`}>
                      <div>
                        <span className="font-bold text-lg text-gray-900 leading-none">
                          {Number(p.sell_price).toFixed(2)}
                        </span>
                        <div className={`text-xs mt-0.5 font-medium ${inStock ? 'text-emerald-600' : 'text-red-500'}`}>
                          {inStock
                            ? (isAr ? `متوفر · ${stockQty}` : `In stock · ${stockQty}`)
                            : (isAr ? 'غير متوفر' : 'Out of stock')}
                        </div>
                      </div>
                      <button
                        onClick={() => onAddToCart(p)}
                        disabled={!inStock}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-sm font-semibold transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        {isAr ? 'إضافة' : 'Add'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : searched ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Car className="w-8 h-8 text-gray-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-600 text-sm">{isAr ? 'لا توجد نتائج' : 'No results found'}</p>
                <p className="text-xs text-gray-400 mt-1">{isAr ? 'جرب رقماً أو موديلاً مختلفاً' : 'Try a different number or model'}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Search className="w-8 h-8 text-blue-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-500 text-sm">
                  {activeTab === 'oem'
                    ? (isAr ? 'أدخل رقم القطعة للبحث' : 'Enter a part number to search')
                    : (isAr ? 'اختر بيانات السيارة للبحث' : 'Select vehicle details to search')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(${isAr ? '-100%' : '100%'}); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── Reusable styled select ── */
function SelectField({
  label,
  value,
  onChange,
  disabled,
  active,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none border rounded-xl px-3 py-2.5 pr-9 text-sm outline-none transition-all
            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
            ${active
              ? 'border-blue-400 ring-2 ring-blue-100 bg-white text-gray-900 focus:ring-blue-200'
              : value
                ? 'border-emerald-300 bg-white text-gray-900 focus:ring-2 focus:ring-emerald-100'
                : 'border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-400'
            }
          `}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
