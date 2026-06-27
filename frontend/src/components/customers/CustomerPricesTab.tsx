'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { crmApi, productsApi } from '@/lib/api';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface CustomerPrice {
    id: string;
    product_id: string;
    price: number;
    valid_from: string | null;
    valid_until: string | null;
    notes: string | null;
    product?: { id: string; name: string; sku: string };
}

interface PriceForm {
    product_id: string;
    product_name: string;
    price: string;
    valid_from: string;
    valid_until: string;
    notes: string;
}

const emptyForm: PriceForm = {
    product_id: '',
    product_name: '',
    price: '',
    valid_from: '',
    valid_until: '',
    notes: '',
};

interface Props {
    customerId: string;
    locale: string;
}

export default function CustomerPricesTab({ customerId, locale }: Props) {
    const isRTL = locale === 'ar';
    const [prices, setPrices] = useState<CustomerPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPrice, setEditingPrice] = useState<CustomerPrice | null>(null);
    const [form, setForm] = useState<PriceForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Product search state
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [searchingProducts, setSearchingProducts] = useState(false);
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadPrices = useCallback(() => {
        setLoading(true);
        crmApi.getCustomerPrices(customerId)
            .then(res => setPrices(res.data?.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [customerId]);

    useEffect(() => {
        loadPrices();
    }, [loadPrices]);

    // Product search with debounce
    useEffect(() => {
        if (productSearch.length < 2) {
            setProductResults([]);
            setShowProductDropdown(false);
            return;
        }
        const timer = setTimeout(async () => {
            setSearchingProducts(true);
            try {
                const res = await productsApi.getProducts({ search: productSearch, limit: 8 });
                const list = res.data?.data?.data || res.data?.data || [];
                setProductResults(list);
                setShowProductDropdown(true);
            } catch {
                setProductResults([]);
            } finally {
                setSearchingProducts(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearch]);

    const selectProduct = (product: any) => {
        setForm(f => ({ ...f, product_id: product.id, product_name: product.name || product.name_ar || '' }));
        setProductSearch(product.name || product.name_ar || '');
        setShowProductDropdown(false);
    };

    const openAdd = () => {
        setEditingPrice(null);
        setForm(emptyForm);
        setProductSearch('');
        setShowModal(true);
    };

    const openEdit = (price: CustomerPrice) => {
        setEditingPrice(price);
        const name = price.product?.name || '';
        setForm({
            product_id: price.product_id,
            product_name: name,
            price: String(price.price),
            valid_from: price.valid_from || '',
            valid_until: price.valid_until || '',
            notes: price.notes || '',
        });
        setProductSearch(name);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.product_id || !form.price || Number(form.price) <= 0) return;
        setSaving(true);
        try {
            await crmApi.upsertCustomerPrice(customerId, {
                product_id: form.product_id,
                price: Number(form.price),
                valid_from: form.valid_from || null,
                valid_until: form.valid_until || null,
                notes: form.notes || undefined,
            });
            showToast(isRTL ? 'تم حفظ السعر الخاص بنجاح ✓' : 'Custom price saved ✓');
            setShowModal(false);
            loadPrices();
        } catch (err: any) {
            showToast(err?.response?.data?.message || (isRTL ? 'فشل الحفظ' : 'Save failed'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(isRTL ? 'هل تريد حذف هذا السعر الخاص؟' : 'Delete this custom price?')) return;
        setDeletingId(id);
        try {
            await crmApi.deleteCustomerPrice(customerId, id);
            showToast(isRTL ? 'تم الحذف' : 'Deleted');
            loadPrices();
        } catch {
            showToast(isRTL ? 'فشل الحذف' : 'Delete failed', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const isExpired = (price: CustomerPrice) => {
        if (!price.valid_until) return false;
        return new Date(price.valid_until) < new Date();
    };

    const isNotYetActive = (price: CustomerPrice) => {
        if (!price.valid_from) return false;
        return new Date(price.valid_from) > new Date();
    };

    const formatDate = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const { format: formatPrice } = useCurrencyFormatter();

    return (
        <div className="p-5 space-y-4 relative">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-[300] px-4 py-3 rounded-xl shadow-xl text-white text-sm font-bold flex items-center gap-2 animate-scale-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span>🏷️</span>
                    {isRTL ? 'الأسعار الخاصة بالعميل' : 'Customer-Specific Prices'}
                    <span className="text-xs px-2 py-0.5 rounded-full font-normal" style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' }}>
                        {prices.length}
                    </span>
                </h3>
                <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    {isRTL ? 'إضافة سعر' : 'Add Price'}
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="py-8 text-center">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                </div>
            ) : prices.length === 0 ? (
                <div className="py-10 text-center">
                    <span className="text-4xl block mb-3">🏷️</span>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'لا توجد أسعار خاصة' : 'No custom prices yet'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'أضف سعرًا خاصًا لمنتج معين لهذا العميل' : 'Add a product-specific price for this customer'}
                    </p>
                    <button onClick={openAdd} className="btn-primary mt-4 text-xs py-2 px-4 mx-auto">
                        {isRTL ? '+ إضافة أول سعر خاص' : '+ Add First Custom Price'}
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="data-table text-sm w-full">
                        <thead>
                            <tr>
                                <th>{isRTL ? 'المنتج' : 'Product'}</th>
                                <th>{isRTL ? 'SKU' : 'SKU'}</th>
                                <th>{isRTL ? 'السعر الخاص' : 'Custom Price'}</th>
                                <th>{isRTL ? 'صالح من' : 'Valid From'}</th>
                                <th>{isRTL ? 'صالح حتى' : 'Valid Until'}</th>
                                <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                <th>{isRTL ? 'ملاحظات' : 'Notes'}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {prices.map(price => {
                                const expired = isExpired(price);
                                const notYet = isNotYetActive(price);
                                const active = !expired && !notYet;
                                return (
                                    <tr key={price.id}>
                                        <td>
                                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {price.product?.name || '—'}
                                            </p>
                                        </td>
                                        <td>
                                            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {price.product?.sku || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-bold text-primary-400">{formatPrice(price.price)}</span>
                                        </td>
                                        <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(price.valid_from)}</td>
                                        <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(price.valid_until)}</td>
                                        <td>
                                            {active ? (
                                                <span className="badge badge-success text-xs">
                                                    {isRTL ? 'نشط' : 'Active'}
                                                </span>
                                            ) : expired ? (
                                                <span className="badge badge-error text-xs">
                                                    {isRTL ? 'منتهي' : 'Expired'}
                                                </span>
                                            ) : (
                                                <span className="badge badge-warning text-xs">
                                                    {isRTL ? 'لم يبدأ' : 'Pending'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-xs max-w-[120px] truncate" style={{ color: 'var(--text-muted)' }} title={price.notes || ''}>
                                            {price.notes || '—'}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEdit(price)}
                                                    className="btn-icon text-xs"
                                                    style={{ color: 'var(--text-muted)' }}
                                                    title={isRTL ? 'تعديل' : 'Edit'}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(price.id)}
                                                    disabled={deletingId === price.id}
                                                    className="btn-icon text-xs hover:!text-red-400"
                                                    style={{ color: 'var(--text-muted)' }}
                                                    title={isRTL ? 'حذف' : 'Delete'}
                                                >
                                                    {deletingId === price.id ? (
                                                        <span className="w-4 h-4 border border-red-400 border-t-transparent rounded-full animate-spin inline-block" />
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{editingPrice ? '✏️' : '🏷️'}</span>
                                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {editingPrice
                                        ? (isRTL ? 'تعديل السعر الخاص' : 'Edit Custom Price')
                                        : (isRTL ? 'إضافة سعر خاص' : 'Add Custom Price')}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="btn-icon">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Product Search */}
                            <div className="relative">
                                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? 'المنتج *' : 'Product *'}
                                </label>
                                <div className="relative">
                                    <input
                                        className="input-field py-2 text-sm w-full"
                                        placeholder={isRTL ? 'ابحث عن منتج...' : 'Search product...'}
                                        value={productSearch}
                                        onChange={e => {
                                            setProductSearch(e.target.value);
                                            if (!e.target.value) setForm(f => ({ ...f, product_id: '', product_name: '' }));
                                        }}
                                        disabled={!!editingPrice}
                                    />
                                    {searchingProducts && (
                                        <span className="absolute end-3 top-1/2 -translate-y-1/2">
                                            <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin inline-block" />
                                        </span>
                                    )}
                                </div>
                                {showProductDropdown && productResults.length > 0 && (
                                    <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-surface-800 rounded-xl shadow-xl border max-h-48 overflow-y-auto" style={{ borderColor: 'var(--border-default)' }}>
                                        {productResults.map((p: any) => (
                                            <button
                                                key={p.id}
                                                onClick={() => selectProduct(p)}
                                                className="w-full text-start px-3 py-2.5 text-sm hover:bg-primary-500/10 transition-colors border-b last:border-0"
                                                style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                                            >
                                                <span className="font-medium">{p.name || p.name_ar}</span>
                                                {p.sku && <span className="ms-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.sku}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {form.product_id && (
                                    <p className="text-xs mt-1 text-emerald-500">✓ {isRTL ? 'تم اختيار المنتج' : 'Product selected'}</p>
                                )}
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? 'السعر الخاص (ر.س) *' : 'Custom Price (SAR) *'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="input-field py-2 text-sm w-full"
                                    placeholder="0.00"
                                    value={form.price}
                                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                    dir="ltr"
                                />
                            </div>

                            {/* Validity dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'صالح من' : 'Valid From'}
                                    </label>
                                    <input
                                        type="date"
                                        className="input-field py-2 text-sm w-full"
                                        value={form.valid_from}
                                        onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'صالح حتى' : 'Valid Until'}
                                    </label>
                                    <input
                                        type="date"
                                        className="input-field py-2 text-sm w-full"
                                        value={form.valid_until}
                                        onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? 'ملاحظات' : 'Notes'}
                                </label>
                                <textarea
                                    rows={2}
                                    className="input-field py-2 text-sm w-full resize-none"
                                    placeholder={isRTL ? 'سبب السعر الخاص...' : 'Reason for custom price...'}
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                            <button onClick={() => setShowModal(false)} className="btn-secondary">
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.product_id || !form.price || Number(form.price) <= 0}
                                className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/30 disabled:opacity-60"
                            >
                                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />}
                                {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ السعر' : 'Save Price')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
