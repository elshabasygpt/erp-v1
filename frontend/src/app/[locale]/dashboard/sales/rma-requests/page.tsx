'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rmaApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Clock, CheckCircle, XCircle, PackageCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

const STATUS_STYLES: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    submitted:    { label: 'Submitted',    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',  icon: <Clock className="w-3 h-3 mr-1" /> },
    under_review: { label: 'Under Review', className: 'bg-blue-50 text-blue-700 border-blue-200',        icon: <Clock className="w-3 h-3 mr-1" /> },
    approved:     { label: 'Approved',     className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
    rejected:     { label: 'Rejected',     className: 'bg-red-50 text-red-700 border-red-200',            icon: <XCircle className="w-3 h-3 mr-1" /> },
    fulfilled:    { label: 'Fulfilled',    className: 'bg-green-50 text-green-700 border-green-200',      icon: <PackageCheck className="w-3 h-3 mr-1" /> },
    cancelled:    { label: 'Cancelled',    className: 'bg-gray-100 text-gray-600 border-gray-200',        icon: null },
};

const RETURN_TYPE_LABELS: Record<string, string> = {
    sales_return: 'Sales Return',
    core_return:  'Core Return',
};

export default function RmaRequestsPage() {
    const router = useRouter();
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);

    const { data: response, isLoading } = useQuery({
        queryKey: ['rma-requests', status, page],
        queryFn: () => rmaApi.getAll({ status: status === 'all' ? undefined : status, page }),
    });

    const rmaList = response?.data?.data?.data || [];
    const meta    = response?.data?.data;

    const StatusBadge = ({ s }: { s: string }) => {
        const config = STATUS_STYLES[s] ?? { label: s, className: 'bg-gray-100 text-gray-700', icon: null };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
                {config.icon}{config.label}
            </span>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">RMA Requests</h1>
                    <p className="text-muted-foreground">Return Merchandise Authorization — track and approve customer return requests.</p>
                </div>
                <Button onClick={() => router.push('/dashboard/sales/rma-requests/new')}>
                    <Plus className="w-4 h-4 mr-2" /> New RMA Request
                </Button>
            </div>

            {/* Status filter tabs */}
            <div className="flex flex-wrap gap-2">
                {['all', 'submitted', 'under_review', 'approved', 'rejected', 'fulfilled', 'cancelled'].map(s => (
                    <Button
                        key={s}
                        variant={status === s ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setStatus(s); setPage(1); }}
                        className="capitalize"
                    >
                        {s === 'all' ? 'All' : STATUS_STYLES[s]?.label ?? s}
                    </Button>
                ))}
            </div>

            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b text-gray-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">RMA #</th>
                            <th className="px-4 py-3 font-medium">Customer</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Reason</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Exp. Refund</th>
                            <th className="px-4 py-3 font-medium">Expires</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                        ) : rmaList.length === 0 ? (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No RMA requests found.</td></tr>
                        ) : (
                            rmaList.map((rma: any) => (
                                <tr key={rma.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono font-medium text-blue-700">{rma.rma_number}</td>
                                    <td className="px-4 py-3">{rma.customer?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-xs">{RETURN_TYPE_LABELS[rma.return_type] ?? rma.return_type}</td>
                                    <td className="px-4 py-3 text-xs capitalize">{rma.reason_category?.replace(/_/g, ' ')}</td>
                                    <td className="px-4 py-3"><StatusBadge s={rma.status} /></td>
                                    <td className="px-4 py-3 text-right text-gray-700">
                                        {rma.expected_refund_value ? formatCurrency(rma.expected_refund_value) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {rma.expires_at ? format(new Date(rma.expires_at), 'MMM dd, yyyy') : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.push(`/dashboard/sales/rma-requests/${rma.id}`)}
                                        >
                                            <Eye className="w-4 h-4 mr-1" /> View
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <span className="text-sm text-gray-500 py-2">Page {page} of {meta.last_page}</span>
                    <Button variant="outline" size="sm" disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
            )}
        </div>
    );
}
