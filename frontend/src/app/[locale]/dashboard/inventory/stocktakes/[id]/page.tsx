'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/i18n/LanguageContext';
import { inventoryApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Save, CheckCircle, ArrowLeft, Barcode, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function StocktakeExecutionPage() {
    const { d } = useLanguage();
    const { id } = useParams();
    const router = useRouter();
    
    const [stocktake, setStocktake] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Barcode scanner logic
    const [barcodeInput, setBarcodeInput] = useState('');
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Unlisted Items Logic
    const [unlistedProductId, setUnlistedProductId] = useState('');
    const [unlistedQty, setUnlistedQty] = useState('');
    const [unlistedAdding, setUnlistedAdding] = useState(false);

    // Recount Logic
    const [recountItems, setRecountItems] = useState<string[]>([]);
    
    // Import Logic
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchStocktake();
    }, [id]);

    const fetchStocktake = async () => {
        try {
            setLoading(true);
            const res = await inventoryApi.getStocktake(id as string);
            setStocktake(res.data.data);
            setItems(res.data.data.items || []);
        } catch (error) {
            toast.error('Failed to load stocktake details');
        } finally {
            setLoading(false);
        }
    };

    const handleCountChange = (productId: string, value: string) => {
        const val = value === '' ? null : Number(value);
        setItems(items.map(item => {
            if (item.product_id === productId) {
                return { ...item, counted_quantity: val };
            }
            return item;
        }));
    };

    const handleBarcodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = barcodeInput.trim();
        if (!code) return;

        try {
            const res = await inventoryApi.scanStocktakeBarcode(id as string, code);
            toast.success(`+1 ${res.data.data.product_name} (Total: ${res.data.data.counted_quantity})`);
            fetchStocktake();
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to scan barcode: ${code}`);
        }
        
        setBarcodeInput('');
    };

    const handleAddUnlisted = async () => {
        if (!unlistedProductId || !unlistedQty) return;
        try {
            setUnlistedAdding(true);
            await inventoryApi.addUnlistedItem(id as string, {
                product_id: unlistedProductId,
                counted_quantity: Number(unlistedQty)
            });
            toast.success('Unlisted item added successfully');
            setUnlistedProductId('');
            setUnlistedQty('');
            fetchStocktake();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to add item');
        } finally {
            setUnlistedAdding(false);
        }
    };

    const handleExport = async () => {
        try {
            const data = await inventoryApi.exportStocktake(id as string);
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `stocktake_${stocktake?.reference_number || id}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            toast.error('Failed to export stocktake sheet');
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setImporting(true);
            await inventoryApi.importStocktake(id as string, file);
            toast.success('Counts imported successfully');
            fetchStocktake();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to import counts');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRequestRecount = async () => {
        if (recountItems.length === 0) return;
        try {
            await inventoryApi.requestStocktakeRecount(id as string, recountItems);
            toast.success('Recount requested successfully');
            setRecountItems([]);
            fetchStocktake();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to request recount');
        }
    };

    const saveProgress = async () => {
        try {
            setSaving(true);
            const updateData = items
                .filter(i => i.counted_quantity !== null)
                .map(i => ({
                    product_id: i.product_id,
                    counted_quantity: i.counted_quantity
                }));
                
            if (updateData.length > 0) {
                await inventoryApi.updateStocktakeCounts(id as string, updateData);
            }
            
            if (stocktake.status === 'draft') {
                await inventoryApi.updateStocktakeStatus(id as string, 'counting');
                setStocktake({...stocktake, status: 'counting'});
            }
            
            toast.success('Progress saved successfully');
            fetchStocktake(); // Refresh to get variances
        } catch (error) {
            toast.error('Failed to save progress');
        } finally {
            setSaving(false);
        }
    };

    const submitForReview = async () => {
        try {
            await saveProgress();
            await inventoryApi.updateStocktakeStatus(id as string, 'review');
            toast.success('Stocktake submitted for review!');
            router.push('/dashboard/inventory/stocktakes');
        } catch (error) {
            toast.error('Failed to submit for review');
        }
    };

    const approveStocktake = async () => {
        if (!confirm('Are you sure? This will adjust inventory and generate financial journal entries for variances.')) return;
        
        try {
            await inventoryApi.approveStocktake(id as string);
            toast.success('Stocktake approved and variances applied!');
            router.push('/dashboard/inventory/stocktakes');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to approve stocktake');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Stocktake...</div>;
    if (!stocktake) return <div className="p-8 text-center">Stocktake not found</div>;

    const isEditable = ['draft', 'counting'].includes(stocktake.status);
    const isReview = stocktake.status === 'review';
    
    const countedItems = items.filter(i => i.counted_quantity !== null).length;
    const progressPercent = items.length > 0 ? Math.round((countedItems / items.length) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/inventory/stocktakes">
                        <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Execute Stocktake / تنفيذ الجرد</h1>
                        <p className="text-gray-500">Ref: {stocktake.reference_number} | Warehouse: {stocktake.warehouse?.name}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isEditable && (
                        <>
                            <input 
                                type="file" 
                                accept=".csv" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleImport} 
                            />
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                                Import CSV
                            </Button>
                            <Button variant="outline" onClick={handleExport}>
                                Export CSV
                            </Button>
                            <Button variant="outline" onClick={saveProgress} disabled={saving}>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                            </Button>
                            <Button onClick={submitForReview} disabled={saving}>
                                Submit for Review
                            </Button>
                        </>
                    )}
                    {isReview && recountItems.length > 0 && (
                        <Button variant="destructive" onClick={handleRequestRecount}>
                            Request Recount ({recountItems.length})
                        </Button>
                    )}
                    {isReview && (
                        <Button onClick={approveStocktake} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-4 md:col-span-2 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Progress / نسبة الإنجاز</h3>
                        <span className="text-sm font-medium">{progressPercent}% ({countedItems}/{items.length} items)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </Card>
                
                {isEditable && (
                    <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                        <h3 className="font-semibold mb-2 flex items-center text-blue-800 dark:text-blue-300">
                            <Barcode className="w-4 h-4 mr-2" /> Fast Scan
                        </h3>
                        <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                            <input 
                                className="border p-2 rounded w-full bg-white dark:bg-gray-800 flex-1"
                                ref={barcodeInputRef}
                                value={barcodeInput}
                                onChange={(e: any) => setBarcodeInput(e.target.value)}
                                placeholder="Scan Barcode..." 
                            />
                            <Button type="submit">Add</Button>
                        </form>
                    </Card>
                )}

                {isEditable && (
                    <Card className="p-4 bg-gray-50 dark:bg-gray-800 border-gray-200">
                        <h3 className="font-semibold mb-2 flex items-center">
                            Add Unlisted
                        </h3>
                        <div className="flex gap-2">
                            <input 
                                className="border p-2 rounded w-full bg-white dark:bg-gray-800 flex-1"
                                value={unlistedProductId}
                                onChange={(e: any) => setUnlistedProductId(e.target.value)}
                                placeholder="Product UUID" 
                            />
                            <input 
                                type="number"
                                className="border p-2 rounded w-16 bg-white dark:bg-gray-800"
                                value={unlistedQty}
                                onChange={(e: any) => setUnlistedQty(e.target.value)}
                                placeholder="Qty" 
                            />
                            <Button onClick={handleAddUnlisted} disabled={unlistedAdding}>Add</Button>
                        </div>
                    </Card>
                )}
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                {isReview && <th className="px-4 py-3 font-medium text-gray-500 w-10"></th>}
                                <th className="px-4 py-3 font-medium text-gray-500">SKU</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Product Name</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Expected</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Counted</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Variance</th>
                                {(isReview || stocktake.status === 'completed') && (
                                    <th className="px-4 py-3 font-medium text-gray-500">Value</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {items.map((item) => {
                                const diff = item.difference;
                                const isDiff = item.counted_quantity !== null && diff !== 0;
                                const rowClass = isDiff 
                                    ? (diff < 0 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-green-50 dark:bg-green-900/10')
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50';

                                return (
                                    <tr key={item.id} className={rowClass}>
                                        {isReview && (
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="checkbox"
                                                    checked={recountItems.includes(item.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setRecountItems([...recountItems, item.id]);
                                                        else setRecountItems(recountItems.filter(id => id !== item.id));
                                                    }}
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-3 font-mono text-sm">{item.product?.sku}</td>
                                        <td className="px-4 py-3 flex items-center gap-2">
                                            {item.product?.name}
                                            {item.is_recounted && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">Recounted</span>}
                                        </td>
                                        <td className="px-4 py-3">{item.expected_quantity ?? '?'}</td>
                                        <td className="px-4 py-3">
                                            {isEditable ? (
                                                <input 
                                                    type="number" 
                                                    className="w-32 bg-white dark:bg-gray-800 border p-1 rounded"
                                                    value={item.counted_quantity === null ? '' : item.counted_quantity}
                                                    onChange={(e: any) => handleCountChange(item.product_id, e.target.value)}
                                                />
                                            ) : (
                                                <span className="font-bold">{item.counted_quantity ?? 'Not Counted'}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.counted_quantity !== null && (
                                                <span className={`inline-flex items-center gap-1 font-medium ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {diff < 0 && <AlertTriangle className="w-3 h-3" />}
                                                    {diff > 0 ? '+' : ''}{diff}
                                                </span>
                                            )}
                                        </td>
                                        {(isReview || stocktake.status === 'completed') && (
                                            <td className="px-4 py-3 font-medium">
                                                {item.variance_value} SAR
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
