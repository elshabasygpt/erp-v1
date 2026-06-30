import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { suppliersApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

interface ProductExportModalProps {
    dict: any;
    locale: string;
    onClose: () => void;
    groups: any[];
    warehouses: any[];
    isInline?: boolean;
}

export default function ProductExportModal({ dict, locale, onClose, groups, warehouses, isInline = false }: ProductExportModalProps) {
    const isRTL = locale === 'ar';
    const inv = dict.inventory || {};

    const [format, setFormat] = useState<'xlsx' | 'csv' | 'ods'>('xlsx');
    const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [categoryId, setCategoryId] = useState<string>('');
    const [brand, setBrand] = useState<string>('');
    const [supplierId, setSupplierId] = useState<string>('');
    const [warehouseId, setWarehouseId] = useState<string>('');
    const [isExporting, setIsExporting] = useState(false);

    const { data: suppliersResponse } = useQuery({
        queryKey: ['suppliers_list'],
        queryFn: () => suppliersApi.getSuppliers({ limit: 100 })
    });
    const suppliers = suppliersResponse?.data?.data || [];

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('format', format);
            
            if (status === 'active') queryParams.append('is_active', '1');
            if (status === 'inactive') queryParams.append('is_active', '0');
            if (categoryId) queryParams.append('category_id', categoryId);
            if (brand) queryParams.append('brand', brand);
            if (supplierId) queryParams.append('supplier_id', supplierId);
            if (warehouseId) queryParams.append('warehouse_id', warehouseId);

            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant/products/export?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Export failed');
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `products_export_${new Date().getTime()}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
            
            toast.success(isRTL ? 'تم التصدير بنجاح' : 'Exported successfully');
            onClose();
        } catch (err) {
            toast.error(isRTL ? 'فشل التصدير' : 'Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="modal-overlay z-50">
            <div className="modal-content !max-w-md animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
                            📤
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                                {isRTL ? 'تصدير المنتجات المتقدم' : 'Advanced Product Export'}
                            </h2>
                            <p className="text-sm text-surface-500">
                                {isRTL ? 'تخصيص البيانات التي ترغب بتصديرها' : 'Customize the data you want to export'}
                            </p>
                        </div>
                    </div>
                    {!isInline && (
                        <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors" aria-label={isRTL ? 'إغلاق' : 'Close'}>
                            ✕
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                            {isRTL ? 'صيغة الملف' : 'File Format'}
                        </label>
                        <div className="flex gap-2">
                            {['xlsx', 'csv', 'ods'].map((fmt) => (
                                <button
                                    key={fmt}
                                    onClick={() => setFormat(fmt as any)}
                                    className={`flex-1 py-2 text-sm font-bold rounded-xl border transition-all ${
                                        format === fmt 
                                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 shadow-sm' 
                                        : 'border-surface-200 bg-white text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400'
                                    }`}
                                >
                                    {fmt.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                            {isRTL ? 'حالة المنتج' : 'Product Status'}
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="input-field w-full"
                        >
                            <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                            <option value="active">{isRTL ? 'نشط فقط' : 'Active Only'}</option>
                            <option value="inactive">{isRTL ? 'غير نشط فقط' : 'Inactive Only'}</option>
                        </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                        <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                            {isRTL ? 'القسم' : 'Category'}
                        </label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="input-field w-full"
                        >
                            <option value="">{isRTL ? 'كل الأقسام' : 'All Categories'}</option>
                            {groups.map(g => (
                                <optgroup key={g.id} label={isRTL ? g.nameAr : g.name}>
                                    <option value={g.id}>{isRTL ? g.nameAr : g.name} (الرئيسي)</option>
                                    {g.subGroups?.map((sub: any) => (
                                        <option key={sub.id} value={sub.id}>-- {isRTL ? sub.nameAr : sub.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {/* Brand Filter */}
                    <div>
                        <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                            {isRTL ? 'العلامة التجارية' : 'Brand'}
                        </label>
                        <input
                            type="text"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            className="input-field w-full"
                            placeholder={isRTL ? 'ادخل العلامة التجارية (اختياري)' : 'Enter Brand (Optional)'}
                        />
                    </div>

                    {/* Supplier Filter */}
                    <div>
                        <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                            {isRTL ? 'المورد الافتراضي' : 'Default Supplier'}
                        </label>
                        <select
                            value={supplierId}
                            onChange={(e) => setSupplierId(e.target.value)}
                            className="input-field w-full"
                        >
                            <option value="">{isRTL ? 'كل الموردين' : 'All Suppliers'}</option>
                            {suppliers.map((sup: any) => (
                                <option key={sup.id} value={sup.id}>{isRTL ? sup.name_ar || sup.name : sup.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Warehouse Filter */}
                    <div>
                        <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                            {isRTL ? 'المستودع' : 'Warehouse'}
                        </label>
                        <select
                            value={warehouseId}
                            onChange={(e) => setWarehouseId(e.target.value)}
                            className="input-field w-full"
                        >
                            <option value="">{isRTL ? 'كل المستودعات' : 'All Warehouses'}</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{isRTL ? w.name_ar || w.name : w.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 flex gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="flex-1 btn-secondary py-2.5" disabled={isExporting}>
                        {dict.common?.cancel || (isRTL ? 'إلغاء' : 'Cancel')}
                    </button>
                    <button onClick={handleExport} className="flex-1 btn-primary py-2.5 bg-amber-500 hover:bg-amber-600 border-amber-500 dark:border-amber-600 shadow-amber-500/30" disabled={isExporting}>
                        {isExporting ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                {isRTL ? 'جاري التصدير...' : 'Exporting...'}
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                📤 {isRTL ? 'تصدير الآن' : 'Export Now'}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
