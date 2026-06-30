'use client';

import { useState, useEffect, useRef } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useLanguage } from '@/i18n/LanguageContext';
import { inventoryApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Check, Search, Award, Upload, ImageOff, Globe } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/Skeleton';

const COUNTRIES = [
    { code: 'SA', name: 'المملكة العربية السعودية', nameEn: 'Saudi Arabia' },
    { code: 'AE', name: 'الإمارات العربية المتحدة', nameEn: 'UAE' },
    { code: 'JP', name: 'اليابان', nameEn: 'Japan' },
    { code: 'DE', name: 'ألمانيا', nameEn: 'Germany' },
    { code: 'US', name: 'الولايات المتحدة', nameEn: 'USA' },
    { code: 'KR', name: 'كوريا الجنوبية', nameEn: 'South Korea' },
    { code: 'CN', name: 'الصين', nameEn: 'China' },
    { code: 'IT', name: 'إيطاليا', nameEn: 'Italy' },
    { code: 'FR', name: 'فرنسا', nameEn: 'France' },
    { code: 'GB', name: 'المملكة المتحدة', nameEn: 'UK' },
    { code: 'TR', name: 'تركيا', nameEn: 'Turkey' },
    { code: 'TW', name: 'تايوان', nameEn: 'Taiwan' },
    { code: 'IN', name: 'الهند', nameEn: 'India' },
    { code: 'MX', name: 'المكسيك', nameEn: 'Mexico' },
    { code: 'BR', name: 'البرازيل', nameEn: 'Brazil' },
    { code: 'TH', name: 'تايلاند', nameEn: 'Thailand' },
    { code: 'ES', name: 'إسبانيا', nameEn: 'Spain' },
    { code: 'SE', name: 'السويد', nameEn: 'Sweden' },
    { code: 'EG', name: 'مصر', nameEn: 'Egypt' },
    { code: 'OTHER', name: 'أخرى', nameEn: 'Other' },
];

interface Brand {
    id: string;
    name: string;
    name_ar: string | null;
    image_url: string | null;
    country_of_origin: string | null;
}

export default function BrandsPage() {
    const { isRTL } = useLanguage();
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const confirm = useConfirm();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Brand | null>(null);
    const [form, setForm] = useState({ name: '', name_ar: '', country_of_origin: '' });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchBrands(); }, []);

    const fetchBrands = async () => {
        try {
            setLoading(true);
            setLoadError(false);
            const res = await inventoryApi.getBrands();
            const data = res.data?.data ?? res.data ?? [];
            setBrands(Array.isArray(data) ? data : []);
        } catch {
            toast.error(isRTL ? 'فشل تحميل الماركات' : 'Failed to load brands');
            setBrands([]);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', name_ar: '', country_of_origin: '' });
        setImageFile(null);
        setImagePreview(null);
        setShowForm(true);
    };

    const openEdit = (brand: Brand) => {
        setEditing(brand);
        setForm({ name: brand.name, name_ar: brand.name_ar ?? '', country_of_origin: brand.country_of_origin ?? '' });
        setImageFile(null);
        setImagePreview(brand.image_url);
        setShowForm(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error(isRTL ? 'حجم الصورة يجب أن يكون أقل من 2 ميجا' : 'Image size must be less than 2 MB'); return; }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error(isRTL ? 'اسم الماركة مطلوب' : 'Brand name is required'); return; }
        setSaving(true);
        try {
            // Use FormData only when there's an image, otherwise plain JSON
            if (imageFile) {
                const fd = new FormData();
                fd.append('name', form.name);
                if (form.name_ar) fd.append('name_ar', form.name_ar);
                if (form.country_of_origin) fd.append('country_of_origin', form.country_of_origin);
                fd.append('image', imageFile);
                if (editing) {
                    // Backend uses POST for update with FormData
                    await inventoryApi.updateBrand(editing.id, fd);
                } else {
                    await inventoryApi.createBrand(fd);
                }
            } else {
                const payload = { name: form.name, name_ar: form.name_ar || null, country_of_origin: form.country_of_origin || null };
                if (editing) {
                    await inventoryApi.updateBrand(editing.id, payload);
                } else {
                    await inventoryApi.createBrand(payload);
                }
            }
            toast.success(editing ? (isRTL ? 'تم تحديث الماركة' : 'Brand updated') : (isRTL ? 'تم إنشاء الماركة' : 'Brand created'));
            setShowForm(false);
            fetchBrands();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشلت العملية' : 'Operation failed'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!await confirm(isRTL ? `هل تريد حذف الماركة "${name}"؟` : `Delete brand "${name}"?`)) return;
        try {
            await inventoryApi.deleteBrand(id);
            toast.success(isRTL ? 'تم الحذف' : 'Deleted');
            fetchBrands();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشل الحذف' : 'Failed to delete'));
        }
    };

    const filtered = brands.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        (b.name_ar ?? '').includes(search)
    );

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isRTL ? 'الماركات' : 'Brands'}</h1>
                    <p className="text-gray-500 mt-1">{isRTL ? 'إدارة ماركات وعلامات المنتجات التجارية' : 'Manage product brands and trademarks'}</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'ماركة جديدة' : 'New Brand'}
                </Button>
            </div>

            {showForm && (
                <Card className="p-5 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="font-semibold text-lg">{editing ? (isRTL ? 'تعديل الماركة' : 'Edit Brand') : (isRTL ? 'إضافة ماركة جديدة' : 'Add New Brand')}</h3>
                        <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>

                    <div className="flex gap-6 flex-col md:flex-row">
                        {/* Image Upload */}
                        <div className="flex flex-col items-center gap-3 flex-shrink-0">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-32 h-32 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors overflow-hidden"
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="preview" className="w-full h-full object-contain" />
                                ) : (
                                    <>
                                        <Upload className="w-7 h-7 text-purple-400 mb-1" />
                                        <span className="text-xs text-purple-500 text-center">{isRTL ? 'رفع شعار' : 'Upload Logo'}</span>
                                        <span className="text-xs text-gray-400">PNG / JPG</span>
                                    </>
                                )}
                            </div>
                            {imagePreview && (
                                <button
                                    onClick={() => { setImageFile(null); setImagePreview(editing?.image_url ?? null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                    className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                                >
                                    <ImageOff className="w-3.5 h-3.5" /> {isRTL ? 'إزالة الصورة' : 'Remove Image'}
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                            <p className="text-xs text-gray-400 text-center">{isRTL ? 'الحد الأقصى 2 ميجا' : 'Max 2 MB'}</p>
                        </div>

                        {/* Fields — Arabic first (RTL layout) */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">{isRTL ? 'الاسم بالعربي' : 'Arabic Name'}</label>
                                <input
                                    className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                    value={form.name_ar}
                                    onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                                    placeholder={isRTL ? 'تويوتا، سامسونج...' : 'Toyota, Samsung...'}
                                    dir="rtl"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">{isRTL ? 'الاسم بالإنجليزي *' : 'English Name *'}</label>
                                <input
                                    className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Toyota, Samsung..."
                                    dir="ltr"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                                    {isRTL ? 'بلد المنشأ' : 'Country of Origin'}
                                </label>
                                <select
                                    className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                    value={form.country_of_origin}
                                    onChange={e => setForm(f => ({ ...f, country_of_origin: e.target.value }))}
                                >
                                    <option value="">{isRTL ? '-- اختر البلد --' : '-- Select Country --'}</option>
                                    {COUNTRIES.map(c => (
                                        <option key={c.code} value={c.code}>
                                            {c.name} — {c.nameEn}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-5">
                        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
                        </Button>
                        <Button variant="outline" onClick={() => setShowForm(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    </div>
                </Card>
            )}

            <Card className="overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            className="border rounded pr-9 pl-3 py-2 w-full bg-white dark:bg-gray-800"
                            placeholder={isRTL ? 'بحث عن ماركة...' : 'Search brands...'}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <span className="text-sm text-gray-500 mr-3 flex-shrink-0">{filtered.length} {isRTL ? 'ماركة' : 'brands'}</span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
                        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                    </div>
                ) : loadError ? (
                    <div className="p-8 text-center">
                        <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>{isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}</p>
                        <button onClick={() => fetchBrands()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
                        {filtered.map(brand => (
                            <div
                                key={brand.id}
                                className="border dark:border-gray-700 rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600 transition-all group"
                            >
                                {brand.image_url ? (
                                    <img
                                        src={brand.image_url}
                                        alt={brand.name}
                                        className="w-16 h-16 object-contain rounded-lg"
                                    />
                                ) : (
                                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                        <Award className="w-8 h-8 text-purple-400" />
                                    </div>
                                )}
                                <div className="text-center min-w-0 w-full">
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{brand.name_ar || brand.name}</p>
                                    {brand.name_ar && <p className="text-xs text-gray-400 truncate" dir="ltr">{brand.name}</p>}
                                    {brand.country_of_origin && (
                                        <p className="text-xs text-blue-500 mt-0.5 flex items-center justify-center gap-1">
                                            <Globe className="w-3 h-3" />
                                            {(() => { const c = COUNTRIES.find(c => c.code === brand.country_of_origin); return c ? (isRTL ? c.name : c.nameEn) : brand.country_of_origin; })()}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(brand)} className="h-7 px-2">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(brand.id, brand.name)} className="h-7 px-2 text-red-500 hover:text-red-700">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-400">
                                <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>{isRTL ? 'لا توجد ماركات. اضغط "ماركة جديدة" للبدء.' : 'No brands found. Click "New Brand" to start.'}</p>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
