'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerCoreReturnsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { PackageCheck, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';

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

const CONDITION_OPTIONS = [
    { value: 'good',    label: 'Good — Full deposit refund' },
    { value: 'damaged', label: 'Damaged — Partial refund' },
    { value: 'scrap',   label: 'Scrap — No refund' },
];

const REFUND_METHOD_OPTIONS = [
    { value: 'cash',         label: 'Cash' },
    { value: 'store_credit', label: 'Store Credit' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
];

export default function CustomerCoreReturnDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = params.id as string;

    const [itemConditions, setItemConditions] = useState<Record<string, string>>({});
    const [refundMethod, setRefundMethod] = useState('cash');

    const { data: response, isLoading } = useQuery({
        queryKey: ['customer-core-return', id],
        queryFn: () => customerCoreReturnsApi.getOne(id),
    });

    const receiveMutation = useMutation({
        mutationFn: () => {
            const items = data.items.map((item: any) => ({
                id:        item.id,
                condition: itemConditions[item.id] ?? 'good',
            }));
            return customerCoreReturnsApi.receive(id, { items });
        },
        onSuccess: () => {
            toast.success('Core parts marked as received and added to inventory.');
            queryClient.invalidateQueries({ queryKey: ['customer-core-return', id] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to receive core return.');
        },
    });

    const creditMutation = useMutation({
        mutationFn: () => customerCoreReturnsApi.credit(id, { refund_method: refundMethod }),
        onSuccess: () => {
            toast.success('Deposit refund processed and journal entry created.');
            queryClient.invalidateQueries({ queryKey: ['customer-core-return', id] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to process deposit refund.');
        },
    });

    if (isLoading) return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border rounded-xl p-6 shadow-sm space-y-3">
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="space-y-6">
                    <div className="bg-white border rounded-xl p-6 shadow-sm space-y-3">
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-9 w-full" />
                    </div>
                </div>
            </div>
        </div>
    );

    const data = response?.data?.data;
    if (!data) return <div className="p-8 text-center text-red-500">Core Return not found.</div>;

    const allConditionsSet = (data.items ?? []).every((item: any) => itemConditions[item.id]);

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Core Return: {data.return_number}</h1>
                    <p className="text-muted-foreground">
                        Customer: {data.customer?.name ?? '—'} | Created: {format(new Date(data.created_at), 'PPP')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Items table */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Returned Core Parts</h3>
                        <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b text-gray-500">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Part #</th>
                                    <th className="px-4 py-2 font-medium">Product</th>
                                    <th className="px-4 py-2 font-medium text-right">Qty</th>
                                    <th className="px-4 py-2 font-medium text-right">Deposit/Unit</th>
                                    <th className="px-4 py-2 font-medium text-right">Total</th>
                                    {data.status === 'pending' && (
                                        <th className="px-4 py-2 font-medium">Condition</th>
                                    )}
                                    {data.status === 'received' && (
                                        <th className="px-4 py-2 font-medium">Condition</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {(data.items ?? []).map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3 font-mono text-xs">{item.product?.part_number ?? '—'}</td>
                                        <td className="px-4 py-3">{item.product?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(item.unit_deposit_value)}</td>
                                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                                        {data.status === 'pending' && (
                                            <td className="px-4 py-3">
                                                <select
                                                    className="border rounded-md p-1.5 text-sm w-full"
                                                    value={itemConditions[item.id] ?? ''}
                                                    onChange={e => setItemConditions(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                >
                                                    <option value="">Select...</option>
                                                    {CONDITION_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        )}
                                        {data.status === 'received' && (
                                            <td className="px-4 py-3 capitalize text-gray-600">
                                                {item.condition ?? '—'}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table></div>
                        <div className="mt-4 flex justify-end">
                            <div className="text-lg font-bold">
                                Total Deposit: <span className="text-green-600">{formatCurrency(data.total_deposit_value)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Status & Actions</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Current Status:</span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[data.status] ?? 'bg-gray-50 text-gray-700'}`}>
                                    {STATUS_LABELS[data.status] ?? data.status}
                                </span>
                            </div>

                            {/* Pending → Receive */}
                            {data.status === 'pending' && (
                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-xs text-gray-500 mb-3">
                                        Set the condition for each item above, then mark as received.
                                        Parts will be added to core inventory in: <strong>{data.warehouse?.name ?? '—'}</strong>.
                                    </p>
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                        onClick={() => receiveMutation.mutate()}
                                        disabled={receiveMutation.isPending || !allConditionsSet}
                                        title={!allConditionsSet ? 'Set condition for all items first' : undefined}
                                    >
                                        <PackageCheck className="w-4 h-4 mr-2" />
                                        {receiveMutation.isPending ? 'Processing...' : 'Mark as Received'}
                                    </Button>
                                    {!allConditionsSet && (
                                        <p className="mt-2 text-xs text-amber-600">
                                            Please set a condition for each item before receiving.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Received → Credit */}
                            {data.status === 'received' && (
                                <div className="pt-4 border-t border-gray-100 space-y-3">
                                    <p className="text-xs text-gray-500">
                                        Process the deposit refund to create the accounting journal entry.
                                    </p>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Refund Method</label>
                                        <select
                                            className="w-full border rounded-md p-2 text-sm"
                                            value={refundMethod}
                                            onChange={e => setRefundMethod(e.target.value)}
                                        >
                                            {REFUND_METHOD_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Button
                                        className="w-full bg-green-600 hover:bg-green-700"
                                        onClick={() => creditMutation.mutate()}
                                        disabled={creditMutation.isPending}
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        {creditMutation.isPending ? 'Processing...' : 'Process Deposit Refund'}
                                    </Button>
                                </div>
                            )}

                            {/* Credited — done */}
                            {data.status === 'credited' && (
                                <div className="pt-4 border-t border-gray-100">
                                    <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm flex items-center">
                                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                        Deposit refund processed and journal entry created.
                                    </div>
                                    {data.credited_at && (
                                        <p className="mt-2 text-xs text-gray-500">
                                            Credited on: {format(new Date(data.credited_at), 'PPP')}
                                        </p>
                                    )}
                                    {data.refund_method && (
                                        <p className="mt-1 text-xs text-gray-500 capitalize">
                                            Method: {REFUND_METHOD_OPTIONS.find(o => o.value === data.refund_method)?.label ?? data.refund_method}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl p-6 shadow-sm text-sm space-y-2">
                        <h3 className="font-semibold mb-2">Details</h3>
                        <div className="flex justify-between text-gray-600">
                            <span>Warehouse:</span>
                            <span className="font-medium">{data.warehouse?.name ?? '—'}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Created By:</span>
                            <span className="font-medium">{data.creator?.name ?? '—'}</span>
                        </div>
                        {data.received_at && (
                            <div className="flex justify-between text-gray-600">
                                <span>Received At:</span>
                                <span className="font-medium">{format(new Date(data.received_at), 'PPP')}</span>
                            </div>
                        )}
                        {data.notes && (
                            <div className="pt-2 border-t">
                                <p className="text-xs text-gray-500 font-medium mb-1">Notes:</p>
                                <p className="text-xs text-gray-700 whitespace-pre-wrap">{data.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
