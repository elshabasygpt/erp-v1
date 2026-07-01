'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { coreReturnsApi, suppliersApi, inventoryApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function NewCoreReturnPage() {
    const router = useRouter();

    const { data: suppliersRes } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersApi.getSuppliers() });
    const { data: warehousesRes } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryApi.getWarehouses() });
    const { data: productsRes } = useQuery({ queryKey: ['products'], queryFn: () => inventoryApi.getProducts({ per_page: 1000 }) });

    const suppliers = suppliersRes?.data?.data?.data || [];
    const warehouses = warehousesRes?.data?.data || [];
    const products = productsRes?.data?.data?.data || [];

    const [supplierId, setSupplierId] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<any[]>([]);

    const createMutation = useMutation({
        mutationFn: (data: any) => coreReturnsApi.createCoreReturn(data),
        onSuccess: (res) => {
            toast.success('Core Return created successfully');
            router.push(`/dashboard/purchases/core-returns/${res.data.data.id}`);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to create core return');
        }
    });

    const handleAddItem = () => {
        setItems([...items, { product_id: '', quantity: 1, core_value: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;
        
        // Auto-fill core_value if product is selected
        if (field === 'product_id') {
            const product = products.find((p: any) => p.id === value);
            if (product && product.has_core_charge) {
                newItems[index].core_value = product.core_charge_amount || 0;
            }
        }
        
        setItems(newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId || !warehouseId || items.length === 0) {
            toast.error('Please select supplier, warehouse, and add at least one item');
            return;
        }

        const formattedItems = items.map(item => ({
            product_id: item.product_id,
            quantity: Number(item.quantity),
            core_value: Number(item.core_value)
        }));

        createMutation.mutate({
            supplier_id: supplierId,
            warehouse_id: warehouseId,
            notes,
            items: formattedItems
        });
    };

    const totalValue = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.core_value) || 0), 0);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2"/> Back</Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">New Core Return Batch</h1>
                    <p className="text-muted-foreground">Select a supplier and add damaged cores to return for credit.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Supplier</label>
                            <select 
                                className="w-full border rounded-md p-2 text-sm"
                                value={supplierId}
                                onChange={e => setSupplierId(e.target.value)}
                                required
                            >
                                <option value="">Select Supplier...</option>
                                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Warehouse (Return From)</label>
                            <select 
                                className="w-full border rounded-md p-2 text-sm"
                                value={warehouseId}
                                onChange={e => setWarehouseId(e.target.value)}
                                required
                            >
                                <option value="">Select Warehouse...</option>
                                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium text-lg">Cores to Return</h3>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                                <Plus className="w-4 h-4 mr-2" /> Add Part
                            </Button>
                        </div>
                        
                        {items.length === 0 ? (
                            <div className="text-center p-8 bg-gray-50 border border-dashed rounded-md text-gray-500">
                                No items added yet. Click "Add Part" to begin.
                            </div>
                        ) : (
                            <div className="overflow-x-auto"><table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left pb-2 w-1/2">Product / Part</th>
                                        <th className="text-right pb-2">Core Quantity</th>
                                        <th className="text-right pb-2">Expected Core Value</th>
                                        <th className="text-right pb-2">Total</th>
                                        <th className="pb-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index} className="border-b">
                                            <td className="py-2">
                                                <select 
                                                    className="w-full border rounded-md p-2 text-sm"
                                                    value={item.product_id}
                                                    onChange={e => handleItemChange(index, 'product_id', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select Part...</option>
                                                    {products.filter((p: any) => p.has_core_charge).map((p: any) => (
                                                        <option key={p.id} value={p.id}>{p.part_number} - {p.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-2 pl-2">
                                                <input 
                                                    type="number" min="1" step="0.01"
                                                    className="w-full border rounded-md p-2 text-sm text-right"
                                                    value={item.quantity}
                                                    onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                    required
                                                />
                                            </td>
                                            <td className="py-2 pl-2">
                                                <input 
                                                    type="number" min="0" step="0.01"
                                                    className="w-full border rounded-md p-2 text-sm text-right"
                                                    value={item.core_value}
                                                    onChange={e => handleItemChange(index, 'core_value', e.target.value)}
                                                    required
                                                />
                                            </td>
                                            <td className="py-2 pl-2 text-right font-medium text-gray-700">
                                                {(Number(item.quantity) * Number(item.core_value) || 0).toFixed(2)}
                                            </td>
                                            <td className="py-2 pl-2 text-right">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="text-right py-4 font-medium text-gray-500">Total Expected Credit:</td>
                                        <td className="text-right py-4 font-bold text-green-600 text-lg">{totalValue.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table></div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea 
                            className="w-full border rounded-md p-2 text-sm"
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending || items.length === 0}>
                        {createMutation.isPending ? 'Creating...' : 'Create Draft Return'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
