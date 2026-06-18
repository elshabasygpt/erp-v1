'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { purchasesApi, inventoryApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function PurchaseRequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [department, setDepartment] = useState('');
    const [items, setItems] = useState<any[]>([{ product_id: '', description: '', quantity: 1 }]);

    useEffect(() => {
        fetchRequests();
        inventoryApi.getProducts({ limit: 100 }).then(res => setProducts(res.data?.data?.data || []));
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await purchasesApi.getPurchaseRequests();
            setRequests(res.data?.data?.data || []);
        } catch (e) {
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await purchasesApi.createPurchaseRequest({
                department,
                items: items.map(i => ({
                    product_id: i.product_id || null,
                    description: i.description || 'N/A',
                    quantity: parseFloat(i.quantity)
                }))
            });
            toast.success('تم إنشاء طلب الشراء بنجاح');
            setShowForm(false);
            fetchRequests();
        } catch (e) {
            toast.error('فشل إنشاء الطلب');
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await purchasesApi.updatePurchaseRequestStatus(id, { status: 'approved' });
            toast.success('تمت الموافقة على الطلب');
            fetchRequests();
        } catch (e) {
            toast.error('حدث خطأ');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">طلبات الشراء (Purchase Requests)</h1>
                <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'إلغاء' : 'إضافة طلب جديد'}</Button>
            </div>

            {showForm && (
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">طلب شراء جديد</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1">القسم / الإدارة</label>
                            <input className="w-full border p-2 rounded" value={department} onChange={e => setDepartment(e.target.value)} />
                        </div>
                        
                        <h3 className="font-bold mt-4">الأصناف المطلوبة</h3>
                        {items.map((item, idx) => (
                            <div key={idx} className="flex gap-4">
                                <select className="border p-2 rounded flex-1" value={item.product_id} onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].product_id = e.target.value;
                                    setItems(newItems);
                                }}>
                                    <option value="">-- صنف جديد / غير موجود --</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
                                </select>
                                <input placeholder="وصف الصنف" className="border p-2 rounded flex-1" value={item.description} onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].description = e.target.value;
                                    setItems(newItems);
                                }} />
                                <input type="number" placeholder="الكمية" className="border p-2 rounded w-32" value={item.quantity} onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].quantity = e.target.value;
                                    setItems(newItems);
                                }} />
                            </div>
                        ))}
                        <Button variant="outline" onClick={() => setItems([...items, { product_id: '', description: '', quantity: 1 }])}>إضافة صنف آخر</Button>

                        <div className="flex justify-end pt-4">
                            <Button className="bg-indigo-600" onClick={handleCreate}>تقديم الطلب للإدارة</Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid gap-4">
                {requests.map(req => (
                    <Card key={req.id} className="p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{req.request_number} <span className="text-sm font-normal text-gray-500">({req.department})</span></h3>
                            <p className="text-sm">الأصناف: {req.items?.length || 0}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${req.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {req.status === 'approved' ? 'معتمد' : 'قيد الانتظار'}
                            </span>
                            {req.status !== 'approved' && (
                                <Button variant="default" className="bg-green-600" onClick={() => handleApprove(req.id)}>اعتماد الطلب</Button>
                            )}
                        </div>
                    </Card>
                ))}
                {requests.length === 0 && !loading && <p>لا توجد طلبات شراء</p>}
            </div>
        </div>
    );
}
