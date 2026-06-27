'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rmaApi, salesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, PackageCheck, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';

const REASON_LABELS: Record<string, string> = {
    defective_manufacturing: 'Defective — Manufacturing',
    defective_installation:  'Defective — Installation',
    wrong_part_ordered:      'Wrong Part (Customer Error)',
    wrong_part_shipped:      'Wrong Part (Our Error)',
    customer_changed_mind:   'Customer Changed Mind',
    warranty_claim:          'Warranty Claim',
    core_deposit_return:     'Core Deposit Return',
    shipping_damage:         'Shipping Damage',
    other:                   'Other',
};

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
    submitted:    { label: 'Submitted',    badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    under_review: { label: 'Under Review', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    approved:     { label: 'Approved',     badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected:     { label: 'Rejected',     badgeClass: 'bg-red-50 text-red-700 border-red-200' },
    fulfilled:    { label: 'Fulfilled',    badgeClass: 'bg-green-50 text-green-700 border-green-200' },
    cancelled:    { label: 'Cancelled',    badgeClass: 'bg-gray-100 text-gray-600 border-gray-300' },
};

export default function RmaRequestDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [approvalNote, setApprovalNote]       = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [fulfillRef, setFulfillRef]           = useState({ type: 'sales_return', id: '' });
    const [showRejectModal, setShowRejectModal] = useState(false);

    const { data: response, isLoading } = useQuery({
        queryKey: ['rma-request', id],
        queryFn: () => rmaApi.getOne(id),
    });

    const rmaCustomerId = response?.data?.data?.customer_id;
    const { data: returnsRes } = useQuery({
        queryKey: ['customer-sales-returns', rmaCustomerId],
        queryFn: () => salesApi.getReturns({ customer_id: rmaCustomerId, limit: 50 }),
        enabled: !!rmaCustomerId,
    });
    const customerReturns: any[] = returnsRes?.data?.data?.data ?? [];

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rma-request', id] });

    const approveMutation = useMutation({
        mutationFn: () => rmaApi.approve(id, { notes: approvalNote }),
        onSuccess: () => { toast.success('RMA approved'); invalidate(); },
        onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to approve'),
    });

    const rejectMutation = useMutation({
        mutationFn: () => rmaApi.reject(id, { rejection_reason: rejectionReason }),
        onSuccess: () => { toast.success('RMA rejected'); setShowRejectModal(false); invalidate(); },
        onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to reject'),
    });

    const fulfillMutation = useMutation({
        mutationFn: () => rmaApi.fulfill(id, { reference_type: fulfillRef.type, reference_id: fulfillRef.id }),
        onSuccess: () => { toast.success('RMA fulfilled'); invalidate(); },
        onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to fulfill'),
    });

    const cancelMutation = useMutation({
        mutationFn: () => rmaApi.cancel(id),
        onSuccess: () => { toast.success('RMA cancelled'); invalidate(); },
        onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to cancel'),
    });

    const underReviewMutation = useMutation({
        mutationFn: () => rmaApi.markUnderReview(id),
        onSuccess: () => { toast.success('RMA marked as under review'); invalidate(); },
        onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update status'),
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
    const rma = response?.data?.data;
    if (!rma)   return <div className="p-8 text-center text-red-500">RMA request not found.</div>;

    const statusCfg = STATUS_CONFIG[rma.status] ?? { label: rma.status, badgeClass: 'bg-gray-100 text-gray-700' };
    const isExpired = rma.expires_at && new Date(rma.expires_at) < new Date();
    const canApprove  = ['submitted', 'under_review'].includes(rma.status);
    const canFulfill  = rma.status === 'approved' && !isExpired;
    const canCancel   = ['submitted', 'under_review', 'approved'].includes(rma.status);

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight font-mono">{rma.rma_number}</h1>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.badgeClass}`}>
                            {statusCfg.label}
                        </span>
                        {isExpired && rma.status === 'approved' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                                <AlertCircle className="w-3 h-3 mr-1" /> Expired
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Customer: <strong>{rma.customer?.name}</strong> · Submitted: {format(new Date(rma.created_at), 'PPP')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Left — details */}
                <div className="col-span-2 space-y-6">
                    {/* Return Info */}
                    <div className="bg-white border rounded-xl p-6 shadow-sm space-y-3">
                        <h3 className="font-semibold border-b pb-2">Return Information</h3>
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <dt className="text-gray-500">Return Type</dt>
                                <dd className="font-medium capitalize">{rma.return_type?.replace('_', ' ')}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-500">Reason Category</dt>
                                <dd className="font-medium">{REASON_LABELS[rma.reason_category] ?? rma.reason_category}</dd>
                            </div>
                            {rma.invoice && (
                                <div>
                                    <dt className="text-gray-500">Invoice</dt>
                                    <dd className="font-medium font-mono">{rma.invoice.invoice_number}</dd>
                                </div>
                            )}
                            {rma.expected_refund_value && (
                                <div>
                                    <dt className="text-gray-500">Expected Refund</dt>
                                    <dd className="font-medium text-green-700">{formatCurrency(rma.expected_refund_value)}</dd>
                                </div>
                            )}
                            {rma.expires_at && (
                                <div>
                                    <dt className="text-gray-500">Expires On</dt>
                                    <dd className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>{format(new Date(rma.expires_at), 'PPP')}</dd>
                                </div>
                            )}
                        </dl>
                        {rma.reason_details && (
                            <div className="pt-2 border-t">
                                <p className="text-sm text-gray-500 mb-1">Reason Details</p>
                                <p className="text-sm">{rma.reason_details}</p>
                            </div>
                        )}
                        {rma.rejection_reason && (
                            <div className="pt-2 border-t bg-red-50 rounded-md p-3">
                                <p className="text-sm font-medium text-red-700">Rejection Reason</p>
                                <p className="text-sm text-red-600 mt-1">{rma.rejection_reason}</p>
                            </div>
                        )}
                        {rma.fulfilled_reference_type && (
                            <div className="pt-2 border-t bg-green-50 rounded-md p-3">
                                <p className="text-sm font-medium text-green-700">Fulfilled via</p>
                                <p className="text-sm text-green-700 mt-1 font-mono">
                                    {rma.fulfilled_reference_type?.replace('_', ' ')} · {rma.fulfilled_reference_id}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold border-b pb-2 mb-4">Items ({rma.items?.length ?? 0})</h3>
                        {rma.items?.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 border-b">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">Product</th>
                                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                                        <th className="px-3 py-2 text-left font-medium">Note</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {rma.items.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="px-3 py-2">
                                                <div className="font-medium">{item.product?.name ?? '—'}</div>
                                                <div className="text-xs text-gray-400">{item.product?.sku}</div>
                                            </td>
                                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                                            <td className="px-3 py-2 text-gray-500 text-xs">{item.reason_note ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-sm text-gray-400">No items listed.</p>
                        )}
                    </div>
                </div>

                {/* Right — actions */}
                <div className="space-y-6">
                    <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold">Actions</h3>

                        {/* Mark Under Review */}
                        {rma.status === 'submitted' && (
                            <div className="border-t pt-4">
                                <p className="text-xs text-gray-500 mb-2">Mark this request as being actively reviewed before approving or rejecting.</p>
                                <Button
                                    variant="outline"
                                    className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={() => underReviewMutation.mutate()}
                                    disabled={underReviewMutation.isPending}
                                >
                                    <Clock className="w-4 h-4 mr-2" /> Mark Under Review
                                </Button>
                            </div>
                        )}

                        {/* Approve */}
                        {canApprove && (
                            <div className="space-y-2 border-t pt-4">
                                <p className="text-xs text-gray-500">Approve this RMA to allow the customer to proceed with the return.</p>
                                <input
                                    type="text"
                                    placeholder="Approval note (optional)"
                                    className="w-full border rounded-md p-2 text-sm"
                                    value={approvalNote}
                                    onChange={e => setApprovalNote(e.target.value)}
                                />
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => approveMutation.mutate()}
                                    disabled={approveMutation.isPending}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" /> Approve RMA
                                </Button>
                                <Button
                                    className="w-full" variant="outline"
                                    onClick={() => setShowRejectModal(true)}
                                >
                                    <XCircle className="w-4 h-4 mr-2 text-red-500" /> Reject
                                </Button>
                            </div>
                        )}

                        {/* Fulfill */}
                        {canFulfill && (
                            <div className="space-y-2 border-t pt-4">
                                <p className="text-xs text-gray-500">
                                    Link this approved RMA to the actual return document that was processed.
                                </p>
                                <select
                                    className="w-full border rounded-md p-2 text-sm"
                                    value={fulfillRef.type}
                                    onChange={e => setFulfillRef({ type: e.target.value, id: '' })}
                                >
                                    <option value="sales_return">Sales Return</option>
                                    <option value="customer_core_return">Core Return</option>
                                </select>
                                {fulfillRef.type === 'sales_return' && (
                                    <select
                                        className="w-full border rounded-md p-2 text-sm"
                                        value={fulfillRef.id}
                                        onChange={e => setFulfillRef({ ...fulfillRef, id: e.target.value })}
                                    >
                                        <option value="">— Select Sales Return —</option>
                                        {customerReturns.map((ret: any) => (
                                            <option key={ret.id} value={ret.id}>
                                                {ret.return_number} · {ret.total} SAR · {ret.status}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {fulfillRef.type === 'customer_core_return' && (
                                    <input
                                        type="text"
                                        placeholder="Core Return UUID"
                                        className="w-full border rounded-md p-2 text-sm font-mono text-xs"
                                        value={fulfillRef.id}
                                        onChange={e => setFulfillRef({ ...fulfillRef, id: e.target.value })}
                                    />
                                )}
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={() => fulfillMutation.mutate()}
                                    disabled={fulfillMutation.isPending || !fulfillRef.id}
                                >
                                    <PackageCheck className="w-4 h-4 mr-2" /> Mark as Fulfilled
                                </Button>
                            </div>
                        )}

                        {/* Cancel */}
                        {canCancel && (
                            <div className="border-t pt-4">
                                <Button
                                    variant="outline"
                                    className="w-full text-gray-500"
                                    onClick={() => cancelMutation.mutate()}
                                    disabled={cancelMutation.isPending}
                                >
                                    Cancel RMA
                                </Button>
                            </div>
                        )}

                        {rma.status === 'fulfilled' && (
                            <div className="border-t pt-4">
                                <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm flex items-center">
                                    <CheckCircle className="w-5 h-5 mr-2" /> This RMA has been fulfilled.
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Review info */}
                    {rma.reviewer && (
                        <div className="bg-white border rounded-xl p-5 shadow-sm text-sm space-y-1">
                            <p className="font-medium text-gray-600">Reviewed by</p>
                            <p className="font-semibold">{rma.reviewer.name}</p>
                            {rma.reviewed_at && <p className="text-xs text-gray-400">{format(new Date(rma.reviewed_at), 'PPPp')}</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* Reject modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full space-y-4">
                        <h3 className="text-lg font-semibold">Reject RMA {rma.rma_number}</h3>
                        <p className="text-sm text-gray-500">Please provide a reason for rejection. This will be visible in the RMA record.</p>
                        <textarea
                            className="w-full border rounded-md p-2 text-sm"
                            rows={3}
                            placeholder="Reason for rejection..."
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => rejectMutation.mutate()}
                                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                            >
                                Confirm Rejection
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
