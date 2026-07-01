'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { coreReturnsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Truck, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import Skeleton from '@/components/ui/Skeleton';

export default function CoreReturnsPage() {
    const router = useRouter();
    const t = useTranslations('purchases');
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('all');

    const { data: response, isLoading, isError, refetch } = useQuery({
        queryKey: ['core-returns', page, status],
        queryFn: () => coreReturnsApi.getCoreReturns({ page, status }),
    });

    const returns = response?.data?.data?.data || [];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-600 border border-yellow-200">Draft</span>;
            case 'shipped':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">Shipped</span>;
            case 'credited':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-200">Credited</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Core Returns</h1>
                    <p className="text-muted-foreground">Manage core part returns to suppliers and track credits.</p>
                </div>
                <Button onClick={() => router.push('/dashboard/purchases/core-returns/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Core Return
                </Button>
            </div>

            <div className="flex gap-2">
                {['all', 'draft', 'shipped', 'credited'].map(s => (
                    <Button 
                        key={s} 
                        variant={status === s ? 'default' : 'outline'}
                        onClick={() => setStatus(s)}
                        className="capitalize"
                    >
                        {s}
                    </Button>
                ))}
            </div>

            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b text-gray-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Return No.</th>
                            <th className="px-4 py-3 font-medium">Supplier</th>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Credit Value</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={`sk-${i}`} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                                    {Array.from({ length: 6 }).map((__, j) => (
                                        <td key={j} className="p-3"><Skeleton className="w-3/4 h-4" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : isError ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center">
                                    <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>Failed to load data.</p>
                                    <button onClick={() => refetch()} className="btn-secondary py-1.5 px-4 text-xs">🔄 Retry</button>
                                </td>
                            </tr>
                        ) : returns.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No core returns found.</td></tr>
                        ) : (
                            returns.map((ret: any) => (
                                <tr key={ret.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{ret.return_number}</td>
                                    <td className="px-4 py-3">{ret.supplier?.name}</td>
                                    <td className="px-4 py-3">{format(new Date(ret.created_at), 'MMM dd, yyyy')}</td>
                                    <td className="px-4 py-3">{getStatusBadge(ret.status)}</td>
                                    <td className="px-4 py-3 text-right font-medium text-green-600">
                                        {formatCurrency(ret.total_credit_value)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/purchases/core-returns/${ret.id}`)}>
                                            <Eye className="w-4 h-4 mr-2" /> View
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table></div>
            </div>
        </div>
    );
}
