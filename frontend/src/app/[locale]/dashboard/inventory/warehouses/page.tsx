'use client';

import { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useLanguage } from '@/i18n/LanguageContext';

interface Branch {
    id: string;
    name: string;
    name_ar: string;
}

interface Warehouse {
    id: string;
    name: string;
    location: string | null;
    branch_id: string;
    branch?: Branch;
    is_default: boolean;
    is_active: boolean;
    warehouse_products_count?: number;
}

interface FormData {
    name: string;
    location: string;
    branch_id: string;
    is_default: boolean;
    is_active: boolean;
}

const emptyForm: FormData = {
    name: '',
    location: '',
    branch_id: '',
    is_default: false,
    is_active: true,
};

export default function WarehousesPage() {
    const { isRTL } = useLanguage();
    const t = (ar: string, en: string) => isRTL ? ar : en;

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<FormData>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const loadWarehouses = async () => {
        try {
            setIsLoading(true);
            const res = await inventoryApi.getWarehouses();
            setWarehouses(res.data?.data?.warehouses || []);
        } catch {
            toast.error(t('فشل تحميل المستودعات', 'Failed to load warehouses'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadWarehouses();
        inventoryApi.getBranches()
            .then((res: any) => setBranches(res.data?.data?.branches || []))
            .catch(() => setBranches([]));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const openCreate = () => {
        setEditingId(null);
        setFormData(emptyForm);
        setShowModal(true);
    };

    const openEdit = (w: Warehouse) => {
        setEditingId(w.id);
        setFormData({
            name: w.name,
            location: w.location ?? '',
            branch_id: w.branch_id,
            is_default: w.is_default,
            is_active: w.is_active,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData(emptyForm);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.branch_id) {
            toast.error(t('يرجى اختيار الفرع', 'Please select a branch'));
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                name: formData.name,
                location: formData.location || null,
                branch_id: formData.branch_id,
                is_default: formData.is_default,
                is_active: formData.is_active,
            };
            if (editingId) {
                await inventoryApi.updateWarehouse(editingId, payload);
                toast.success(t('تم تحديث المستودع بنجاح', 'Warehouse updated successfully'));
            } else {
                await inventoryApi.createWarehouse(payload);
                toast.success(t('تم إنشاء المستودع بنجاح', 'Warehouse created successfully'));
            }
            closeModal();
            loadWarehouses();
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('فشلت العملية، يرجى المحاولة مجدداً', 'Operation failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await inventoryApi.deleteWarehouse(id);
            toast.success(t('تم حذف المستودع', 'Warehouse deleted'));
            setDeleteConfirmId(null);
            loadWarehouses();
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('لا يمكن حذف هذا المستودع', 'Cannot delete this warehouse'));
            setDeleteConfirmId(null);
        }
    };

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('إدارة المستودعات', 'Warehouses')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('تتبع وإدارة جميع مستودعات المنشأة', 'Track and manage all warehouses')}
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
                >
                    + {t('مستودع جديد', 'New Warehouse')}
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: t('إجمالي المستودعات', 'Total Warehouses'), value: warehouses.length },
                    { label: t('مستودعات نشطة', 'Active'), value: warehouses.filter(w => w.is_active).length },
                    { label: t('غير نشطة', 'Inactive'), value: warehouses.filter(w => !w.is_active).length },
                    { label: t('إجمالي الأصناف', 'Total SKUs'), value: warehouses.reduce((sum, w) => sum + (w.warehouse_products_count ?? 0), 0) },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Warehouse Cards Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 animate-pulse">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-600" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded" />
                                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : warehouses.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-16 text-center">
                    <div className="text-5xl mb-4">🏭</div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('لا توجد مستودعات مسجلة', 'No warehouses found')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('أضف مستودعاً جديداً للبدء في تتبع المخزون', 'Add your first warehouse to start tracking inventory')}</p>
                    <button
                        onClick={openCreate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
                    >
                        + {t('إضافة أول مستودع', 'Add First Warehouse')}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warehouses.map(warehouse => (
                        <div
                            key={warehouse.id}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group"
                        >
                            {/* Default Badge */}
                            {warehouse.is_default && (
                                <div className="absolute top-0 start-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1 rounded-br-xl z-10">
                                    ★ {t('افتراضي', 'Default')}
                                </div>
                            )}

                            <div className="p-6">
                                {/* Card Header */}
                                <div className="flex items-start gap-4 mb-5">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                                        warehouse.is_active
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30'
                                            : 'bg-gray-100 dark:bg-gray-700 opacity-60'
                                    }`}>
                                        🏭
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight truncate">
                                            {warehouse.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {(isRTL ? warehouse.branch?.name_ar : null) || warehouse.branch?.name || t('لا يوجد فرع', 'No branch')}
                                        </p>
                                    </div>
                                </div>

                                {/* Card Details */}
                                <div className="space-y-2.5 mb-5">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">{t('الموقع', 'Location')}</span>
                                        <span className="text-gray-900 dark:text-gray-100 text-right max-w-[60%] truncate">
                                            {warehouse.location || t('غير محدد', 'N/A')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">{t('عدد الأصناف', 'SKUs')}</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {warehouse.warehouse_products_count ?? '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">{t('الحالة', 'Status')}</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                            warehouse.is_active
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                        }`}>
                                            {warehouse.is_active ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className={`pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2 transition-opacity ${deleteConfirmId === warehouse.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <button
                                        onClick={() => openEdit(warehouse)}
                                        className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    >
                                        {t('تعديل', 'Edit')}
                                    </button>

                                    {!warehouse.is_default && (
                                        deleteConfirmId === warehouse.id ? (
                                            <div className="flex gap-1 flex-1">
                                                <button
                                                    onClick={() => handleDelete(warehouse.id)}
                                                    className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
                                                >
                                                    {t('تأكيد', 'Confirm')}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmId(null)}
                                                    className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                                                >
                                                    {t('إلغاء', 'Cancel')}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirmId(warehouse.id)}
                                                className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                            >
                                                {t('حذف', 'Delete')}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🏭</span>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingId ? t('تعديل بيانات المستودع', 'Edit Warehouse') : t('تسجيل مستودع جديد', 'New Warehouse')}
                                </h2>
                            </div>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none transition-colors"
                             aria-label={isRTL ? 'إغلاق' : 'Close'}>
                                ×
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        {t('اسم المستودع', 'Warehouse Name')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder={t('مثال: المستودع الرئيسي', 'e.g. Main Warehouse')}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition"
                                    />
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        {t('الموقع / العنوان', 'Location / Address')}
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        placeholder={t('مثال: المنطقة الصناعية، المبنى 5', 'e.g. Industrial Zone, Building 5')}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 outline-none resize-none transition"
                                    />
                                </div>

                                {/* Branch */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        {t('الفرع', 'Branch')} <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.branch_id}
                                        onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none transition"
                                    >
                                        <option value="">{t('-- اختر الفرع --', '-- Select Branch --')}</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {(isRTL ? b.name_ar : null) || b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Toggles */}
                                <div className="flex flex-col gap-3 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('مستودع نشط', 'Active warehouse')}</p>
                                            <p className="text-xs text-gray-400">{t('يظهر في الفواتير والمشتريات', 'Appears in invoices and purchases')}</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_default}
                                            onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                            className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-400 border-gray-300"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('مستودع افتراضي', 'Default warehouse')}</p>
                                            <p className="text-xs text-gray-400">{t('يُحدد تلقائياً عند إنشاء حركات المخزون', 'Auto-selected for new stock movements')}</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex gap-3 p-6 pt-0">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors"
                                >
                                    {t('إلغاء', 'Cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                                >
                                    {isSubmitting
                                        ? t('جاري الحفظ...', 'Saving...')
                                        : editingId
                                            ? t('حفظ التعديلات', 'Save Changes')
                                            : t('إنشاء المستودع', 'Create Warehouse')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
