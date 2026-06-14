'use client';

import { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api';

export default function BranchesPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', name_ar: '', location: '', is_active: true });
    const [editingId, setEditingId] = useState<string | null>(null);

    const loadBranches = async () => {
        try {
            setIsLoading(true);
            const res = await inventoryApi.getBranches();
            setBranches(res.data.data.branches || []);
        } catch (error) {
            console.error('Failed to load branches', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBranches();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingId) {
                await inventoryApi.updateBranch(editingId, formData);
            } else {
                await inventoryApi.createBranch(formData);
            }
            setShowModal(false);
            setFormData({ name: '', name_ar: '', location: '', is_active: true });
            setEditingId(null);
            loadBranches();
        } catch (error) {
            console.error('Failed to save branch', error);
            alert('Error saving branch');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this branch?')) return;
        try {
            await inventoryApi.deleteBranch(id);
            loadBranches();
        } catch (error) {
            console.error('Failed to delete branch', error);
            alert('Cannot delete default branch or branch in use.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة الفروع</h1>
                    <p className="text-sm text-gray-500 mt-1">تتبع وإدارة جميع فروع منشأتك عبر النظام الموحد</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ name: '', name_ar: '', location: '', is_active: true });
                        setShowModal(true);
                    }}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    + فرع جديد
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-500 animate-pulse">جاري تحميل الفروع...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branches.map(branch => (
                        <div key={branch.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group">
                            {branch.is_default && (
                                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                                    الفرع الرئيسي
                                </div>
                            )}
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${branch.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                                        🏢
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{branch.name_ar}</h3>
                                        <p className="text-xs text-gray-500">{branch.name}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">الموقع:</span>
                                        <span className="text-gray-900">{branch.location || 'غير محدد'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">الحالة:</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${branch.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {branch.is_active ? 'نشط' : 'معطل'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => {
                                            setFormData(branch);
                                            setEditingId(branch.id);
                                            setShowModal(true);
                                        }}
                                        className="flex-1 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        تعديل
                                    </button>
                                    {!branch.is_default && (
                                        <button 
                                            onClick={() => handleDelete(branch.id)}
                                            className="flex-1 bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-600 py-2 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            حذف
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {!branches.length && (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                            لا توجد فروع مسجلة حتى الآن.
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingId ? 'تعديل بيانات الفرع' : 'تسجيل فرع جديد'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (عربي)</label>
                                    <input 
                                        type="text" required 
                                        value={formData.name_ar} onChange={e => setFormData({...formData, name_ar: e.target.value})}
                                        className="w-full border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" 
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (إنجليزي)</label>
                                    <input 
                                        type="text" required 
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border text-left" dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الموقع / العنوان</label>
                                    <input 
                                        type="text"
                                        value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                                        className="w-full border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" 
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input 
                                        type="checkbox" id="is_active"
                                        checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">فرع نشط (يعمل حالياً)</label>
                                </div>

                                <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                                        إلغاء
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors disabled:opacity-50">
                                        {isSubmitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
