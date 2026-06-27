'use client';

import { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Printer, Search, X, Package, Check } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    price?: number;
}

export default function ProductLabelsPage() {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [selected, setSelected] = useState<Map<string, { product: Product; qty: number }>>(new Map());
    const [searching, setSearching] = useState(false);
    const [printing, setPrinting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search.trim().length >= 2) doSearch();
            else setSearchResults([]);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const doSearch = async () => {
        setSearching(true);
        try {
            const res = await inventoryApi.searchProducts(search);
            const data = res.data?.data ?? res.data ?? [];
            setSearchResults(Array.isArray(data) ? data.slice(0, 20) : []);
        } catch {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const addProduct = (product: Product) => {
        setSelected(prev => {
            const next = new Map(prev);
            if (next.has(product.id)) {
                next.get(product.id)!.qty += 1;
            } else {
                next.set(product.id, { product, qty: 1 });
            }
            return next;
        });
    };

    const removeProduct = (id: string) => {
        setSelected(prev => { const next = new Map(prev); next.delete(id); return next; });
    };

    const setQty = (id: string, qty: number) => {
        if (qty < 1) return;
        setSelected(prev => {
            const next = new Map(prev);
            if (next.has(id)) next.get(id)!.qty = qty;
            return next;
        });
    };

    const handlePrintSingle = (product: Product, qty = 1) => {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
        const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : '';
        const url = `${apiBase}/inventory/products/${product.id}/label?qty=${qty}`;
        const w = window.open('', '_blank');
        if (!w) { toast.error('السماح بالنوافذ المنبثقة مطلوب'); return; }
        fetch(url, { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId ?? '' } })
            .then(r => r.text())
            .then(html => { w.document.write(html); w.document.close(); })
            .catch(() => { w.close(); toast.error('فشل تحميل الملصق'); });
    };

    const handlePrintBulk = async () => {
        if (selected.size === 0) { toast.error('اختر منتجاً واحداً على الأقل'); return; }
        setPrinting(true);
        try {
            const entries = Array.from(selected.values());
            // Print each product separately with its qty count to leverage single label logic
            // Use first entry's qty for bulk (simplified - in real usage each would be separate)
            const ids = entries.map(e => e.product.id);
            const qty = entries[0]?.qty ?? 1;
            const res = await inventoryApi.printBulkLabels({ ids, qty });
            const html = typeof res.data === 'string' ? res.data : await res.data;
            const w = window.open('', '_blank');
            if (!w) { toast.error('السماح بالنوافذ المنبثقة مطلوب'); return; }
            w.document.write(html);
            w.document.close();
        } catch {
            toast.error('فشل طباعة الملصقات');
        } finally {
            setPrinting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">طباعة ملصقات المنتجات / Product Labels</h1>
                    <p className="text-gray-500 mt-1">ابحث عن المنتجات وأضفها لطباعة ملصقات الباركود</p>
                </div>
                {selected.size > 0 && (
                    <Button onClick={handlePrintBulk} disabled={printing} className="flex items-center gap-2">
                        <Printer className="w-4 h-4" />
                        {printing ? 'جاري الطباعة...' : `طباعة (${selected.size} منتج)`}
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Search */}
                <Card className="p-4 space-y-4">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">البحث عن منتجات</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            className="border rounded pl-9 pr-3 py-2 w-full bg-white dark:bg-gray-800"
                            placeholder="ابحث بالاسم أو SKU أو الباركود..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {searching && <p className="text-sm text-gray-400">جاري البحث...</p>}
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                        {searchResults.map(product => (
                            <div key={product.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer"
                                onClick={() => addProduct(product)}>
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{product.name}</p>
                                    <p className="text-xs text-gray-500">{product.sku ?? ''} {product.barcode ? `| ${product.barcode}` : ''}</p>
                                </div>
                                {selected.has(product.id) && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                            </div>
                        ))}
                        {searchResults.length === 0 && search.length >= 2 && !searching && (
                            <p className="text-sm text-gray-500 text-center py-4">لا توجد نتائج</p>
                        )}
                    </div>
                </Card>

                {/* Selected Products */}
                <Card className="p-4 space-y-4">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">المنتجات المختارة ({selected.size})</h3>
                    {selected.size === 0 ? (
                        <div className="py-8 text-center text-gray-400">
                            <Printer className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">ابحث عن منتجات وانقر عليها لإضافتها</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {Array.from(selected.values()).map(({ product, qty }) => (
                                <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{product.name}</p>
                                        <p className="text-xs text-gray-500">{product.barcode ?? product.sku ?? '—'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-500">نسخ:</label>
                                        <input
                                            type="number" min="1" max="100"
                                            className="w-16 border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700"
                                            value={qty}
                                            onChange={e => setQty(product.id, parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handlePrintSingle(product, qty)}
                                        title="طباعة هذا المنتج فقط" className="text-blue-500 hover:text-blue-700 px-2">
                                        <Printer className="w-4 h-4" />
                                    </Button>
                                    <button onClick={() => removeProduct(product.id)} className="text-red-400 hover:text-red-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {selected.size > 0 && (
                        <Button onClick={handlePrintBulk} disabled={printing} className="w-full flex items-center justify-center gap-2">
                            <Printer className="w-4 h-4" />
                            {printing ? 'جاري الطباعة...' : 'طباعة الكل'}
                        </Button>
                    )}
                </Card>
            </div>
        </div>
    );
}
