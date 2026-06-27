'use client';
import { useState, memo, useEffect, useRef } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { X, Image as ImageIcon } from 'lucide-react';
import { inventoryApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useParams } from 'next/navigation';
import { toRelativeImageUrl } from '@/lib/utils';

interface Brand {
    id: string;
    name: string;
    name_ar?: string;
    image_url?: string;
}

interface ManageBrandsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (brand: Brand) => void;
}

export default function ManageBrandsModal({ isOpen, onClose, onSuccess }: ManageBrandsModalProps) {
    const params = useParams();
    const locale = params?.locale === 'ar' ? 'ar' : 'en';
    const isRTL = locale === 'ar';
    const queryClient = useQueryClient();

    const { data: brandsRes, isLoading } = useQuery({
        queryKey: ['brands'],
        queryFn: () => inventoryApi.getBrands(),
        enabled: isOpen,
    });
    const brands: Brand[] = brandsRes?.data?.data || [];

    const [newName, setNewName] = useState('');
    const [newNameAr, setNewNameAr] = useState('');
    const [newImage, setNewImage] = useState<File | null>(null);
    const [newImagePreview, setNewImagePreview] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const newFileInputRef = useRef<HTMLInputElement>(null);

    const [editingBrand, setEditingBrand] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editNameAr, setEditNameAr] = useState('');
    const [editImage, setEditImage] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string>('');
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const resetNewForm = () => {
        setNewName(''); setNewNameAr(''); setNewImage(null); setNewImagePreview('');
    };

    useEffect(() => {
        if (!isOpen) {
            resetNewForm();
            setEditingBrand(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleImageChange = (file: File, isEdit: boolean) => {
        if (file.size > 2 * 1024 * 1024) {
            toast.error(isRTL ? 'حجم الصورة يجب أن لا يتجاوز 2 ميجابايت' : 'Image size must not exceed 2MB');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (isEdit) {
                setEditImage(file);
                setEditImagePreview(reader.result as string);
            } else {
                setNewImage(file);
                setNewImagePreview(reader.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const addBrand = async () => {
        if (!newName && !newNameAr) return;
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', newName || newNameAr);
            formData.append('name_ar', newNameAr || newName);
            if (newImage) formData.append('image', newImage);

            const res = await inventoryApi.createBrand(formData);
            toast.success(isRTL ? 'تم إضافة الماركة بنجاح' : 'Brand added successfully');
            queryClient.invalidateQueries({ queryKey: ['brands'] });
            resetNewForm();
            if (onSuccess && res.data?.data) {
                onSuccess(res.data.data);
            }
        } catch (error) {
            toast.error(isRTL ? 'حدث خطأ أثناء إضافة الماركة' : 'Error adding brand');
        } finally {
            setIsSaving(false);
        }
    };

    const startEdit = (brand: Brand) => {
        setEditingBrand(brand.id);
        setEditName(brand.name || '');
        setEditNameAr(brand.name_ar || '');
        setEditImage(null);
        setEditImagePreview(brand.image_url ? (toRelativeImageUrl(brand.image_url) ?? '') : '');
    };

    const saveEdit = async () => {
        if (!editingBrand) return;
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', editName);
            formData.append('name_ar', editNameAr);
            if (editImage) formData.append('image', editImage);

            await inventoryApi.updateBrand(editingBrand, formData);
            toast.success(isRTL ? 'تم التحديث بنجاح' : 'Updated successfully');
            queryClient.invalidateQueries({ queryKey: ['brands'] });
            setEditingBrand(null);
        } catch (error) {
            toast.error(isRTL ? 'حدث خطأ أثناء التحديث' : 'Error updating brand');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteBrand = async (id: string) => {
        if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذه الماركة؟' : 'Are you sure you want to delete this brand?')) return;
        try {
            await inventoryApi.deleteBrand(id);
            toast.success(isRTL ? 'تم الحذف بنجاح' : 'Deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['brands'] });
        } catch (error) {
            toast.error(isRTL ? 'فشل الحذف، قد تكون الماركة مستخدمة' : 'Deletion failed, brand might be in use');
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-2xl">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🏷️</span>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                            {isRTL ? 'إدارة الماركات' : 'Manage Brands'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5">
                    {/* Add new brand form */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border mb-6" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="flex gap-2 items-center">
                            <label className={`relative w-10 h-10 rounded-lg border flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 transition-colors ${newImagePreview ? 'border-primary-500' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'}`} style={{ background: 'var(--bg-input)' }}>
                                {newImagePreview ? <img src={newImagePreview} alt="img" className="w-full h-full object-contain" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                                <input ref={newFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0], false)} />
                                {newImagePreview && (
                                    <button type="button" onClick={(e) => { e.preventDefault(); setNewImage(null); setNewImagePreview(''); newFileInputRef.current!.value = ''; }} className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">✕</button>
                                )}
                            </label>
                            
                            <div className="flex-1 flex gap-2">
                                <input className="input-field py-2.5 text-sm flex-1" placeholder={isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'} value={newNameAr} onChange={e => setNewNameAr(e.target.value)} />
                                <input className="input-field py-2.5 text-sm flex-1" placeholder={isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'} value={newName} onChange={e => setNewName(e.target.value)} />
                                <button onClick={addBrand} disabled={isSaving || (!newName && !newNameAr)} className="btn-primary text-xs px-4 whitespace-nowrap disabled:opacity-50">
                                    + {isRTL ? 'إضافة' : 'Add'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Brands list */}
                    {isLoading ? (
                        <div className="text-center py-4 text-gray-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {brands.map(brand => (
                                <div key={brand.id} className="glass-card p-3 flex items-center justify-between group transition-all hover:border-primary-200">
                                    {editingBrand === brand.id ? (
                                        <div className="flex gap-2 items-center flex-1">
                                            <label className="relative w-10 h-10 rounded-lg border flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-input)' }}>
                                                {editImagePreview ? <img src={editImagePreview} alt="img" className="w-full h-full object-contain" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                                                <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0], true)} />
                                            </label>
                                            <div className="flex-1 flex gap-2">
                                                <input className="input-field py-2 text-sm flex-1" placeholder={isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'} value={editNameAr} onChange={e => setEditNameAr(e.target.value)} />
                                                <input className="input-field py-2 text-sm flex-1" placeholder={isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'} value={editName} onChange={e => setEditName(e.target.value)} />
                                                <button onClick={saveEdit} disabled={isSaving || (!editName && !editNameAr)} className="text-emerald-500 hover:text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg font-bold">✅</button>
                                                <button onClick={() => setEditingBrand(null)} className="text-gray-500 bg-gray-100 dark:bg-slate-700 p-2 rounded-lg font-bold">✕</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex gap-3 items-center flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                                                    {brand.image_url
                                                        ? <img
                                                            src={toRelativeImageUrl(brand.image_url)}
                                                            alt=""
                                                            className="w-full h-full object-contain bg-white"
                                                            onError={e => {
                                                                const t = e.currentTarget;
                                                                t.style.display = 'none';
                                                                const fb = t.nextElementSibling as HTMLElement | null;
                                                                if (fb) fb.style.display = 'flex';
                                                            }}
                                                          />
                                                        : null}
                                                    <span
                                                        className="text-gray-400 font-bold w-full h-full items-center justify-center"
                                                        style={{ display: brand.image_url ? 'none' : 'flex' }}
                                                    >
                                                        {brand.name.substring(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{isRTL ? (brand.name_ar || brand.name) : brand.name}</div>
                                                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{isRTL ? brand.name : brand.name_ar}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEdit(brand)} className="btn-icon w-8 h-8 flex items-center justify-center bg-gray-50 text-blue-500">✏️</button>
                                                <button onClick={() => deleteBrand(brand.id)} className="btn-icon w-8 h-8 flex items-center justify-center bg-red-50 text-red-500">🗑️</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
