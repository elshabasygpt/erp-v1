'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { purchasesApi, inventoryApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function PurchaseRequestsPage() {
    const { isRTL } = useLanguage();
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
            toast.error(isRTL ? 'فشل تحميل الطلبات' : 'Failed to load requests');
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
            toast.success(isRTL ? 'تم إنشاء طلب الشراء بنجاح' : 'Purchase request created successfully');
            setShowForm(false);
            fetchRequests();
        } catch (e) {
            toast.error(isRTL ? 'فشل إنشاء الطلب' : 'Failed to create request');
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await purchasesApi.updatePurchaseRequestStatus(id, { status: 'approved' });
            toast.success(isRTL ? 'تمت الموافقة على الطلب' : 'Request approved');
            fetchRequests();
        } catch (e) {
            toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
        }
    };

    const handleConvertToPo = async (id: string) => {
        try {
            await purchasesApi.convertPrToPo(id);
            toast.success(isRTL ? 'تم تحويل الطلب إلى أمر شراء (PO) بنجاح' : 'Request converted to purchase order (PO) successfully');
            fetchRequests();
        } catch (e) {
            toast.error(isRTL ? 'حدث خطأ أثناء التحويل، تأكد من وجود مورد مقترح' : 'An error occurred during conversion; make sure a suggested supplier exists');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{isRTL ? 'طلبات الشراء (Purchase Requests)' : 'Purchase Requests'}</h1>
                <Button onClick={() => setShowForm(!showForm)}>{showForm ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'إضافة طلب جديد' : 'Add New Request')}</Button>
            </div>

            {showForm && (
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">{isRTL ? 'طلب شراء جديد' : 'New Purchase Request'}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1">{isRTL ? 'القسم / الإدارة' : 'Department'}</label>
                            <input className="w-full border p-2 rounded" value={department} onChange={e => setDepartment(e.target.value)} />
                        </div>

                        <h3 className="font-bold mt-4">{isRTL ? 'الأصناف المطلوبة' : 'Requested Items'}</h3>
                        {items.map((item, idx) => (
                            <div key={idx} className="flex gap-4">
                                <select className="border p-2 rounded flex-1" value={item.product_id} onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].product_id = e.target.value;
                                    setItems(newItems);
                                }}>
                                    <option value="">{isRTL ? '-- صنف جديد / غير موجود --' : '-- New / Not Listed Item --'}</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
                                </select>
                                <input placeholder={isRTL ? 'وصف الصنف' : 'Item description'} className="border p-2 rounded flex-1" value={item.description} onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].description = e.target.value;
                                    setItems(newItems);
                                }} />
                                <input type="number" placeholder={isRTL ? 'الكمية' : 'Quantity'} className="border p-2 rounded w-32" value={item.quantity} onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].quantity = e.target.value;
                                    setItems(newItems);
                                }} />
                            </div>
                        ))}
                        <Button variant="outline" onClick={() => setItems([...items, { product_id: '', description: '', quantity: 1 }])}>{isRTL ? 'إضافة صنف آخر' : 'Add Another Item'}</Button>

                        <div className="flex justify-end pt-4">
                            <Button className="bg-indigo-600" onClick={handleCreate}>{isRTL ? 'تقديم الطلب للإدارة' : 'Submit Request for Approval'}</Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid gap-4">
                {requests.map(req => (
                    <Card key={req.id} className="p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{req.request_number} <span className="text-sm font-normal text-gray-500">({req.department})</span></h3>
                            <p className="text-sm">{isRTL ? 'الأصناف' : 'Items'}: {req.items?.length || 0}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${
                                req.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                req.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                                {req.status === 'completed' ? (isRTL ? 'مكتمل (تحول لـ PO)' : 'Completed (converted to PO)') : req.status === 'approved' ? (isRTL ? 'معتمد' : 'Approved') : (isRTL ? 'قيد الانتظار' : 'Pending')}
                            </span>
                            {req.status === 'pending_approval' && (
                                <Button variant="default" className="bg-green-600" onClick={() => handleApprove(req.id)}>{isRTL ? 'اعتماد الطلب' : 'Approve Request'}</Button>
                            )}
                            {req.status === 'approved' && req.suggested_supplier_id && (
                                <Button variant="default" className="bg-indigo-600" onClick={() => handleConvertToPo(req.id)}>{isRTL ? 'تحويل إلى أمر شراء (PO)' : 'Convert to Purchase Order (PO)'}</Button>
                            )}
                        </div>
                    </Card>
                ))}
                {requests.length === 0 && !loading && <p>{isRTL ? 'لا توجد طلبات شراء' : 'No purchase requests'}</p>}
            </div>
        </div>
    );
}
