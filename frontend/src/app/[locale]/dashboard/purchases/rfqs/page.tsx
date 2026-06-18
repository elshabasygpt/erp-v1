'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { purchasesApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function RFQsPage() {
    const [rfqs, setRfqs] = useState<any[]>([]);
    const [prs, setPrs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [selectedPrId, setSelectedPrId] = useState('');
    const [deadline, setDeadline] = useState('');

    useEffect(() => {
        fetchRfqs();
        fetchPrs();
    }, []);

    const fetchRfqs = async () => {
        try {
            setLoading(true);
            const res = await purchasesApi.getRFQs();
            setRfqs(res.data?.data?.data || []);
        } catch (e) {
            toast.error('Failed to load RFQs');
        } finally {
            setLoading(false);
        }
    };

    const fetchPrs = async () => {
        try {
            const res = await purchasesApi.getPurchaseRequests({ status: 'approved' });
            setPrs(res.data?.data?.data || []);
        } catch (e) {}
    };

    const handleCreate = async () => {
        try {
            // Find PR to copy items
            const pr = prs.find(p => p.id === selectedPrId);
            if (!pr) return toast.error('اختر طلب الشراء أولاً');

            await purchasesApi.createRFQ({
                purchase_request_id: selectedPrId,
                deadline_date: deadline,
                items: pr.items.map((i: any) => ({
                    product_id: i.product_id,
                    description: i.description,
                    quantity: i.quantity
                }))
            });
            toast.success('تم إصدار طلب عروض أسعار بنجاح');
            setShowForm(false);
            fetchRfqs();
        } catch (e) {
            toast.error('فشل إنشاء RFQ');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">عروض الأسعار (RFQs)</h1>
                <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-600">{showForm ? 'إلغاء' : 'إصدار RFQ جديد'}</Button>
            </div>

            {showForm && (
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">إصدار طلب عروض أسعار من طلب شراء معتمد</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1">طلب الشراء المعتمد</label>
                            <select className="w-full border p-2 rounded" value={selectedPrId} onChange={e => setSelectedPrId(e.target.value)}>
                                <option value="">-- اختر طلب الشراء --</option>
                                {prs.map(pr => <option key={pr.id} value={pr.id}>{pr.request_number} - {pr.department}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1">تاريخ انتهاء تلقي العروض</label>
                            <input type="date" className="w-full border p-2 rounded" value={deadline} onChange={e => setDeadline(e.target.value)} />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button className="bg-indigo-600" onClick={handleCreate}>حفظ وإصدار RFQ</Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid gap-4">
                {rfqs.map(rfq => (
                    <Card key={rfq.id} className="p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{rfq.rfq_number}</h3>
                            <p className="text-sm text-gray-600">تاريخ الانتهاء: {rfq.deadline_date || 'غير محدد'}</p>
                            <p className="text-sm">عدد العروض المستلمة: {rfq.quotations?.length || 0}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                {rfq.status === 'draft' ? 'مسودة' : rfq.status}
                            </span>
                            <Button variant="outline">إدخال عروض الموردين</Button>
                        </div>
                    </Card>
                ))}
                {rfqs.length === 0 && !loading && <p>لا توجد طلبات عروض أسعار</p>}
            </div>
        </div>
    );
}
