'use client';

import { useState, useEffect } from 'react';
import { approvalsApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ApprovalInbox({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const common = dict.common;

    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');

    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await approvalsApi.getInbox({ status: statusFilter });
            setRequests(res.data?.data?.data || res.data?.data || []);
        } catch (error) {

        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [statusFilter]);

    const handleAction = async (action: 'approve' | 'reject') => {
        if (!selectedRequest) return;
        setProcessing(true);
        try {
            if (action === 'approve') {
                await approvalsApi.approveRequest(selectedRequest.id, notes);
            } else {
                await approvalsApi.rejectRequest(selectedRequest.id, notes);
            }
            setSelectedRequest(null);
            setNotes('');
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
        setProcessing(false);
    };

    return (
        <div className="flex-1 overflow-auto flex flex-col p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {isRTL ? 'صندوق الموافقات' : 'Approval Inbox'}
                </h1>
                <select className="select-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
                    <option value="approved">{isRTL ? 'تمت الموافقة' : 'Approved'}</option>
                    <option value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</option>
                    <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                </select>
            </div>

            {loading ? (
                <div className="text-center text-surface-400 py-20">{common.loading}</div>
            ) : requests.length === 0 ? (
                <div className="text-center text-surface-400 py-20">
                    {isRTL ? 'لا توجد طلبات موافقة حالياً' : 'No approval requests found.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requests.map(req => (
                        <div key={req.id} className="card p-5 border border-white/5 bg-surface-800/30 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs uppercase tracking-widest font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                                        {req.entity_type}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                                        req.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                        'bg-red-500/10 text-red-500'
                                    }`}>
                                        {req.status}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {req.trigger_type.replace(/_/g, ' ')}
                                </h3>
                                <p className="text-sm text-surface-400 mb-4 h-10 overflow-hidden line-clamp-2">
                                    {req.notes}
                                </p>
                                <div className="text-xs text-surface-500 mb-4">
                                    <p>{isRTL ? 'المرجع:' : 'Entity ID:'} {req.entity_id.split('-')[0]}</p>
                                    <p>{isRTL ? 'بواسطة:' : 'Requested by:'} {req.requester?.name || 'Unknown'}</p>
                                </div>
                            </div>
                            
                            {req.status === 'pending' && (
                                <button 
                                    className="btn-primary w-full text-sm"
                                    onClick={() => setSelectedRequest(req)}
                                >
                                    {isRTL ? 'مراجعة واتخاذ قرار' : 'Review & Decide'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {selectedRequest && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedRequest(null)}>
                    <div className="modal-content max-w-lg">
                        <div className="p-5 border-b border-white/5">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                {isRTL ? 'مراجعة الطلب' : 'Review Request'}
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-surface-400 mb-1">{isRTL ? 'نوع المشكلة' : 'Trigger'}</label>
                                <p className="font-semibold text-red-400 bg-red-500/5 p-2 rounded">{selectedRequest.trigger_type.replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-surface-400 mb-1">{isRTL ? 'التفاصيل' : 'Details'}</label>
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedRequest.notes}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-surface-400 mb-1">{isRTL ? 'ملاحظات إدارية (اختياري)' : 'Manager Notes (Optional)'}</label>
                                <textarea 
                                    className="input-field w-full" 
                                    rows={3} 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder={isRTL ? 'اكتب سبب القبول أو الرفض...' : 'Write your reason...'}
                                />
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button 
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl transition-colors font-bold disabled:opacity-50"
                                    onClick={() => handleAction('approve')}
                                    disabled={processing}
                                >
                                    {processing ? common.loading : (isRTL ? 'موافقة وتأكيد' : 'Approve & Confirm')}
                                </button>
                                <button 
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl transition-colors font-bold disabled:opacity-50"
                                    onClick={() => handleAction('reject')}
                                    disabled={processing}
                                >
                                    {processing ? common.loading : (isRTL ? 'رفض' : 'Reject')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
