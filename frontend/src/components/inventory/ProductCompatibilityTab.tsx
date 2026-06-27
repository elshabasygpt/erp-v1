import React, { useState, useEffect, useRef } from 'react';
import { inventoryApi } from '@/lib/api';
import { Car, Search, X, Loader2, ChevronDown } from 'lucide-react';

interface ProductCompatibilityTabProps {
  productId: string;
  isRTL: boolean;
  pendingVehicles?: any[];
  onPendingChange?: (vehicles: any[]) => void;
}

export function ProductCompatibilityTab({ productId, isRTL, pendingVehicles, onPendingChange }: ProductCompatibilityTabProps) {
  const isPending = !productId;

  const [compatibleVehicles, setCompatibleVehicles] = useState<any[]>(pendingVehicles || []);
  const [loading, setLoading] = useState(!isPending);

  // Quick search state
  const [q, setQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Browse by make/model/year state
  const [mode, setMode] = useState<'search' | 'browse'>('browse');
  const [makes, setMakes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<any>(null);
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [attaching, setAttaching] = useState(false);

  useEffect(() => {
    if (isPending) return;
    loadCompatibility();
  }, [productId]);

  useEffect(() => {
    if (mode === 'browse' && makes.length === 0) {
      loadMakes();
    }
  }, [mode]);

  // Close quick-search dropdown on outside click
  useEffect(() => {
    if (!searchResults.length) return;
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchResults.length]);

  const loadCompatibility = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getProductCompatibility(productId);
      setCompatibleVehicles(res.data?.data || res.data || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const loadMakes = async () => {
    setLoadingMakes(true);
    try {
      const res = await inventoryApi.getVehicleMakes();
      setMakes(res.data?.data || res.data || []);
    } catch (e) {
    } finally {
      setLoadingMakes(false);
    }
  };

  const handleSelectMake = async (make: any) => {
    setSelectedMake(make);
    setSelectedModel(null);
    setSelectedYear(null);
    setModels([]);
    setYears([]);
    if (!make) return;
    setLoadingModels(true);
    try {
      const res = await inventoryApi.getVehicleModels(make.id);
      setModels(res.data?.data || res.data || []);
    } catch (e) {
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSelectModel = async (model: any) => {
    setSelectedModel(model);
    setSelectedYear(null);
    setYears([]);
    if (!model) return;
    setLoadingYears(true);
    try {
      const res = await inventoryApi.getVehicleYears(model.id);
      setYears(res.data?.data || res.data || []);
    } catch (e) {
    } finally {
      setLoadingYears(false);
    }
  };

  // Debounced search — prevents race conditions from rapid typing
  const handleSearch = (val: string) => {
    setQ(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.length < 2) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await inventoryApi.vehicleQuickLookup(val);
        setSearchResults(res.data?.data || res.data || []);
      } catch (e) {
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleAttach = async (vehicle: any) => {
    if (compatibleVehicles.some(v => v.vehicle_year_id === vehicle.vehicle_year_id)) return;
    if (isPending) {
      const updated = [...compatibleVehicles, vehicle];
      setCompatibleVehicles(updated);
      onPendingChange?.(updated);
      setQ('');
      setSearchResults([]);
      return;
    }
    try {
      await inventoryApi.attachVehicle(productId, { vehicle_year_id: vehicle.vehicle_year_id });
      await loadCompatibility();
      setQ('');
      setSearchResults([]);
    } catch (e) {}
  };

  const handleBrowseAttach = async () => {
    if (!selectedYear) return;

    const yearRange = selectedYear.year_to
      ? `${selectedYear.year_from}-${selectedYear.year_to}`
      : `${selectedYear.year_from}`;
    const engine = selectedYear.engine_size ? ` (${selectedYear.engine_size})` : '';
    const transmission = selectedYear.transmission ? ` | ${selectedYear.transmission}` : '';

    const vehicle = {
      vehicle_year_id: selectedYear.id,
      label: `${selectedMake?.name} ${selectedModel?.name} ${yearRange}${engine}${transmission}`,
      label_ar: `${selectedMake?.name_ar} ${selectedModel?.name_ar} ${yearRange}${engine}${transmission}`,
      make: selectedMake,
      model: selectedModel,
      year: selectedYear,
    };

    if (compatibleVehicles.some(v => v.vehicle_year_id === vehicle.vehicle_year_id)) return;

    const resetSelections = () => {
      setSelectedMake(null);
      setSelectedModel(null);
      setSelectedYear(null);
      setModels([]);
      setYears([]);
    };

    if (isPending) {
      const updated = [...compatibleVehicles, vehicle];
      setCompatibleVehicles(updated);
      onPendingChange?.(updated);
      resetSelections();
      return;
    }

    setAttaching(true);
    try {
      await inventoryApi.attachVehicle(productId, { vehicle_year_id: selectedYear.id });
      await loadCompatibility();
      resetSelections();
    } catch (e) {
    } finally {
      setAttaching(false);
    }
  };

  const handleDetach = async (vehicleYearId: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return;
    if (isPending) {
      const updated = compatibleVehicles.filter(v => v.vehicle_year_id !== vehicleYearId);
      setCompatibleVehicles(updated);
      onPendingChange?.(updated);
      return;
    }
    try {
      await inventoryApi.detachVehicle(productId, vehicleYearId);
      await loadCompatibility();
    } catch (e) {}
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  const selectCls = 'w-full h-10 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 rounded-lg px-3 pr-9 text-sm outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const isAlreadyAttached = selectedYear
    ? compatibleVehicles.some(v => v.vehicle_year_id === selectedYear.id)
    : false;

  const formatYearOption = (y: any) => {
    const range = y.year_to ? `${y.year_from}-${y.year_to}` : `${y.year_from}`;
    const engine = y.engine_size ? ` — ${y.engine_size}` : '';
    const fuel = y.fuel_type ? ` (${y.fuel_type})` : '';
    const trans = y.transmission ? ` | ${y.transmission}` : '';
    return `${range}${engine}${fuel}${trans}`;
  };

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-lg w-fit">
        <button
          onClick={() => setMode('browse')}
          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${mode === 'browse' ? 'bg-white dark:bg-[#1a1a2e] text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {isRTL ? 'تصفح حسب الماركة' : 'Browse by Make'}
        </button>
        <button
          onClick={() => setMode('search')}
          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${mode === 'search' ? 'bg-white dark:bg-[#1a1a2e] text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {isRTL ? 'بحث سريع' : 'Quick Search'}
        </button>
      </div>

      {mode === 'browse' ? (
        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
          <p className="text-xs font-bold text-slate-700 dark:text-white">
            {isRTL ? 'اختر الماركة والموديل وسنة الإنتاج' : 'Select Make, Model & Year'}
          </p>

          {/* Make */}
          <div className="relative">
            <select
              value={selectedMake?.id || ''}
              onChange={e => {
                const m = makes.find(x => String(x.id) === e.target.value) || null;
                handleSelectMake(m);
              }}
              className={selectCls}
              disabled={loadingMakes}
            >
              <option value="">{isRTL ? '— اختر الماركة —' : '— Select Make —'}</option>
              {makes.map(m => (
                <option key={m.id} value={m.id}>{isRTL ? m.name_ar : m.name}</option>
              ))}
            </select>
            {loadingMakes
              ? <Loader2 className="pointer-events-none absolute right-3 top-2.5 w-4 h-4 animate-spin text-blue-500" />
              : <ChevronDown className="pointer-events-none absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            }
          </div>

          {/* Model */}
          <div className="relative">
            <select
              value={selectedModel?.id || ''}
              onChange={e => {
                const m = models.find(x => String(x.id) === e.target.value) || null;
                handleSelectModel(m);
              }}
              className={selectCls}
              disabled={!selectedMake || loadingModels}
            >
              <option value="">{isRTL ? '— اختر الموديل —' : '— Select Model —'}</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>{isRTL ? m.name_ar : m.name}</option>
              ))}
            </select>
            {loadingModels
              ? <Loader2 className="pointer-events-none absolute right-3 top-2.5 w-4 h-4 animate-spin text-blue-500" />
              : <ChevronDown className="pointer-events-none absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            }
          </div>

          {/* Year */}
          <div className="relative">
            <select
              value={selectedYear?.id || ''}
              onChange={e => {
                const y = years.find(x => String(x.id) === e.target.value) || null;
                setSelectedYear(y);
              }}
              className={selectCls}
              disabled={!selectedModel || loadingYears}
            >
              <option value="">{isRTL ? '— اختر سنة الإنتاج —' : '— Select Year —'}</option>
              {years.map(y => (
                <option key={y.id} value={y.id}>{formatYearOption(y)}</option>
              ))}
            </select>
            {loadingYears
              ? <Loader2 className="pointer-events-none absolute right-3 top-2.5 w-4 h-4 animate-spin text-blue-500" />
              : <ChevronDown className="pointer-events-none absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            }
          </div>

          <button
            onClick={handleBrowseAttach}
            disabled={!selectedYear || attaching || isAlreadyAttached}
            className="w-full h-10 rounded-lg font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {attaching && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAlreadyAttached
              ? (isRTL ? 'مضاف مسبقاً' : 'Already Added')
              : (isRTL ? 'إضافة السيارة' : 'Add Vehicle')}
          </button>
        </div>
      ) : (
        /* Quick Search */
        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
          <label className="block text-xs font-bold mb-2 text-slate-700 dark:text-white">
            {isRTL ? 'بحث سريع' : 'Quick Search'}
          </label>
          <div className="relative" ref={searchContainerRef}>
            <div className="flex items-center bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 rounded-lg px-3 focus-within:border-blue-500 transition-colors">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={q}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={isRTL ? 'ابحث باسم الماركة أو الموديل (مثال: تويوتا كامري)...' : 'Search make or model (e.g. Toyota Camry)...'}
                className="w-full h-10 bg-transparent border-none outline-none px-3 text-sm"
              />
              {searching && <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />}
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
                        onClick={() => handleAttach(res)}
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
      )}

      {/* Compatible vehicles list */}
      <div>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-white">
          <Car className="w-4 h-4 text-blue-500" />
          {isRTL ? 'السيارات المتوافقة' : 'Compatible Vehicles'}
          {compatibleVehicles.length > 0 && (
            <span className="text-xs font-normal bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {compatibleVehicles.length}
            </span>
          )}
        </h3>
        {compatibleVehicles.length === 0 ? (
          <div className="text-center py-8 text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-white/10">
            {isRTL ? 'لا يوجد سيارات مرتبطة بهذا المنتج' : 'No vehicles attached to this product'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {compatibleVehicles.map(v => {
              const label = isRTL
                ? (v.label_ar || (v.make?.name_ar ? `${v.make.name_ar} ${v.model?.name_ar || ''}` : v.label || ''))
                : (v.label || (v.make?.name ? `${v.make.name} ${v.model?.name || ''}` : ''));
              const yearTo = v.year?.year_to ? `-${v.year.year_to}` : (v.year_to ? `-${v.year_to}` : '');
              const yearFrom = v.year?.year_from || v.year_from || '';
              const engine = v.year?.engine_size ? ` (${v.year.engine_size})` : '';
              return (
                <div key={v.vehicle_year_id} className="flex justify-between items-center p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151522]">
                  <div>
                    <p className="font-bold text-sm">{label}</p>
                    {yearFrom && <p className="text-xs text-slate-500 dark:text-white/50">{`${yearFrom}${yearTo}${engine}`}</p>}
                  </div>
                  <button
                    onClick={() => handleDetach(v.vehicle_year_id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                  >
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
