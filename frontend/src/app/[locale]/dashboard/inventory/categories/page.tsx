'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useLanguage } from '@/i18n/LanguageContext';
import { inventoryApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, ChevronRight, Tag, X, Check } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    name_ar: string;
    parent_id: string | null;
    discount: number | null;
    is_active: boolean;
    image_url?: string;
    children?: Category[];
}

export default function CategoriesPage() {
    const { isRTL } = useLanguage();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const confirm = useConfirm();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [form, setForm] = useState({ name: '', name_ar: '', parent_id: '', discount: '', is_active: true });
    const [saving, setSaving] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await inventoryApi.getCategories();
            const data = res.data?.data ?? res.data ?? [];
            setCategories(Array.isArray(data) ? data : []);
        } catch {
            toast.error(isRTL ? 'فشل تحميل الفئات' : 'Failed to load categories');
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', name_ar: '', parent_id: '', discount: '', is_active: true });
        setImageFile(null);
        setImagePreview('');
        setShowForm(true);
    };

    const openEdit = (cat: Category) => {
        setEditing(cat);
        setForm({ name: cat.name, name_ar: cat.name_ar, parent_id: cat.parent_id ?? '', discount: cat.discount?.toString() ?? '', is_active: cat.is_active });
        setImageFile(null);
        setImagePreview(cat.image_url ? (cat.image_url.startsWith('http') ? cat.image_url : `/api/${cat.image_url.replace(/^\/+/, '')}`) : '');
        setShowForm(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                toast.error(isRTL ? 'يجب أن يكون الملف صورة' : 'File must be an image');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.name_ar.trim()) {
            toast.error(isRTL ? 'الاسم مطلوب بالعربية والإنجليزية' : 'Name is required in both Arabic and English');
            return;
        }
        setSaving(true);
        try {
            let payload: any = {
                name: form.name,
                name_ar: form.name_ar,
                is_active: form.is_active,
            };
            
            if (form.parent_id) payload.parent_id = form.parent_id;
            if (form.discount) payload.discount = parseFloat(form.discount);

            if (imageFile) {
                const formData = new FormData();
                Object.keys(payload).forEach(key => formData.append(key, payload[key]));
                formData.append('image', imageFile);
                if (editing) {
                    formData.append('_method', 'PUT'); // For PHP to parse FormData in update
                }
                payload = formData;
            } else if (editing) {
                payload._method = 'PUT';
            }

            if (editing) {
                await inventoryApi.updateCategory(editing.id, payload);
                toast.success(isRTL ? 'تم تحديث الفئة' : 'Category updated');
            } else {
                await inventoryApi.createCategory(payload);
                toast.success(isRTL ? 'تم إنشاء الفئة' : 'Category created');
            }
            setShowForm(false);
            fetchCategories();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشلت العملية' : 'Operation failed'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!await confirm(isRTL ? `هل تريد حذف الفئة "${name}"؟` : `Delete category "${name}"?`)) return;
        try {
            await inventoryApi.deleteCategory(id);
            toast.success(isRTL ? 'تم حذف الفئة' : 'Category deleted');
            fetchCategories();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشل الحذف' : 'Failed to delete'));
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const flatCategories = categories; // top-level only (children nested)

    const renderCategory = (cat: Category, depth = 0) => {
        const hasChildren = cat.children && cat.children.length > 0;
        const expanded = expandedIds.has(cat.id);

        return (
            <div key={cat.id}>
                <div
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b dark:border-gray-700 ${depth > 0 ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''}`}
                    style={{ paddingLeft: `${16 + depth * 24}px` }}
                >
                    {hasChildren ? (
                        <button onClick={() => toggleExpand(cat.id)} className="text-gray-400 hover:text-gray-600">
                            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        </button>
                    ) : (
                        <span className="w-4" />
                    )}
                    {cat.image_url ? (
                        <img src={cat.image_url.startsWith('http') ? cat.image_url : `/api/${cat.image_url.replace(/^\/+/, '')}`} alt="" className="w-6 h-6 object-cover rounded" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                    ) : null}
                    <Tag className={`w-4 h-4 text-blue-500 flex-shrink-0 ${cat.image_url ? 'hidden' : ''}`} />
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{cat.name}</p>
                        <p className="text-sm text-gray-500 truncate">{cat.name_ar}</p>
                    </div>
                    {cat.discount != null && cat.discount > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{cat.discount}% {isRTL ? 'خصم' : 'off'}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {cat.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                    </span>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                            <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id, cat.name)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                {hasChildren && expanded && cat.children!.map(child => renderCategory(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isRTL ? 'فئات المنتجات' : 'Product Categories'}</h1>
                    <p className="text-gray-500 mt-1">{isRTL ? 'إدارة تصنيفات المنتجات الهرمية' : 'Manage hierarchical product categories'}</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'فئة جديدة' : 'New Category'}
                </Button>
            </div>

            {/* Form */}
            {showForm && (
                <Card className="p-5 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg">{editing ? (isRTL ? 'تعديل الفئة' : 'Edit Category') : (isRTL ? 'إضافة فئة جديدة' : 'Add New Category')}</h3>
                        <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{isRTL ? 'الاسم (English) *' : 'English Name *'}</label>
                            <input
                                className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder={isRTL ? 'اسم الفئة بالإنجليزية' : 'Category name'}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{isRTL ? 'الاسم بالعربي *' : 'Arabic Name *'}</label>
                            <input
                                className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.name_ar}
                                onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                                placeholder={isRTL ? 'اسم الفئة' : 'Category name in Arabic'}
                                dir="rtl"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{isRTL ? 'الفئة الأم (اختياري)' : 'Parent Category (optional)'}</label>
                            <select
                                className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.parent_id}
                                onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                            >
                                <option value="">{isRTL ? '-- بدون فئة أم --' : '-- No parent --'}</option>
                                {categories.filter(c => c.id !== editing?.id).map(c => (
                                    <option key={c.id} value={c.id}>{c.name} / {c.name_ar}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{isRTL ? 'خصم الفئة %' : 'Category Discount %'}</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.discount}
                                onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                                placeholder="0"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{isRTL ? 'صورة الفئة (اختياري)' : 'Category Image (optional)'}</label>
                            <div className="flex items-center gap-4">
                                {imagePreview && (
                                    <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded border" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 md:col-span-2">
                            <input type="checkbox" id="cat_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                            <label htmlFor="cat_active" className="text-sm text-gray-700 dark:text-gray-300">{isRTL ? 'نشط' : 'Active'}</label>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
                        </Button>
                        <Button variant="outline" onClick={() => setShowForm(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    </div>
                </Card>
            )}

            {/* Categories Tree */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">{isRTL ? 'قائمة الفئات' : 'Categories List'} ({categories.length})</h3>
                    <button onClick={() => setExpandedIds(new Set(categories.map(c => c.id)))} className="text-sm text-blue-500 hover:underline">{isRTL ? 'توسيع الكل' : 'Expand All'}</button>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                ) : categories.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">{isRTL ? 'لا توجد فئات. أضف فئة جديدة للبدء.' : 'No categories found. Add a new category to start.'}</div>
                ) : (
                    <div>{categories.map(cat => renderCategory(cat))}</div>
                )}
            </Card>
        </div>
    );
}
