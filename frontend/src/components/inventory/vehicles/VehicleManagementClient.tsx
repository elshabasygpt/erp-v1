'use client';

import React, { useState, useEffect, useRef } from 'react';
import { inventoryApi } from '@/lib/api';
import { Car, ChevronRight, Plus, Trash2, Loader2, Edit2, X, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { toRelativeImageUrl } from '@/lib/utils';

export function VehicleManagementClient({ locale, dict }: { locale: string; dict: any }) {
    const isRTL = locale === 'ar';
    const [makes, setMakes] = useState<any[]>([]);
    const [models, setModels] = useState<any[]>([]);
    const [years, setYears] = useState<any[]>([]);

    const [activeMake, setActiveMake] = useState<any>(null);
    const [activeModel, setActiveModel] = useState<any>(null);

    const [loading, setLoading] = useState(true);

    // Form states
    const [newMake, setNewMake] = useState({ name: '', name_ar: '' });
    const [makeLogo, setMakeLogo] = useState<File | null>(null);
    const [makeLogoPreview, setMakeLogoPreview] = useState<string>('');
    const makeLogoRef = useRef<HTMLInputElement>(null);
    const [editingMakeId, setEditingMakeId] = useState<string | null>(null);

    const [newModel, setNewModel] = useState({ name: '', name_ar: '' });
    const [modelImage, setModelImage] = useState<File | null>(null);
    const [modelImagePreview, setModelImagePreview] = useState<string>('');
    const modelImageRef = useRef<HTMLInputElement>(null);
    const [editingModelId, setEditingModelId] = useState<string | null>(null);

    const [newYear, setNewYear] = useState({ year_from: '', year_to: '', engine_size: '', fuel_type: '', transmission: '' });
    const [engineImage, setEngineImage] = useState<File | null>(null);
    const [engineImagePreview, setEngineImagePreview] = useState<string>('');
    const engineImageRef = useRef<HTMLInputElement>(null);
    const [editingYearId, setEditingYearId] = useState<string | null>(null);

    const handleImagePick = (
        file: File,
        setFile: (f: File | null) => void,
        setPreview: (s: string) => void,
    ) => {
        if (file.size > 2 * 1024 * 1024) { toast.error(isRTL ? 'الحجم يجب أن لا يتجاوز 2 ميجابايت' : 'Max size 2MB'); return; }
        setFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const clearImage = (
        setFile: (f: File | null) => void,
        setPreview: (s: string) => void,
        ref: React.RefObject<HTMLInputElement>,
    ) => { setFile(null); setPreview(''); if (ref.current) ref.current.value = ''; };

    useEffect(() => {
        loadMakes();
    }, []);

    const loadMakes = async () => {
        setLoading(true);
        try {
            const res = await inventoryApi.getVehicleMakes();
            setMakes(res.data?.data || res.data || []);
            setActiveMake(null);
            setActiveModel(null);
        } catch (e) {

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
            setModels(res.data?.data || res.data || []);
        } catch (e) {

        } finally {
            setLoading(false);
        }
    };

    const selectModel = async (model: any) => {
        setActiveModel(model);
        setLoading(true);
        try {
            const res = await inventoryApi.getVehicleYears(model.id);
            setYears(res.data?.data || res.data || []);
        } catch (e) {

        } finally {
            setLoading(false);
        }
    };

    const handleCreateMake = async () => {
        if (!newMake.name || !newMake.name_ar) return;
        try {
            let payload: any = newMake;
            if (makeLogo) {
                payload = new FormData();
                payload.append('name', newMake.name);
                payload.append('name_ar', newMake.name_ar);
                payload.append('logo', makeLogo);
            }
            if (editingMakeId) {
                await inventoryApi.updateVehicleMake(editingMakeId, payload);
                setEditingMakeId(null);
            } else {
                await inventoryApi.createVehicleMake(payload);
            }
            setNewMake({ name: '', name_ar: '' });
            setMakeLogo(null); setMakeLogoPreview(''); if (makeLogoRef.current) makeLogoRef.current.value = '';
            loadMakes();
        } catch (e: any) {

            toast.error(JSON.stringify(e.response?.data?.errors || e.response?.data));
        }
    };

    const handleCreateModel = async () => {
        if (!newModel.name || !newModel.name_ar || !activeMake) return;
        try {
            let payload: any = newModel;
            if (modelImage) {
                payload = new FormData();
                payload.append('name', newModel.name);
                payload.append('name_ar', newModel.name_ar);
                payload.append('image', modelImage);
            }
            if (editingModelId) {
                await inventoryApi.updateVehicleModel(editingModelId, payload);
                setEditingModelId(null);
            } else {
                await inventoryApi.createVehicleModel(activeMake.id, payload);
            }
            setNewModel({ name: '', name_ar: '' });
            setModelImage(null); setModelImagePreview(''); if (modelImageRef.current) modelImageRef.current.value = '';
            selectMake(activeMake);
        } catch (e: any) {

            toast.error(JSON.stringify(e.response?.data?.errors || e.response?.data));
        }
    };

    const handleCreateYear = async () => {
        if (!newYear.year_from || !activeModel) return;
        try {
            let payload: any = { ...newYear };
            if (!payload.year_to) delete payload.year_to;
            if (!payload.engine_size) delete payload.engine_size;
            if (!payload.fuel_type) delete payload.fuel_type;
            if (!payload.transmission) delete payload.transmission;

            if (engineImage) {
                const formData = new FormData();
                Object.keys(payload).forEach(key => formData.append(key, payload[key]));
                formData.append('engine_image', engineImage);
                payload = formData;
            }

            if (editingYearId) {
                await inventoryApi.updateVehicleYear(editingYearId, payload);
                setEditingYearId(null);
            } else {
                await inventoryApi.createVehicleYear(activeModel.id, payload);
            }
            setNewYear({ year_from: '', year_to: '', engine_size: '', fuel_type: '', transmission: '' });
            setEngineImage(null); setEngineImagePreview(''); if (engineImageRef.current) engineImageRef.current.value = '';
            selectModel(activeModel);
        } catch (e: any) {

            toast.error(e.response?.data?.message || 'Failed to save year. ' + JSON.stringify(e.response?.data?.errors || {}));
        }
    };

    const handleDeleteMake = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(isRTL ? 'تأكيد الحذف؟' : 'Confirm delete?')) return;
        try {
            await inventoryApi.deleteVehicleMake(id);
            if (activeMake?.id === id) setActiveMake(null);
            loadMakes();
        } catch (err) {  }
    };

    const handleDeleteModel = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(isRTL ? 'تأكيد الحذف؟' : 'Confirm delete?')) return;
        try {
            await inventoryApi.deleteVehicleModel(id);
            if (activeModel?.id === id) setActiveModel(null);
            if (activeMake) selectMake(activeMake);
        } catch (err) {  }
    };

    const handleDeleteYear = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(isRTL ? 'تأكيد الحذف؟' : 'Confirm delete?')) return;
        try {
            await inventoryApi.deleteVehicleYear(id);
            if (activeModel) selectModel(activeModel);
        } catch (err) {  }
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto h-full min-h-[85vh] flex flex-col animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 min-h-[600px]">
                
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
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-slate-100 dark:bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {make.logo_url
                                            ? <img src={toRelativeImageUrl(make.logo_url)} alt="" className="w-full h-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display','flex'); }} />
                                            : null}
                                        <span className={`text-xs font-bold text-slate-400 ${make.logo_url ? 'hidden' : 'flex'}`}>{(isRTL ? make.name_ar : make.name).substring(0,2).toUpperCase()}</span>
                                    </div>
                                    <span>{isRTL ? make.name_ar : make.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingMakeId(make.id); setNewMake({ name: make.name, name_ar: make.name_ar }); clearImage(setMakeLogo, setMakeLogoPreview, makeLogoRef); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => handleDeleteMake(make.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 space-y-2">
                        <input value={newMake.name_ar} onChange={e => setNewMake({ ...newMake, name_ar: e.target.value })} placeholder={isRTL ? 'الاسم بالعربية' : 'Arabic Name'} className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none" />
                        <input value={newMake.name} onChange={e => setNewMake({ ...newMake, name: e.target.value })} placeholder={isRTL ? 'الاسم بالإنجليزية' : 'English Name'} className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none" />
                        <div className="relative">
                            <input ref={makeLogoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImagePick(e.target.files[0], setMakeLogo, setMakeLogoPreview)} />
                            {makeLogoPreview ? (
                                <div className="flex items-center gap-3 w-full h-16 px-3 rounded-lg border-2 border-blue-400 bg-blue-50 dark:bg-blue-500/10">
                                    <img src={makeLogoPreview} className="h-10 w-10 object-contain rounded-lg border border-blue-200 bg-white" alt="" />
                                    <span className="flex-1 text-sm text-slate-600 dark:text-white/70 truncate">{makeLogo?.name}</span>
                                    <button type="button" onClick={() => clearImage(setMakeLogo, setMakeLogoPreview, makeLogoRef)} className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">✕</button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-1 w-full h-16 rounded-lg border-2 border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:border-blue-500/50 transition-colors">
                                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImagePick(e.target.files[0], setMakeLogo, setMakeLogoPreview)} />
                                    <ImagePlus className="w-5 h-5 text-slate-400" />
                                    <span className="text-xs text-slate-400">{isRTL ? 'رفع الشعار (اختياري)' : 'Upload Logo (Optional)'}</span>
                                </label>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleCreateMake} disabled={!newMake.name || !newMake.name_ar} className="flex-1 h-10 bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                {editingMakeId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {editingMakeId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة ماركة' : 'Add Make')}
                            </button>
                            {editingMakeId && (
                                <button onClick={() => { setEditingMakeId(null); setNewMake({ name: '', name_ar: '' }); clearImage(setMakeLogo, setMakeLogoPreview, makeLogoRef); }} className="px-4 h-10 bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center justify-center">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
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
                                <div className="flex items-center gap-3">
                                    {model.image_url && <img src={toRelativeImageUrl(model.image_url)} alt="" className="w-8 h-8 object-cover rounded" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                                    <span>{isRTL ? model.name_ar : model.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingModelId(model.id); setNewModel({ name: model.name, name_ar: model.name_ar }); clearImage(setModelImage, setModelImagePreview, modelImageRef); }} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/20 rounded-lg transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => handleDeleteModel(model.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 space-y-2">
                        <input value={newModel.name_ar} onChange={e => setNewModel({ ...newModel, name_ar: e.target.value })} placeholder={isRTL ? 'الاسم بالعربية' : 'Arabic Name'} className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none" />
                        <input value={newModel.name} onChange={e => setNewModel({ ...newModel, name: e.target.value })} placeholder={isRTL ? 'الاسم بالإنجليزية' : 'English Name'} className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none" />
                        <div className="relative">
                            <input ref={modelImageRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImagePick(e.target.files[0], setModelImage, setModelImagePreview)} />
                            {modelImagePreview ? (
                                <div className="flex items-center gap-3 w-full h-16 px-3 rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-500/10">
                                    <img src={modelImagePreview} className="h-10 w-10 object-contain rounded-lg border border-amber-200 bg-white" alt="" />
                                    <span className="flex-1 text-sm text-slate-600 dark:text-white/70 truncate">{modelImage?.name}</span>
                                    <button type="button" onClick={() => clearImage(setModelImage, setModelImagePreview, modelImageRef)} className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">✕</button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-1 w-full h-16 rounded-lg border-2 border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 dark:hover:border-amber-500/50 transition-colors">
                                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImagePick(e.target.files[0], setModelImage, setModelImagePreview)} />
                                    <ImagePlus className="w-5 h-5 text-slate-400" />
                                    <span className="text-xs text-slate-400">{isRTL ? 'صورة الموديل (اختياري)' : 'Model Image (Optional)'}</span>
                                </label>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleCreateModel} disabled={!newModel.name || !newModel.name_ar} className="flex-1 h-10 bg-amber-500 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                {editingModelId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {editingModelId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة موديل' : 'Add Model')}
                            </button>
                            {editingModelId && (
                                <button onClick={() => { setEditingModelId(null); setNewModel({ name: '', name_ar: '' }); clearImage(setModelImage, setModelImagePreview, modelImageRef); }} className="px-4 h-10 bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center justify-center">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
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
                                <div className="flex items-center gap-3">
                                    {year.engine_image_url && <img src={toRelativeImageUrl(year.engine_image_url)} alt="" className="w-8 h-8 object-cover rounded" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                                    <div>
                                        <span className="text-sm">{year.year_from} - {year.year_to || (isRTL ? 'الآن' : 'Present')}</span>
                                        <span className="block text-xs text-slate-400 font-normal">
                                            {[year.engine_size && `${year.engine_size}L`, year.fuel_type, year.transmission].filter(Boolean).join(' · ')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingYearId(year.id); setNewYear({ year_from: year.year_from?.toString() || '', year_to: year.year_to?.toString() || '', engine_size: year.engine_size || '', fuel_type: year.fuel_type || '', transmission: year.transmission || '' }); clearImage(setEngineImage, setEngineImagePreview, engineImageRef); }} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => handleDeleteYear(year.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
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
                        <div className="flex gap-2">
                            <select value={newYear.fuel_type} onChange={e => setNewYear({ ...newYear, fuel_type: e.target.value })} className="w-1/2 h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none text-slate-600 dark:text-white/70">
                                <option value="">{isRTL ? 'نوع الوقود' : 'Fuel Type'}</option>
                                <option value="petrol">{isRTL ? 'بنزين' : 'Petrol'}</option>
                                <option value="diesel">{isRTL ? 'ديزل' : 'Diesel'}</option>
                                <option value="hybrid">{isRTL ? 'هجين' : 'Hybrid'}</option>
                                <option value="electric">{isRTL ? 'كهربائي' : 'Electric'}</option>
                            </select>
                            <select value={newYear.transmission} onChange={e => setNewYear({ ...newYear, transmission: e.target.value })} className="w-1/2 h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-sm outline-none text-slate-600 dark:text-white/70">
                                <option value="">{isRTL ? 'ناقل الحركة' : 'Transmission'}</option>
                                <option value="manual">{isRTL ? 'يدوي' : 'Manual'}</option>
                                <option value="automatic">{isRTL ? 'أوتوماتيك' : 'Automatic'}</option>
                                <option value="cvt">CVT</option>
                                <option value="semi_automatic">{isRTL ? 'نصف أوتوماتيك' : 'Semi-Auto'}</option>
                            </select>
                        </div>
                        <div className="relative">
                            <input ref={engineImageRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImagePick(e.target.files[0], setEngineImage, setEngineImagePreview)} />
                            {engineImagePreview ? (
                                <div className="flex items-center gap-3 w-full h-16 px-3 rounded-lg border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10">
                                    <img src={engineImagePreview} className="h-10 w-10 object-contain rounded-lg border border-emerald-200 bg-white" alt="" />
                                    <span className="flex-1 text-sm text-slate-600 dark:text-white/70 truncate">{engineImage?.name}</span>
                                    <button type="button" onClick={() => clearImage(setEngineImage, setEngineImagePreview, engineImageRef)} className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">✕</button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-1 w-full h-16 rounded-lg border-2 border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:border-emerald-500/50 transition-colors">
                                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImagePick(e.target.files[0], setEngineImage, setEngineImagePreview)} />
                                    <ImagePlus className="w-5 h-5 text-slate-400" />
                                    <span className="text-xs text-slate-400">{isRTL ? 'صورة المحرك (اختياري)' : 'Engine Image (Optional)'}</span>
                                </label>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleCreateYear} disabled={!newYear.year_from} className="flex-1 h-10 bg-emerald-500 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                {editingYearId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {editingYearId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة سنة' : 'Add Year')}
                            </button>
                            {editingYearId && (
                                <button onClick={() => { setEditingYearId(null); setNewYear({ year_from: '', year_to: '', engine_size: '', fuel_type: '', transmission: '' }); clearImage(setEngineImage, setEngineImagePreview, engineImageRef); }} className="px-4 h-10 bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center justify-center">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
