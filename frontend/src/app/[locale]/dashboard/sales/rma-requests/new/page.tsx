'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { rmaApi, customersApi, salesApi, inventoryApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function NewRmaRequestPage() {
    const router = useRouter();

    const { data: categoriesRes } = useQuery({
        queryKey: ['rma-reason-categories'],
        queryFn: () => rmaApi.getReasonCategories(),
    });
    const { data: customersRes } = useQuery({ queryKey: ['customers'], queryFn: () => customersApi.getCustomers() });
    const { data: productsRes }  = useQuery({ queryKey: ['products-all'], queryFn: () => inventoryApi.getProducts({ per_page: 1000 }) });

    const reasonCategories: { value: string; label: string }[] = categoriesRes?.data?.data ?? [];
    const customers = customersRes?.data?.data?.data ?? [];
    const products  = productsRes?.data?.data?.data ?? [];

    const [form, setForm] = useState({
        customer_id:            '',
        invoice_id:             '',
        return_type:            'sales_return',
        reason_category:        '',
        reason_details:         '',
        expected_refund_value:  '',
        notes:                  '',
    });
    const [items, setItems] = useState<{ product_id: string; quantity: number; reason_note: string }[]>([]);

    // Lazy-load invoices when customer is selected
    const { data: invoicesRes } = useQuery({
        queryKey: ['customer-invoices', form.customer_id],
        queryFn: () => salesApi.getInvoices({ customer_id: form.customer_id, per_page: 50 }),
        enabled: !!form.customer_id,
    });
    const invoices = invoicesRes?.data?.data?.data ?? [];

    const createMutation = useMutation({
        mutationFn: (data: any) => rmaApi.create(data),
        onSuccess: (res) => {
            toast.success(`RMA ${res.data.data.rma_number} created successfully`);
            router.push(`/dashboard/sales/rma-requests/${res.data.data.id}`);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to create RMA request');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.customer_id || !form.reason_category || items.length === 0) {
            toast.error('Please fill all required fields and add at least one item');
            return;
        }
        createMutation.mutate({
            ...form,
            invoice_id:            form.invoice_id || undefined,
            expected_refund_value: form.expected_refund_value ? Number(form.expected_refund_value) : undefined,
            items,
        });
    };

    const addItem = () => setItems([...items, { product_id: '', quantity: 1, reason_note: '' }]);
    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const updateItem = (i: number, field: string, value: any) => {
        const updated = [...items];
        updated[i] = { ...updated[i], [field]: value };
        setItems(updated);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">New RMA Request</h1>
                    <p className="text-muted-foreground">Create a return authorization for a customer. Valid for 30 days once approved.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Info */}
                <div className="bg-white border rounded-xl p-6 shadow-sm space-y-5">
                    <h3 className="font-semibold text-base border-b pb-2">Return Information</h3>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium mb-1">Customer <span className="text-red-500">*</span></label>
                            <select
                                className="w-full border rounded-md p-2 text-sm"
                                value={form.customer_id}
                                onChange={e => setForm({ ...form, customer_id: e.target.value, invoice_id: '' })}
                                required
                            >
                                <option value="">Select Customer...</option>
                                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Invoice (Optional)</label>
                            <select
                                className="w-full border rounded-md p-2 text-sm"
                                value={form.invoice_id}
                                onChange={e => setForm({ ...form, invoice_id: e.target.value })}
                                disabled={!form.customer_id}
                            >
                                <option value="">Select Invoice...</option>
                                {invoices.map((inv: any) => (
                                    <option key={inv.id} value={inv.id}>
                                        {inv.invoice_number} — {new Date(inv.created_at).toLocaleDateString()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Return Type <span className="text-red-500">*</span></label>
                            <select
                                className="w-full border rounded-md p-2 text-sm"
                                value={form.return_type}
                                onChange={e => setForm({ ...form, return_type: e.target.value })}
                            >
                                <option value="sales_return">Sales Return</option>
                                <option value="core_return">Core Deposit Return</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Reason Category <span className="text-red-500">*</span></label>
                            <select
                                className="w-full border rounded-md p-2 text-sm"
                                value={form.reason_category}
                                onChange={e => setForm({ ...form, reason_category: e.target.value })}
                                required
                            >
                                <option value="">Select Reason...</option>
                                {reasonCategories.map((rc) => (
                                    <option key={rc.value} value={rc.value}>{rc.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Reason Details</label>
                        <textarea
                            className="w-full border rounded-md p-2 text-sm"
                            rows={2}
                            placeholder="Describe the issue in more detail..."
                            value={form.reason_details}
                            onChange={e => setForm({ ...form, reason_details: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium mb-1">Expected Refund Amount</label>
                            <input
                                type="number" min="0" step="0.01"
                                className="w-full border rounded-md p-2 text-sm"
                                placeholder="0.00"
                                value={form.expected_refund_value}
                                onChange={e => setForm({ ...form, expected_refund_value: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Internal Notes</label>
                            <input
                                type="text"
                                className="w-full border rounded-md p-2 text-sm"
                                placeholder="Optional notes..."
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-base">Items to Return <span className="text-red-500">*</span></h3>
                        <Button type="button" variant="outline" size="sm" onClick={addItem}>
                            <Plus className="w-4 h-4 mr-2" /> Add Item
                        </Button>
                    </div>

                    {items.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 border border-dashed rounded-md text-gray-500 text-sm">
                            No items added. Click "Add Item" to specify which products are being returned.
                        </div>
                    ) : (
                        <div className="overflow-x-auto"><table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-gray-500">
                                    <th className="text-left pb-2">Product</th>
                                    <th className="text-right pb-2 w-24">Qty</th>
                                    <th className="text-left pb-2 pl-2">Item Reason Note</th>
                                    <th className="pb-2 w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="py-2 pr-2">
                                            <select
                                                className="w-full border rounded-md p-2 text-sm"
                                                value={item.product_id}
                                                onChange={e => updateItem(i, 'product_id', e.target.value)}
                                                required
                                            >
                                                <option value="">Select Part...</option>
                                                {products.map((p: any) => (
                                                    <option key={p.id} value={p.id}>{p.part_number} — {p.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2 pl-2 w-24">
                                            <input
                                                type="number" min="0.01" step="0.01"
                                                className="w-full border rounded-md p-2 text-sm text-right"
                                                value={item.quantity}
                                                onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                                                required
                                            />
                                        </td>
                                        <td className="py-2 pl-2">
                                            <input
                                                type="text"
                                                className="w-full border rounded-md p-2 text-sm"
                                                placeholder="e.g. unit making noise..."
                                                value={item.reason_note}
                                                onChange={e => updateItem(i, 'reason_note', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 pl-2">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} className="text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending || items.length === 0}>
                        {createMutation.isPending ? 'Submitting...' : 'Submit RMA Request'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
