'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { purchasesApi, suppliersApi, inventoryApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form
    const [supplierId, setSupplierId] = useState('');
    const [items, setItems] = useState<any[]>([{ product_id: '', quantity: 1, unit_price: 0, tax_rate: 15 }]);

    useEffect(() => {
        fetchOrders();
        suppliersApi.getSuppliers({ limit: 100 }).then((res: any) => setSuppliers(res.data?.data?.data || []));
        inventoryApi.getProducts({ limit: 100 }).then((res: any) => setProducts(res.data?.data?.data || []));
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await purchasesApi.getPurchaseOrders();
            setOrders(res.data?.data?.data || []);
        } catch (e) {
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await purchasesApi.createPurchaseOrder({
                supplier_id: supplierId,
                items: items.map(i => ({
                    product_id: i.product_id,
                    quantity: parseFloat(i.quantity),
                    unit_price: parseFloat(i.unit_price),
                    tax_rate: parseFloat(i.tax_rate)
                }))
            });
            toast.success('تم إنشاء أمر الشراء بنجاح');
            setShowForm(false);
            fetchOrders();
        } catch (e) {
            toast.error('فشل إنشاء أمر الشراء');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">أوامر الشراء (Purchase Orders)</h1>
                <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-600">{showForm ? 'إلغاء' : 'إنشاء أمر شراء جديد'}</Button>
            </div>

            {showForm && (
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">أمر شراء مباشر</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1">المورد</label>
                            <select className="w-full border p-2 rounded" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                                <option value="">-- اختر المورد --</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                            </select>
                        </div>
                        
                        <h3 className="font-bold mt-4">الأصناف</h3>
                        {items.map((item, idx) => (
                            <div key={idx} className="flex gap-4">
                                <select className="border p-2 rounded flex-1" value={item.product_id} onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].product_id = e.target.value;
                                    setItems(newItems);
                                }}>
                                    <option value="">-- اختر الصنف --</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
                                </select>
                                <input type="number" placeholder="الكمية" className="border p-2 rounded w-24" value={item.quantity} onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].quantity = e.target.value;
                                    setItems(newItems);
                                }} />
                                <input type="number" placeholder="السعر" className="border p-2 rounded w-24" value={item.unit_price} onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].unit_price = e.target.value;
                                    setItems(newItems);
                                }} />
                                <input type="number" placeholder="الضريبة %" className="border p-2 rounded w-24" value={item.tax_rate} onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].tax_rate = e.target.value;
                                    setItems(newItems);
                                }} />
                            </div>
                        ))}
                        <Button variant="outline" onClick={() => setItems([...items, { product_id: '', quantity: 1, unit_price: 0, tax_rate: 15 }])}>إضافة صنف آخر</Button>

                        <div className="flex justify-end pt-4">
                            <Button className="bg-indigo-600" onClick={handleCreate}>حفظ أمر الشراء</Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid gap-4">
                {orders.map(order => (
                    <Card key={order.id} className="p-4 flex justify-between items-center border-l-4 border-indigo-600">
                        <div>
                            <h3 className="font-bold text-lg">{order.po_number}</h3>
                            <p className="text-sm">المورد: {order.supplier?.name_ar || 'غير محدد'}</p>
                            <p className="text-sm">الإجمالي: {order.total} ريال</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                                {order.status === 'draft' ? 'مسودة' : order.status}
                            </span>
                            <Button variant="default" className="bg-green-600">تحويل إلى فاتورة مشتريات واستلام</Button>
                        </div>
                    </Card>
                ))}
                {orders.length === 0 && !loading && <p>لا توجد أوامر شراء</p>}
            </div>
        </div>
    );
}
