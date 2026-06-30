'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { purchasesApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function RFQsPage() {
    const { isRTL } = useLanguage();
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
            toast.error(isRTL ? 'فشل تحميل طلبات عروض الأسعار' : 'Failed to load RFQs');
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
            if (!pr) return toast.error(isRTL ? 'اختر طلب الشراء أولاً' : 'Select a purchase request first');

            await purchasesApi.createRFQ({
                purchase_request_id: selectedPrId,
                deadline_date: deadline,
                items: pr.items.map((i: any) => ({
                    product_id: i.product_id,
                    description: i.description,
                    quantity: i.quantity
                }))
            });
            toast.success(isRTL ? 'تم إصدار طلب عروض أسعار بنجاح' : 'RFQ issued successfully');
            setShowForm(false);
            fetchRfqs();
        } catch (e) {
            toast.error(isRTL ? 'فشل إنشاء RFQ' : 'Failed to create RFQ');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{isRTL ? 'عروض الأسعار (RFQs)' : 'Requests for Quotation (RFQs)'}</h1>
                <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-600">{showForm ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'إصدار RFQ جديد' : 'Issue New RFQ')}</Button>
            </div>

            {showForm && (
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">{isRTL ? 'إصدار طلب عروض أسعار من طلب شراء معتمد' : 'Issue an RFQ from an Approved Purchase Request'}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1">{isRTL ? 'طلب الشراء المعتمد' : 'Approved Purchase Request'}</label>
                            <select className="w-full border p-2 rounded" value={selectedPrId} onChange={e => setSelectedPrId(e.target.value)}>
                                <option value="">{isRTL ? '-- اختر طلب الشراء --' : '-- Select Purchase Request --'}</option>
                                {prs.map(pr => <option key={pr.id} value={pr.id}>{pr.request_number} - {pr.department}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1">{isRTL ? 'تاريخ انتهاء تلقي العروض' : 'Submission Deadline'}</label>
                            <input type="date" className="w-full border p-2 rounded" value={deadline} onChange={e => setDeadline(e.target.value)} />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button className="bg-indigo-600" onClick={handleCreate}>{isRTL ? 'حفظ وإصدار RFQ' : 'Save & Issue RFQ'}</Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid gap-4">
                {rfqs.map(rfq => (
                    <Card key={rfq.id} className="p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{rfq.rfq_number}</h3>
                            <p className="text-sm text-gray-600">{isRTL ? 'تاريخ الانتهاء' : 'Deadline'}: {rfq.deadline_date || (isRTL ? 'غير محدد' : 'Not set')}</p>
                            <p className="text-sm">{isRTL ? 'عدد العروض المستلمة' : 'Quotations received'}: {rfq.quotations?.length || 0}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                {rfq.status === 'draft' ? (isRTL ? 'مسودة' : 'Draft') : rfq.status}
                            </span>
                            <Button variant="outline">{isRTL ? 'إدخال عروض الموردين' : 'Enter Supplier Quotations'}</Button>
                        </div>
                    </Card>
                ))}
                {rfqs.length === 0 && !loading && <p>{isRTL ? 'لا توجد طلبات عروض أسعار' : 'No RFQs'}</p>}
            </div>
        </div>
    );
}
