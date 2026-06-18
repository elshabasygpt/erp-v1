"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { fixedAssetsApi } from '@/lib/api';
import toast from 'react-hot-toast';

const CATEGORY_ICONS: Record<string, string> = { vehicles: '🚗', equipment: '💻', furniture: '🪑', buildings: '🏢', land: '🏞️', other: '📦' };

const EMPTY_FORM = { name: '', name_ar: '', category: 'equipment', purchase_date: '', purchase_cost: '', salvage_value: '', useful_life_years: '', notes: '' };

export default function FixedAssetsPage() {
    const { isRTL } = useLanguage();
    const [assets, setAssets] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<any>(EMPTY_FORM);
    const [loading, setLoading] = useState(true);

    const loadAssets = async () => {
        setLoading(true);
        try {
            const res = await fixedAssetsApi.getAssets();
            setAssets(res.data?.data || res.data || []);
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAssets();
    }, []);

    const totalCost = assets.reduce((s, a) => s + parseFloat(a.purchase_cost || '0'), 0);
    const totalBookValue = assets.reduce((s, a) => s + parseFloat(a.current_value || '0'), 0);
    const totalAccumulated = assets.reduce((s, a) => s + parseFloat(a.accumulated_depreciation || '0'), 0);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fixedAssetsApi.createAsset({
                name: form.name,
                name_ar: form.name_ar,
                purchase_date: form.purchase_date,
                purchase_cost: parseFloat(form.purchase_cost),
                salvage_value: parseFloat(form.salvage_value || '0'),
                useful_life_years: parseInt(form.useful_life_years),
                notes: form.notes
            });
            setIsModalOpen(false);
            setForm(EMPTY_FORM);
            loadAssets();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error saving asset');
        }
    };

    const runMonthlyDepreciation = async () => {
        let successCount = 0;
        for (const asset of assets) {
            if (asset.status === 'active') {
                try {
                    await fixedAssetsApi.calculateDepreciation(asset.id);
                    successCount++;
                } catch (e) {}
            }
        }
        loadAssets();
        toast.success(isRTL ? `تم ترحيل الاستهلاك لعدد ${successCount} أصل بنجاح` : `Depreciation posted for ${successCount} assets successfully!`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">
                        {isRTL ? 'الأصول الثابتة' : 'Fixed Assets'}
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">{isRTL ? 'إدارة الأصول واحتساب الاستهلاك التلقائي' : 'Manage assets and automatic depreciation'}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={runMonthlyDepreciation} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition text-sm font-medium">
                        📉 {isRTL ? 'ترحيل الاستهلاك الشهري' : 'Post Monthly Depreciation'}
                    </button>
                    <button onClick={() => { setForm(EMPTY_FORM); setIsModalOpen(true); }} className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:opacity-90 transition text-sm font-medium">
                        + {isRTL ? 'أصل جديد' : 'New Asset'}
                    </button>
                </div>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: isRTL ? 'إجمالي التكلفة الأصلية' : 'Total Original Cost', value: totalCost.toFixed(2), color: 'text-slate-700 dark:text-slate-200', icon: '💰' },
                    { label: isRTL ? 'إجمالي الاستهلاك المتراكم' : 'Total Accumulated Depreciation', value: totalAccumulated.toFixed(2), color: 'text-red-600', icon: '📉' },
                    { label: isRTL ? 'إجمالي القيمة الدفترية' : 'Total Book Value', value: totalBookValue.toFixed(2), color: 'text-emerald-600', icon: '📊' },
                ].map(kpi => (
                    <div key={kpi.label} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                            <span>{kpi.icon}</span>
                            <span>{kpi.label}</span>
                        </div>
                        <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Assets Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            {[
                                isRTL ? 'الأصل' : 'Asset',
                                isRTL ? 'التصنيف' : 'Category',
                                isRTL ? 'تاريخ الشراء' : 'Purchase Date',
                                isRTL ? 'التكلفة الأصلية' : 'Cost',
                                isRTL ? 'الاستهلاك المتراكم' : 'Accumulated Dep.',
                                isRTL ? 'القيمة الدفترية' : 'Book Value',
                                isRTL ? 'نسبة الاستهلاك' : 'Dep. Rate',
                            ].map(h => (
                                <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading...</td></tr>
                        ) : assets.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-500">{isRTL ? 'لا توجد أصول مسجلة' : 'No assets found'}</td></tr>
                        ) : assets.map(asset => {
                            const cost = parseFloat(asset.purchase_cost || '0');
                            const salvage = parseFloat(asset.salvage_value || '0');
                            const accDep = parseFloat(asset.accumulated_depreciation || '0');
                            const bookVal = parseFloat(asset.current_value || cost);
                            const depPercent = cost - salvage > 0 ? ((accDep / (cost - salvage)) * 100).toFixed(0) : '0';
                            
                            return (
                                <tr key={asset.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className={`px-4 py-3 font-medium ${isRTL ? 'text-right' : ''}`}>
                                        {isRTL ? asset.name_ar || asset.name : asset.name}
                                    </td>
                                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                                        <span className="flex items-center gap-1.5">
                                            {CATEGORY_ICONS[asset.category || 'equipment'] || '📦'}
                                            <span className="capitalize text-slate-600 dark:text-slate-400">{asset.category || 'Equipment'}</span>
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 text-slate-500 ${isRTL ? 'text-right' : ''}`}>{asset.purchase_date}</td>
                                    <td className={`px-4 py-3 font-medium ${isRTL ? 'text-right' : ''}`}>{cost.toFixed(2)}</td>
                                    <td className={`px-4 py-3 text-red-500 ${isRTL ? 'text-right' : ''}`}>{accDep.toFixed(2)}</td>
                                    <td className={`px-4 py-3 font-bold text-emerald-600 ${isRTL ? 'text-right' : ''}`}>{bookVal.toFixed(2)}</td>
                                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[80px]">
                                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, parseInt(depPercent))}%` }}/>
                                            </div>
                                            <span className="text-xs text-slate-500">{depPercent}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg">{isRTL ? 'تسجيل أصل ثابت جديد' : 'Register New Fixed Asset'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'اسم الأصل' : 'Asset Name (English)'} *</label>
                                    <input required value={form.name} onChange={e => setForm((f: any) => ({...f, name: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'اسم الأصل بالعربية' : 'Asset Name (Arabic)'}</label>
                                    <input value={form.name_ar} onChange={e => setForm((f: any) => ({...f, name_ar: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'التصنيف' : 'Category'}</label>
                                    <select value={form.category} onChange={e => setForm((f: any) => ({...f, category: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                        {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'تاريخ الشراء' : 'Purchase Date'} *</label>
                                    <input required type="date" value={form.purchase_date} onChange={e => setForm((f: any) => ({...f, purchase_date: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'التكلفة الأصلية' : 'Cost'} *</label>
                                    <input required type="number" min="0" step="0.01" value={form.purchase_cost} onChange={e => setForm((f: any) => ({...f, purchase_cost: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'قيمة التخريد' : 'Salvage Value'}</label>
                                    <input type="number" min="0" step="0.01" value={form.salvage_value} onChange={e => setForm((f: any) => ({...f, salvage_value: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm" placeholder="0"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{isRTL ? 'العمر الافتراضي (سنوات)' : 'Useful Life (years)'} *</label>
                                    <input required type="number" min="1" value={form.useful_life_years} onChange={e => setForm((f: any) => ({...f, useful_life_years: e.target.value}))} className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                </div>
                                {form.purchase_cost && form.useful_life_years && (
                                    <div className="col-span-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                            {isRTL ? 'قسط الاستهلاك السنوي:' : 'Annual Depreciation:'}&nbsp;
                                            <strong>{(((parseFloat(form.purchase_cost) || 0) - (parseFloat(form.salvage_value) || 0)) / (parseInt(form.useful_life_years) || 1)).toFixed(2)}</strong>
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                                <button type="submit" className="px-5 py-2 text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:opacity-90 font-medium">{isRTL ? 'حفظ الأصل' : 'Save Asset'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
