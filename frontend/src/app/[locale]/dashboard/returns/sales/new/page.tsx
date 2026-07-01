'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { salesReturnsApi, salesApi, inventoryApi, customersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/i18n/LanguageContext';

export default function NewSalesReturnPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isRTL } = useLanguage();

    const preselectedInvoiceId = searchParams.get('invoice_id') ?? '';

    // Fetch confirmed invoices only — 'paid' is not a valid status value
    const { data: invoicesRes } = useQuery({ queryKey: ['invoices-confirmed'], queryFn: () => salesApi.getInvoices({ status: 'confirmed', limit: 200 }) });
    const { data: warehousesRes } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryApi.getWarehouses() });
    const { data: customersRes } = useQuery({ queryKey: ['customers'], queryFn: () => customersApi.getCustomers() });
    const { data: productsRes } = useQuery({ queryKey: ['products'], queryFn: () => inventoryApi.getProducts({ per_page: 1000 }) });

    const invoices = invoicesRes?.data?.data?.data || invoicesRes?.data?.data || [];
    const warehouses = warehousesRes?.data?.data || [];
    const customers = customersRes?.data?.data?.data || customersRes?.data?.data || [];
    const products = productsRes?.data?.data?.data || [];

    const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId);
    const [warehouseId, setWarehouseId] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [returnType, setReturnType] = useState('partial');

    // When invoices load, auto-fill customer from the pre-selected invoice
    useEffect(() => {
        if (!preselectedInvoiceId || !invoices.length) return;
        const inv = invoices.find((i: any) => i.id === preselectedInvoiceId);
        if (inv?.customer_id) setCustomerId(inv.customer_id);
    }, [invoices, preselectedInvoiceId]);
    const [refundMethod, setRefundMethod] = useState('cash');
    const [reason, setReason] = useState('defective');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<any[]>([]);

    const createMutation = useMutation({
        mutationFn: (data: any) => salesReturnsApi.createSalesReturn(data),
        onSuccess: () => {
            toast.success(isRTL ? 'تم إنشاء المرتجع بنجاح' : 'Sales Return created successfully');
            router.push(`/dashboard/returns`);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || (isRTL ? 'فشل إنشاء المرتجع' : 'Failed to create sales return'));
        }
    });

    const handleAddItem = () => {
        setItems([...items, { product_id: '', quantity: 1, condition: 'good' }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoiceId || !warehouseId || !customerId || items.length === 0) {
            toast.error(isRTL ? 'الرجاء تعبئة جميع الحقول وإضافة منتج واحد على الأقل' : 'Please fill all required fields and add at least one item');
            return;
        }

        const formattedItems = items.map(item => ({
            product_id: item.product_id,
            quantity: Number(item.quantity),
            condition: item.condition
        }));

        createMutation.mutate({
            invoice_id: invoiceId,
            warehouse_id: warehouseId,
            customer_id: customerId,
            return_type: returnType,
            refund_method: refundMethod,
            reason,
            notes,
            items: formattedItems
        });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2"/> {isRTL ? 'رجوع' : 'Back'}</Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isRTL ? 'مرتجع مبيعات جديد' : 'New Sales Return'}</h1>
                    <p className="text-muted-foreground">{isRTL ? 'إرجاع منتجات مباعة لعميل' : 'Return sold products from a customer'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'العميل' : 'Customer'}</label>
                            <select className="w-full border rounded-md p-2 text-sm" value={customerId} onChange={e => setCustomerId(e.target.value)} required>
                                <option value="">{isRTL ? 'اختر العميل...' : 'Select Customer...'}</option>
                                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'الفاتورة' : 'Invoice'}</label>
                            <select className="w-full border rounded-md p-2 text-sm" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} required>
                                <option value="">{isRTL ? 'اختر الفاتورة...' : 'Select Invoice...'}</option>
                                {invoices.map((inv: any) => <option key={inv.id} value={inv.id}>{inv.invoice_number} - {inv.total_amount}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'المستودع (الاسترجاع إلى)' : 'Warehouse (Return to)'}</label>
                            <select className="w-full border rounded-md p-2 text-sm" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required>
                                <option value="">{isRTL ? 'اختر المستودع...' : 'Select Warehouse...'}</option>
                                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'نوع المرتجع' : 'Return Type'}</label>
                            <select className="w-full border rounded-md p-2 text-sm" value={returnType} onChange={e => setReturnType(e.target.value)} required>
                                <option value="partial">{isRTL ? 'جزئي' : 'Partial'}</option>
                                <option value="full">{isRTL ? 'كامل' : 'Full'}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'طريقة الاسترداد' : 'Refund Method'}</label>
                            <select className="w-full border rounded-md p-2 text-sm" value={refundMethod} onChange={e => setRefundMethod(e.target.value)} required>
                                <option value="cash">{isRTL ? 'نقدي' : 'Cash'}</option>
                                <option value="bank_transfer">{isRTL ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                                <option value="card">{isRTL ? 'بطاقة' : 'Card'}</option>
                                <option value="store_credit">{isRTL ? 'رصيد دائن' : 'Store Credit'}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'السبب' : 'Reason'}</label>
                            <select className="w-full border rounded-md p-2 text-sm" value={reason} onChange={e => setReason(e.target.value)} required>
                                <option value="defective">{isRTL ? 'تالف / عيب مصنعي' : 'Defective'}</option>
                                <option value="wrong_item">{isRTL ? 'صنف خاطئ' : 'Wrong Item'}</option>
                                <option value="customer_request">{isRTL ? 'طلب العميل' : 'Customer Request'}</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium text-lg">{isRTL ? 'المنتجات المسترجعة' : 'Returned Items'}</h3>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                                <Plus className="w-4 h-4 mr-2" /> {isRTL ? 'إضافة منتج' : 'Add Item'}
                            </Button>
                        </div>
                        
                        {items.length === 0 ? (
                            <div className="text-center p-8 bg-gray-50 border border-dashed rounded-md text-gray-500">
                                {isRTL ? 'لم تتم إضافة منتجات بعد.' : 'No items added yet.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto"><table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left pb-2 w-1/2">{isRTL ? 'المنتج' : 'Product'}</th>
                                        <th className="text-right pb-2">{isRTL ? 'الكمية' : 'Qty'}</th>
                                        <th className="text-right pb-2">{isRTL ? 'الحالة' : 'Condition'}</th>
                                        <th className="pb-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index} className="border-b">
                                            <td className="py-2">
                                                <select className="w-full border rounded-md p-2 text-sm" value={item.product_id} onChange={e => handleItemChange(index, 'product_id', e.target.value)} required>
                                                    <option value="">{isRTL ? 'اختر المنتج...' : 'Select Product...'}</option>
                                                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.part_number} - {p.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="py-2 pl-2">
                                                <input type="number" min="1" step="0.01" className="w-full border rounded-md p-2 text-sm text-right" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} required />
                                            </td>
                                            <td className="py-2 pl-2">
                                                <select className="w-full border rounded-md p-2 text-sm" value={item.condition} onChange={e => handleItemChange(index, 'condition', e.target.value)} required>
                                                    <option value="good">{isRTL ? 'سليم' : 'Good / Resellable'}</option>
                                                    <option value="damaged">{isRTL ? 'تالف' : 'Damaged'}</option>
                                                </select>
                                            </td>
                                            <td className="py-2 pl-2 text-right">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                        <textarea className="w-full border rounded-md p-2 text-sm" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.back()}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    <Button type="submit" disabled={createMutation.isPending || items.length === 0}>
                        {createMutation.isPending ? '...' : (isRTL ? 'تأكيد الاسترجاع' : 'Confirm Return')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
