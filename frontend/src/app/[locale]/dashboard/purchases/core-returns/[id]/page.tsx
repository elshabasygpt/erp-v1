'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coreReturnsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Truck, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';

export default function CoreReturnDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [creditNoteNumber, setCreditNoteNumber] = useState('');

    const id = params.id as string;

    const { data: response, isLoading } = useQuery({
        queryKey: ['core-return', id],
        queryFn: () => coreReturnsApi.getCoreReturn(id),
    });

    const shipMutation = useMutation({
        mutationFn: () => coreReturnsApi.shipCoreReturn(id),
        onSuccess: () => {
            toast.success('Core return marked as shipped successfully.');
            queryClient.invalidateQueries({ queryKey: ['core-return', id] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to ship core return.');
        }
    });

    const creditMutation = useMutation({
        mutationFn: () => coreReturnsApi.creditCoreReturn(id, { credit_note_number: creditNoteNumber }),
        onSuccess: () => {
            toast.success('Supplier credit processed and journal entry created.');
            queryClient.invalidateQueries({ queryKey: ['core-return', id] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to process credit.');
        }
    });

    if (isLoading) return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-white border rounded-xl p-6 shadow-sm space-y-3">
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="bg-white border rounded-xl p-6 shadow-sm space-y-3">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-9 w-full" />
                </div>
            </div>
        </div>
    );
    const data = response?.data?.data;
    if (!data) return <div className="p-8 text-center text-red-500">Core Return not found.</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2"/> Back</Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Core Return: {data.return_number}</h1>
                    <p className="text-muted-foreground">Supplier: {data.supplier?.name} | Created: {format(new Date(data.created_at), 'PPP')}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Returned Cores</h3>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b text-gray-500">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Part Number</th>
                                    <th className="px-4 py-2 font-medium">Product</th>
                                    <th className="px-4 py-2 font-medium text-right">Quantity</th>
                                    <th className="px-4 py-2 font-medium text-right">Core Value</th>
                                    <th className="px-4 py-2 font-medium text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.items.map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3">{item.product?.part_number}</td>
                                        <td className="px-4 py-3">{item.product?.name}</td>
                                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(item.core_value)}</td>
                                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.total_value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 flex justify-end">
                            <div className="text-lg font-bold">
                                Total Expected Credit: <span className="text-green-600">{formatCurrency(data.total_credit_value)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Status & Actions</h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Current Status:</span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize bg-gray-50 text-gray-800">{data.status}</span>
                            </div>

                            {data.status === 'draft' && (
                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-xs text-gray-500 mb-3">
                                        Marking as shipped will deduct these items from your core inventory in warehouse: {data.warehouse?.name}
                                    </p>
                                    <Button 
                                        className="w-full bg-blue-600 hover:bg-blue-700" 
                                        onClick={() => shipMutation.mutate()}
                                        disabled={shipMutation.isPending}
                                    >
                                        <Truck className="w-4 h-4 mr-2" />
                                        Mark as Shipped
                                    </Button>
                                </div>
                            )}

                            {data.status === 'shipped' && (
                                <div className="pt-4 border-t border-gray-100 space-y-3">
                                    <p className="text-xs text-gray-500">
                                        When the supplier issues a credit note, enter it below to process the accounting entry.
                                    </p>
                                    <input 
                                        type="text" 
                                        placeholder="Supplier Credit Note (Optional)" 
                                        className="w-full text-sm border rounded-md p-2"
                                        value={creditNoteNumber}
                                        onChange={e => setCreditNoteNumber(e.target.value)}
                                    />
                                    <Button 
                                        className="w-full bg-green-600 hover:bg-green-700" 
                                        onClick={() => creditMutation.mutate()}
                                        disabled={creditMutation.isPending}
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Process Supplier Credit
                                    </Button>
                                </div>
                            )}

                            {data.status === 'credited' && (
                                <div className="pt-4 border-t border-gray-100">
                                    <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm flex items-center">
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        Credit processed and journal entry created.
                                    </div>
                                    {data.notes && (
                                        <div className="mt-3 text-xs text-gray-600 whitespace-pre-wrap">
                                            {data.notes}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
