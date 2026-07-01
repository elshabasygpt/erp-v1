'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { purchaseReturnsApi, purchasesApi, inventoryApi, suppliersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { useRegionalSettings } from '@/providers/RegionalSettingsProvider';

export default function NewPurchaseReturnPage() {
    const router = useRouter();
    const { isRTL } = useLanguage();
    const { taxRate } = useRegionalSettings();

    const { data: invoicesRes } = useQuery({ queryKey: ['purchase_invoices', 'confirmed'], queryFn: () => purchasesApi.getInvoices({ status: 'confirmed' }) });
    const { data: warehousesRes } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryApi.getWarehouses() });
    const { data: suppliersRes } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersApi.getSuppliers() });
    const { data: productsRes } = useQuery({ queryKey: ['products'], queryFn: () => inventoryApi.getProducts({ per_page: 1000 }) });

    const purchaseInvoices = invoicesRes?.data?.data?.data || invoicesRes?.data?.data || [];
    const warehouses = warehousesRes?.data?.data || [];
    const suppliers = suppliersRes?.data?.data?.data || suppliersRes?.data?.data || [];
    const products = productsRes?.data?.data?.data || productsRes?.data?.data || [];

    const [purchaseInvoiceId, setPurchaseInvoiceId] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('defective');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<any[]>([]);

    const createMutation = useMutation({
        mutationFn: (data: any) => purchaseReturnsApi.createReturn(data),
        onSuccess: () => {
            toast.success(isRTL ? 'تم إنشاء المرتجع بنجاح' : 'Purchase Return created successfully');
            router.push(`/dashboard/returns`);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || (isRTL ? 'فشل إنشاء المرتجع' : 'Failed to create purchase return'));
        }
    });

    const handleAddItem = () => {
        setItems([...items, { product_id: '', quantity: 1, unit_price: 0, tax_rate: taxRate }]);
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
        if (!warehouseId || !supplierId || !issueDate || items.length === 0) {
            toast.error(isRTL ? 'الرجاء تعبئة جميع الحقول وإضافة منتج واحد على الأقل' : 'Please fill all required fields and add at least one item');
            return;
        }

        const formattedItems = items.map(item => ({
            product_id: item.product_id,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            tax_rate: Number(item.tax_rate) || 0,
        }));

        createMutation.mutate({
            supplier_id: supplierId,
            warehouse_id: warehouseId,
            purchase_invoice_id: purchaseInvoiceId || undefined,
            issue_date: issueDate,
            status: 'completed',
            notes: reason ? `[${reason}] ${notes}`.trim() : notes,
            items: formattedItems
        });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2"/> {isRTL ? 'رجوع' : 'Back'}</Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isRTL ? 'مرتجع مشتريات جديد' : 'New Purchase Return'}</h1>
                    <p className="text-muted-foreground">{isRTL ? 'إرجاع بضاعة إلى المورد' : 'Return goods to supplier'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'المورد' : 'Supplier'}</label>
                            <select className="w-full border rounded-md p-2 text-sm" value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                                <option value="">{isRTL ? 'اختر المورد...' : 'Select Supplier...'}</option>
                                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'فاتورة الشراء (اختياري)' : 'Purchase Invoice (Optional)'}</label>
                            <select className="w-full border rounded-md p-2 text-sm" value={purchaseInvoiceId} onChange={e => setPurchaseInvoiceId(e.target.value)}>
                                <option value="">{isRTL ? 'بدون فاتورة محددة' : 'No specific invoice'}</option>
                                {purchaseInvoices.map((inv: any) => <option key={inv.id} value={inv.id}>{inv.invoice_number} - {inv.total}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'المستودع (الاسترجاع من)' : 'Warehouse (Return from)'}</label>
                            <select className="w-full border rounded-md p-2 text-sm" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required>
                                <option value="">{isRTL ? 'اختر المستودع...' : 'Select Warehouse...'}</option>
                                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'تاريخ المرتجع' : 'Return Date'}</label>
                            <input type="date" className="w-full border rounded-md p-2 text-sm" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'السبب' : 'Reason'}</label>
                            <select className="w-full border rounded-md p-2 text-sm" value={reason} onChange={e => setReason(e.target.value)} required>
                                <option value="defective">{isRTL ? 'تالف / عيب مصنعي' : 'Defective'}</option>
                                <option value="wrong_item">{isRTL ? 'صنف خاطئ' : 'Wrong Item'}</option>
                                <option value="overstock">{isRTL ? 'فائض عن الحاجة' : 'Overstock'}</option>
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
                                        <th className="text-left pb-2 w-2/5">{isRTL ? 'المنتج' : 'Product'}</th>
                                        <th className="text-right pb-2">{isRTL ? 'الكمية' : 'Qty'}</th>
                                        <th className="text-right pb-2">{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
                                        <th className="text-right pb-2">{isRTL ? 'الضريبة %' : 'Tax %'}</th>
                                        <th className="text-right pb-2">{isRTL ? 'الإجمالي' : 'Total'}</th>
                                        <th className="pb-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index} className="border-b">
                                            <td className="py-2">
                                                <select className="w-full border rounded-md p-2 text-sm" value={item.product_id} onChange={e => handleItemChange(index, 'product_id', e.target.value)} required>
                                                    <option value="">{isRTL ? 'اختر المنتج...' : 'Select Product...'}</option>
                                                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.sku || p.part_number} - {p.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="py-2 pl-2">
                                                <input type="number" min="0.01" step="0.01" className="w-full border rounded-md p-2 text-sm text-right" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} required />
                                            </td>
                                            <td className="py-2 pl-2">
                                                <input type="number" min="0" step="0.01" className="w-full border rounded-md p-2 text-sm text-right" value={item.unit_price} onChange={e => handleItemChange(index, 'unit_price', e.target.value)} required />
                                            </td>
                                            <td className="py-2 pl-2">
                                                <input type="number" min="0" max="100" step="0.01" className="w-full border rounded-md p-2 text-sm text-right" value={item.tax_rate} onChange={e => handleItemChange(index, 'tax_rate', e.target.value)} required />
                                            </td>
                                            <td className="py-2 pl-2 text-right font-medium">
                                                {(((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)) * (1 + (Number(item.tax_rate) || 0) / 100)).toFixed(2)}
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
