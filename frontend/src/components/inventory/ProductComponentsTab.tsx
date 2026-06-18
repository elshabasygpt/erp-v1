import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api';
import type { Product } from './hooks/useInventoryData';
import toast from 'react-hot-toast';

interface ProductComponentsTabProps {
    productId: string;
    isRTL: boolean;
}

export function ProductComponentsTab({ productId, isRTL }: ProductComponentsTabProps) {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [components, setComponents] = useState<any[]>([]);

    const { data: bomData, isLoading } = useQuery({
        queryKey: ['product_components', productId],
        queryFn: async () => {
            const res = await inventoryApi.getAssemblies(productId); // Assuming getAssemblies is in inventoryApi, let's just use fetch if not.
            return res.data?.data || [];
        }
    });

    const { data: searchResults = [] } = useQuery({
        queryKey: ['product_search', searchQuery],
        queryFn: async () => {
            if (!searchQuery) return [];
            const res = await inventoryApi.searchProducts(searchQuery);
            return res.data?.data || [];
        },
        enabled: searchQuery.length > 1
    });

    useEffect(() => {
        if (bomData) {
            setComponents(bomData);
        }
    }, [bomData]);

    const saveMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await inventoryApi.saveAssemblies(productId, { components: payload });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product_components', productId] });
            toast.success(isRTL ? 'تم حفظ الطقم بنجاح' : 'Kit components saved successfully');
        }
    });

    const handleSave = () => {
        const payload = components.map(c => ({
            child_product_id: c.child_product_id || c.component?.id || c.id, // Support both fetched and newly added
            quantity_required: parseFloat(c.quantity_required) || 1
        }));
        saveMutation.mutate(payload);
    };

    const addComponent = (prod: any) => {
        if (prod.id === productId) return;
        if (components.find(c => (c.child_product_id || c.component?.id || c.id) === prod.id)) return;
        setComponents([...components, { ...prod, quantity_required: 1 }]);
        setSearchQuery('');
    };

    const removeComponent = (idx: number) => {
        setComponents(components.filter((_, i) => i !== idx));
    };

    const updateQty = (idx: number, qty: number) => {
        const updated = [...components];
        updated[idx].quantity_required = qty;
        setComponents(updated);
    };

    if (isLoading) return <div className="p-4 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {isRTL ? 'مكونات الطقم / التجميعة' : 'Kit / Assembly Components'}
                </h3>
            </div>

            <div className="relative">
                <input
                    type="text"
                    className="input-field w-full"
                    placeholder={isRTL ? 'ابحث عن منتج لإضافته للطقم...' : 'Search for a product to add...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery.length > 1 && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
                        {searchResults.map((prod: any) => (
                            <div 
                                key={prod.id} 
                                className="p-3 border-b hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                style={{ borderColor: 'var(--border-default)' }}
                                onClick={() => addComponent(prod)}
                            >
                                <div>
                                    <p className="text-sm font-bold">{isRTL ? prod.name_ar || prod.name : prod.name}</p>
                                    <p className="text-xs text-gray-500">{prod.sku} | {prod.brand}</p>
                                </div>
                                <button className="btn-primary text-xs px-2 py-1">
                                    {isRTL ? 'إضافة' : 'Add'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-3 mt-4">
                {components.length === 0 ? (
                    <div className="text-center p-6 border border-dashed rounded-lg" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                        {isRTL ? 'لا توجد مكونات في هذا الطقم.' : 'No components added to this kit yet.'}
                    </div>
                ) : (
                    components.map((comp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-secondary)' }}>
                            <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {isRTL ? (comp.component?.name_ar || comp.name_ar || comp.name) : (comp.component?.name || comp.name)}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    {isRTL ? 'الكمية المطلوبة:' : 'Qty Required:'}
                                </label>
                                <input
                                    type="number"
                                    min="0.001"
                                    step="1"
                                    className="input-field w-20 py-1"
                                    value={comp.quantity_required}
                                    onChange={(e) => updateQty(idx, parseFloat(e.target.value) || 0)}
                                />
                                <button 
                                    className="text-red-500 hover:text-red-700 p-2"
                                    onClick={() => removeComponent(idx)}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
                <button 
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                >
                    {saveMutation.isPending ? '...' : (isRTL ? 'حفظ مكونات الطقم' : 'Save Components')}
                </button>
            </div>
        </div>
    );
}
