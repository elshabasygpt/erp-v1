'use client';

import React, { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api';
import { Car, ChevronRight, Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';

export default function VehicleManagementPage({ params }: { params: { locale: string } }) {
    const isRTL = params.locale === 'ar';
    const [makes, setMakes] = useState<any[]>([]);
    const [models, setModels] = useState<any[]>([]);
    const [years, setYears] = useState<any[]>([]);

    const [activeMake, setActiveMake] = useState<any>(null);
    const [activeModel, setActiveModel] = useState<any>(null);

    const [loading, setLoading] = useState(true);

    // Form states
    const [newMake, setNewMake] = useState({ name: '', name_ar: '' });
    const [newModel, setNewModel] = useState({ name: '', name_ar: '' });
    const [newYear, setNewYear] = useState({ year_from: '', year_to: '', engine_size: '' });

    useEffect(() => {
        loadMakes();
    }, []);

    const loadMakes = async () => {
        setLoading(true);
        try {
            const res = await inventoryApi.getVehicleMakes();
            setMakes(res.data);
            setActiveMake(null);
            setActiveModel(null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const selectMake = async (make: any) => {
        setActiveMake(make);
        setActiveModel(null);
        setLoading(true);
        try {
            const res = await inventoryApi.getVehicleModels(make.id);
            setModels(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const selectModel = async (model: any) => {
        setActiveModel(model);
        setLoading(true);
        try {
            const res = await inventoryApi.getVehicleYears(model.id);
            setYears(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMake = async () => {
        if (!newMake.name || !newMake.name_ar) return;
        try {
            await inventoryApi.createVehicleMake(newMake);
            setNewMake({ name: '', name_ar: '' });
            loadMakes();
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateModel = async () => {
        if (!newModel.name || !newModel.name_ar || !activeMake) return;
        try {
            await inventoryApi.createVehicleModel(activeMake.id, newModel);
            setNewModel({ name: '', name_ar: '' });
            selectMake(activeMake);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateYear = async () => {
        if (!newYear.year_from || !activeModel) return;
        try {
            await inventoryApi.createVehicleYear(activeModel.id, newYear);
            setNewYear({ year_from: '', year_to: '', engine_size: '' });
            selectModel(activeModel);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Car className="w-8 h-8 text-blue-600" />
                        {isRTL ? 'إدارة توافق السيارات' : 'Vehicle Compatibility Management'}
                    </h1>
                    <p className="text-slate-500 dark:text-white/50 mt-1 font-medium">
                        {isRTL ? 'إدارة الماركات، الموديلات، وسنوات الصنع لربطها بقطع الغيار.' : 'Manage makes, models, and years to attach to auto parts.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
                
                {/* 1. MAKES COLUMN */}
                <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                        <h2 className="font-bold text-slate-700 dark:text-white flex justify-between items-center">
                            {isRTL ? 'ماركات السيارات' : 'Vehicle Makes'}
                            <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">{makes.length}</span>
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loading && !activeMake ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 my-4" /> : makes.map(make => (
                            <button
                                key={make.id}
                                onClick={() => selectMake(make)}
                                className={`w-full text-start px-4 py-3 rounded-xl border font-bold transition-all flex justify-between items-center ${activeMake?.id === make.id ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-600/20 dark:border-blue-500/30 dark:text-blue-400' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-300 dark:bg-[#151522] dark:border-white/5 dark:text-white/80 dark:hover:border-blue-500/50'}`}
                            >
                                <span>{isRTL ? make.name_ar : make.name}</span>
                                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 space-y-2">
                        <input value={newMake.name_ar} onChange={e => setNewMake({ ...newMake, name_ar: e.target.value })} placeholder={isRTL ? 'الاسم بالعربية' : 'Arabic Name'} className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none" />
                        <input value={newMake.name} onChange={e => setNewMake({ ...newMake, name: e.target.value })} placeholder={isRTL ? 'الاسم بالإنجليزية' : 'English Name'} className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none" />
                        <button onClick={handleCreateMake} disabled={!newMake.name || !newMake.name_ar} className="w-full h-10 bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> {isRTL ? 'إضافة ماركة' : 'Add Make'}
                        </button>
                    </div>
                </div>

                {/* 2. MODELS COLUMN */}
                <div className={`bg-white dark:bg-[#111118] border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-sm transition-opacity ${!activeMake ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                        <h2 className="font-bold text-slate-700 dark:text-white flex justify-between items-center">
                            {activeMake ? (isRTL ? `موديلات ${activeMake.name_ar}` : `${activeMake.name} Models`) : (isRTL ? 'الموديلات' : 'Models')}
                            <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-xs">{models.length}</span>
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loading && activeMake && !activeModel ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 my-4" /> : models.map(model => (
                            <button
                                key={model.id}
                                onClick={() => selectModel(model)}
                                className={`w-full text-start px-4 py-3 rounded-xl border font-bold transition-all flex justify-between items-center ${activeModel?.id === model.id ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-600/20 dark:border-amber-500/30 dark:text-amber-400' : 'bg-white border-slate-100 text-slate-600 hover:border-amber-300 dark:bg-[#151522] dark:border-white/5 dark:text-white/80 dark:hover:border-amber-500/50'}`}
                            >
                                <span>{isRTL ? model.name_ar : model.name}</span>
                                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 space-y-2">
                        <input value={newModel.name_ar} onChange={e => setNewModel({ ...newModel, name_ar: e.target.value })} placeholder={isRTL ? 'الاسم بالعربية' : 'Arabic Name'} className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none" />
                        <input value={newModel.name} onChange={e => setNewModel({ ...newModel, name: e.target.value })} placeholder={isRTL ? 'الاسم بالإنجليزية' : 'English Name'} className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none" />
                        <button onClick={handleCreateModel} disabled={!newModel.name || !newModel.name_ar} className="w-full h-10 bg-amber-500 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> {isRTL ? 'إضافة موديل' : 'Add Model'}
                        </button>
                    </div>
                </div>

                {/* 3. YEARS COLUMN */}
                <div className={`bg-white dark:bg-[#111118] border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-sm transition-opacity ${!activeModel ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                        <h2 className="font-bold text-slate-700 dark:text-white flex justify-between items-center">
                            {activeModel ? (isRTL ? `سنوات ${activeModel.name_ar}` : `${activeModel.name} Years`) : (isRTL ? 'السنوات' : 'Years')}
                            <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-xs">{years.length}</span>
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loading && activeModel ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 my-4" /> : years.map(year => (
                            <div key={year.id} className="w-full px-4 py-3 rounded-xl border bg-white border-slate-100 text-slate-600 dark:bg-[#151522] dark:border-white/5 dark:text-white/80 font-bold flex justify-between items-center">
                                <div>
                                    <span className="text-sm">{year.year_from} - {year.year_to || (isRTL ? 'الآن' : 'Present')}</span>
                                    {year.engine_size && <span className="block text-xs text-slate-400 font-normal">{year.engine_size}L</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 space-y-2">
                        <div className="flex gap-2">
                            <input type="number" value={newYear.year_from} onChange={e => setNewYear({ ...newYear, year_from: e.target.value })} placeholder={isRTL ? 'من سنة (مثال: 2015)' : 'From Year'} className="w-1/2 h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none" />
                            <input type="number" value={newYear.year_to} onChange={e => setNewYear({ ...newYear, year_to: e.target.value })} placeholder={isRTL ? 'إلى سنة' : 'To Year'} className="w-1/2 h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none" />
                        </div>
                        <input value={newYear.engine_size} onChange={e => setNewYear({ ...newYear, engine_size: e.target.value })} placeholder={isRTL ? 'حجم المحرك (اختياري، مثال: 2.4)' : 'Engine Size (Optional)'} className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none" />
                        <button onClick={handleCreateYear} disabled={!newYear.year_from} className="w-full h-10 bg-emerald-500 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> {isRTL ? 'إضافة سنة' : 'Add Year'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
