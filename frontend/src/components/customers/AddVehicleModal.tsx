'use client';

import React, { useState, useEffect } from 'react';
import { inventoryApi, crmApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface AddVehicleModalProps {
    customerId: string;
    vehicle?: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (vehicle: any) => void;
    locale: string;
}

export default function AddVehicleModal({ customerId, vehicle, isOpen, onClose, onSuccess, locale }: AddVehicleModalProps) {
    const isRTL = locale === 'ar';
    const [makes, setMakes] = useState<any[]>([]);
    const [models, setModels] = useState<any[]>([]);
    const [years, setYears] = useState<any[]>([]);
    
    const [selectedMake, setSelectedMake] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('');
    
    const [form, setForm] = useState({
        vehicle_year_id: '',
        plate_number: '',
        plate_number_en: '',
        color: '',
        mileage: '',
        purchase_year: '',
        vin: '',
        notes: ''
    });
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        inventoryApi.getVehicleMakes().then(res => setMakes(res.data?.data || []));
        
        if (vehicle) {
            // Edit mode setup
            setForm({
                vehicle_year_id: vehicle.vehicle_year_id || '',
                plate_number: vehicle.plate_number || '',
                plate_number_en: vehicle.plate_number_en || '',
                color: vehicle.color || '',
                mileage: vehicle.mileage || '',
                purchase_year: vehicle.purchase_year || '',
                vin: vehicle.vin || '',
                notes: vehicle.notes || ''
            });
            const makeId = vehicle.vehicleYear?.vehicleModel?.make_id;
            const modelId = vehicle.vehicleYear?.model_id;
            if (makeId) {
                setSelectedMake(makeId);
                inventoryApi.getVehicleModels(makeId).then(res => setModels(res.data?.data || []));
            }
            if (modelId) {
                setSelectedModel(modelId);
                inventoryApi.getVehicleYears(modelId).then(res => setYears(res.data?.data || []));
            }
        } else {
            // Add mode reset
            setForm({
                vehicle_year_id: '', plate_number: '', plate_number_en: '',
                color: '', mileage: '', purchase_year: '', vin: '', notes: ''
            });
            setSelectedMake('');
            setSelectedModel('');
            setModels([]);
            setYears([]);
        }
    }, [isOpen, vehicle]);

    const handleMakeChange = (makeId: string) => {
        setSelectedMake(makeId);
        setSelectedModel('');
        setForm({ ...form, vehicle_year_id: '' });
        setYears([]);
        if (makeId) {
            inventoryApi.getVehicleModels(makeId).then(res => setModels(res.data?.data || []));
        } else {
            setModels([]);
        }
    };

    const handleModelChange = (modelId: string) => {
        setSelectedModel(modelId);
        setForm({ ...form, vehicle_year_id: '' });
        if (modelId) {
            inventoryApi.getVehicleYears(modelId).then(res => setYears(res.data?.data || []));
        } else {
            setYears([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data: any = { ...form };
            if (!data.mileage) delete data.mileage;
            if (!data.purchase_year) delete data.purchase_year;

            if (vehicle?.id) {
                await crmApi.updateCustomerVehicle(customerId, vehicle.id, data);
            } else {
                await crmApi.addCustomerVehicle(customerId, data);
            }
            onSuccess(data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error saving vehicle');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: 'var(--bg-surface)' }}>
                <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-default)' }}>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {vehicle ? (isRTL ? 'تعديل سيارة' : 'Edit Vehicle') : (isRTL ? 'إضافة سيارة للعميل' : 'Add Vehicle')}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5" style={{ color: 'var(--text-secondary)' }} aria-label={isRTL ? 'إغلاق' : 'Close'}>✕</button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="vehicleForm" onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'ماركة السيارة' : 'Make'}</label>
                                <select required value={selectedMake} onChange={e => handleMakeChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }}>
                                    <option value="">{isRTL ? 'اختر الماركة...' : 'Select make...'}</option>
                                    {makes.map(m => <option key={m.id} value={m.id}>{isRTL ? m.name_ar || m.name : m.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'الموديل' : 'Model'}</label>
                                <select required disabled={!selectedMake} value={selectedModel} onChange={e => handleModelChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border disabled:opacity-50" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }}>
                                    <option value="">{isRTL ? 'اختر الموديل...' : 'Select model...'}</option>
                                    {models.map(m => <option key={m.id} value={m.id}>{isRTL ? m.name_ar || m.name : m.name}</option>)}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'سنة الصنع / الفئة' : 'Year / Trim'}</label>
                                <select required disabled={!selectedModel} value={form.vehicle_year_id} onChange={e => setForm({ ...form, vehicle_year_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border disabled:opacity-50" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }}>
                                    <option value="">{isRTL ? 'اختر السنة...' : 'Select year...'}</option>
                                    {years.map(y => {
                                        const parts = [
                                            `${y.year_from}${y.year_to ? `-${y.year_to}` : '+'}`,
                                            y.engine_size || '',
                                            y.fuel_type || '',
                                            y.transmission || '',
                                        ].filter(Boolean);
                                        return <option key={y.id} value={y.id}>{parts.join(' · ')}</option>;
                                    })}
                                </select>
                            </div>
                        </div>

                        <hr style={{ borderColor: 'var(--border-default)' }} />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'رقم اللوحة' : 'Plate Number'}</label>
                                <input type="text" placeholder="أ ب ج 1234" value={form.plate_number} onChange={e => setForm({ ...form, plate_number: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'اللوحة (انجليزي)' : 'Plate (EN)'}</label>
                                <input type="text" placeholder="ABC 1234" value={form.plate_number_en} onChange={e => setForm({ ...form, plate_number_en: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'لون السيارة' : 'Color'}</label>
                                <input type="text" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'رقم الهيكل (VIN)' : 'VIN'}</label>
                                <input type="text" maxLength={17} value={form.vin} onChange={e => setForm({ ...form, vin: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'قراءة العداد (كم)' : 'Mileage'}</label>
                                <input type="number" min="0" value={form.mileage} onChange={e => setForm({ ...form, mileage: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'سنة الشراء' : 'Purchase Year'}</label>
                                <input type="number" min="1900" max={new Date().getFullYear() + 1} value={form.purchase_year} onChange={e => setForm({ ...form, purchase_year: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'ملاحظات' : 'Notes'}</label>
                            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }}></textarea>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-default)' }}>
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-semibold transition-colors" style={{ color: 'var(--text-secondary)', background: 'var(--bg-input)' }}>
                        {isRTL ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button type="submit" form="vehicleForm" disabled={loading} className="btn-primary px-6 py-2.5 disabled:opacity-50">
                        {loading ? '...' : (isRTL ? 'حفظ السيارة' : 'Save Vehicle')}
                    </button>
                </div>
            </div>
        </div>
    );
}
