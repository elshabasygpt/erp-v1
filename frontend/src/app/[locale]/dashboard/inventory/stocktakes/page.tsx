'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { inventoryApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Plus, Search, Calendar, FileText, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function StocktakesPage() {
    const { d } = useLanguage();
    const [stocktakes, setStocktakes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    const [warehouses, setWarehouses] = useState<any[]>([]);
    
    // Create form
    const [newStocktake, setNewStocktake] = useState({
        warehouse_id: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        type: 'full',
        limit: 50,
        is_blind: false,
        is_frozen: false,
        notes: ''
    });

    useEffect(() => {
        fetchStocktakes();
        fetchWarehouses();
    }, []);

    const fetchStocktakes = async () => {
        try {
            setLoading(true);
            const res = await inventoryApi.getStocktakes();
            let data = res.data;
            if (data?.data?.data) data = data.data.data;
            else if (data?.data) data = data.data;
            
            setStocktakes(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(d?.inventory?.stocktakes?.fetchError || 'Failed to load stocktakes');
            setStocktakes([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const res = await inventoryApi.getWarehouses();
            let data = res.data;
            if (data?.data?.data) data = data.data.data;
            else if (data?.data) data = data.data;
            
            setWarehouses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load warehouses');
            setWarehouses([]);
        }
    };

    const handleCreate = async () => {
        if (!newStocktake.warehouse_id) {
            toast.error('Warehouse is required');
            return;
        }

        try {
            setIsCreating(true);
            await inventoryApi.createStocktake(newStocktake);
            toast.success('Stocktake session created successfully!');
            fetchStocktakes();
            setNewStocktake({
                warehouse_id: '',
                scheduled_date: new Date().toISOString().split('T')[0],
                type: 'full',
                limit: 50,
                is_blind: false,
                is_frozen: false,
                notes: ''
            });
            // Close modal (if we had one, for now it's inline)
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create stocktake');
        } finally {
            setIsCreating(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Draft / مسودة</span>;
            case 'counting': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Counting / قيد الجرد</span>;
            case 'review': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Review / تحت المراجعة</span>;
            case 'completed': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Completed / مكتمل</span>;
            case 'cancelled': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Cancelled / ملغي</span>;
            default: return <span>{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Physical Inventory (Stocktakes) / جرد المخزون
                    </h1>
                    <p className="text-gray-500 mt-1">Manage and execute inventory counts</p>
                </div>
            </div>

            {/* Create Section */}
            <Card className="p-4 bg-gray-50 dark:bg-gray-800 border-dashed border-2">
                <h3 className="font-semibold mb-3">Create New Stocktake / جلسة جرد جديدة</h3>
                <div className="flex flex-col gap-3">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Warehouse / المستودع</label>
                            <select 
                                className="border p-2 rounded w-full bg-white dark:bg-gray-800"
                                value={newStocktake.warehouse_id} 
                                onChange={(e: any) => setNewStocktake({...newStocktake, warehouse_id: e.target.value})}
                            >
                                <option value="">Select Warehouse...</option>
                                {Array.isArray(warehouses) && warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Date / التاريخ</label>
                            <input 
                                className="border p-2 rounded w-full bg-white dark:bg-gray-800"
                                type="date" 
                                value={newStocktake.scheduled_date}
                                onChange={(e: any) => setNewStocktake({...newStocktake, scheduled_date: e.target.value})}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Type / نوع الجرد</label>
                            <select 
                                className="border p-2 rounded w-full bg-white dark:bg-gray-800"
                                value={newStocktake.type} 
                                onChange={(e: any) => setNewStocktake({...newStocktake, type: e.target.value})}
                            >
                                <option value="full">Full / شامل</option>
                                <option value="cycle">Cycle (Random) / دوري (عشوائي)</option>
                                <option value="partial">Partial / جزئي</option>
                            </select>
                        </div>
                        {newStocktake.type === 'cycle' && (
                            <div className="w-24">
                                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Limit</label>
                                <input 
                                    className="border p-2 rounded w-full bg-white dark:bg-gray-800"
                                    type="number" 
                                    min="1"
                                    value={newStocktake.limit}
                                    onChange={(e: any) => setNewStocktake({...newStocktake, limit: parseInt(e.target.value) || 1})}
                                />
                            </div>
                        )}
                        <Button onClick={handleCreate} disabled={isCreating} className="mb-0.5">
                            <Plus className="w-4 h-4 mr-2" />
                            Generate Snapshot
                        </Button>
                    </div>
                    <div className="flex gap-6 mt-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input 
                                type="checkbox" 
                                className="rounded border-gray-300"
                                checked={newStocktake.is_frozen}
                                onChange={(e: any) => setNewStocktake({...newStocktake, is_frozen: e.target.checked})}
                            />
                            Freeze Inventory (منع الحركات المخزنية)
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input 
                                type="checkbox" 
                                className="rounded border-gray-300"
                                checked={newStocktake.is_blind}
                                onChange={(e: any) => setNewStocktake({...newStocktake, is_blind: e.target.checked})}
                            />
                            Blind Stocktake (إخفاء الكميات المتوقعة)
                        </label>
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input placeholder="Search stocktakes..." className="pl-10 max-w-md border p-2 rounded w-full bg-white dark:bg-gray-800" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-500">Reference</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Warehouse</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {Array.isArray(stocktakes) && stocktakes.map((st) => (
                                <tr key={st.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-4 py-3 font-medium">{st.reference_number}</td>
                                    <td className="px-4 py-3">{st.warehouse?.name}</td>
                                    <td className="px-4 py-3 text-gray-500">{st.scheduled_date}</td>
                                    <td className="px-4 py-3">{getStatusBadge(st.status)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Link href={`/dashboard/inventory/stocktakes/${st.id}`}>
                                            <Button variant="outline" size="sm">
                                                {st.status === 'draft' || st.status === 'counting' ? 'Execute / جرد' : 'Review / عرض'}
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {stocktakes.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        No stocktakes found. Create one to begin counting.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
