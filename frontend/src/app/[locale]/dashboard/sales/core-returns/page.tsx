'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customerCoreReturnsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

const STATUS_STYLES: Record<string, string> = {
    pending:  'bg-yellow-50 text-yellow-700 border-yellow-200',
    received: 'bg-blue-50 text-blue-700 border-blue-200',
    credited: 'bg-green-50 text-green-700 border-green-200',
};

const STATUS_LABELS: Record<string, string> = {
    pending:  'Pending',
    received: 'Received',
    credited: 'Credited',
};

export default function CustomerCoreReturnsPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('all');

    const { data: response, isLoading } = useQuery({
        queryKey: ['customer-core-returns', page, status],
        queryFn: () => customerCoreReturnsApi.getAll({ page, status: status === 'all' ? undefined : status }),
    });

    const returns = response?.data?.data?.data ?? [];
    const meta    = response?.data?.data;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Customer Core Returns</h1>
                    <p className="text-muted-foreground">Track core parts returned by customers and issue deposit refunds.</p>
                </div>
                <Button onClick={() => router.push('/dashboard/sales/core-returns/new')}>
                    <Plus className="w-4 h-4 mr-2" /> New Core Return
                </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
                {['all', 'pending', 'received', 'credited'].map(s => (
                    <Button
                        key={s}
                        variant={status === s ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setStatus(s); setPage(1); }}
                        className="capitalize"
                    >
                        {s === 'all' ? 'All' : STATUS_LABELS[s]}
                    </Button>
                ))}
            </div>

            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b text-gray-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Return No.</th>
                            <th className="px-4 py-3 font-medium">Customer</th>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Deposit Value</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                        ) : returns.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No core returns found.</td></tr>
                        ) : (
                            returns.map((ret: any) => (
                                <tr key={ret.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono font-medium">{ret.return_number}</td>
                                    <td className="px-4 py-3">{ret.customer?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-gray-500">{format(new Date(ret.created_at), 'MMM dd, yyyy')}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[ret.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {STATUS_LABELS[ret.status] ?? ret.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-green-700">
                                        {formatCurrency(ret.total_deposit_value)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.push(`/dashboard/sales/core-returns/${ret.id}`)}
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
