import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Props {
    locale: string;
}

export default function ImportUndoTab({ locale }: Props) {
    const isRTL = locale === 'ar';
    const queryClient = useQueryClient();
    const [isUndoing, setIsUndoing] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['imports-history', 1],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant/products/imports/history?page=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return res.data.data;
        }
    });

    const handleUndo = async (importId: string) => {
        if (!confirm(isRTL ? 'هل أنت متأكد من التراجع عن هذا الاستيراد؟ سيتم حذف جميع المنتجات الجديدة التي تمت إضافتها.' : 'Are you sure you want to undo this import? All newly added products will be deleted.')) {
            return;
        }

        setIsUndoing(importId);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant/products/imports/${importId}/undo`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            toast.success(isRTL ? `تم التراجع بنجاح. تم حذف ${res.data.data.deleted_count} منتج.` : `Successfully reversed. ${res.data.data.deleted_count} products deleted.`);
            queryClient.invalidateQueries({ queryKey: ['imports-history'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        } catch (error: any) {
            toast.error(error.response?.data?.message || (isRTL ? 'فشل التراجع عن الاستيراد' : 'Failed to undo import'));
        } finally {
            setIsUndoing(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const items = data?.items || [];
    
    // Filter to only those with rollback_id and within 24 hours
    const undoableItems = items.filter((item: any) => {
        if (!item.rollback_id || item.status === 'rolled_back') return false;
        const importDate = new Date(item.created_at);
        const hoursDiff = (new Date().getTime() - importDate.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 24;
    });

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="mb-6 border-b border-surface-200 dark:border-surface-700 pb-4">
                <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2 mb-2">
                    <span className="text-rose-500">↩</span> {isRTL ? 'التراجع عن الاستيراد (Undo)' : 'Undo Import'}
                </h2>
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-400">
                    <p className="font-bold mb-1">
                        {isRTL ? 'ملاحظة هامة:' : 'Important Note:'}
                    </p>
                    <p>
                        {isRTL 
                            ? 'يمكنك التراجع فقط عن عمليات الاستيراد التي تمت خلال الـ 24 ساعة الماضية. التراجع سيقوم بحذف المنتجات "الجديدة" التي أُضيفت في ذلك الملف فقط ولن يؤثر على المنتجات التي تم تحديثها.' 
                            : 'You can only undo imports performed within the last 24 hours. Undoing will delete "newly" created products from that file and will not revert updated products.'}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {undoableItems.length === 0 ? (
                    <div className="text-center p-12 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700">
                        <div className="text-4xl mb-4 opacity-50">🕒</div>
                        <p className="text-surface-500 font-bold">
                            {isRTL ? 'لا توجد عمليات استيراد قابلة للتراجع في آخر 24 ساعة' : 'No reversible imports found in the last 24 hours'}
                        </p>
                    </div>
                ) : (
                    undoableItems.map((item: any) => (
                        <div key={item.id} className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-5 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-lg flex items-center justify-center text-2xl">
                                    📄
                                </div>
                                <div>
                                    <h3 className="font-bold text-surface-900 dark:text-white">
                                        {item.file_name}
                                    </h3>
                                    <div className="text-sm text-surface-500 mt-1 flex gap-3">
                                        <span>{new Date(item.created_at).toLocaleString()}</span>
                                        <span>•</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                            {item.imported_rows} {isRTL ? 'منتج جديد' : 'New Products'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => handleUndo(item.id)}
                                disabled={isUndoing === item.id}
                                className="btn-primary bg-rose-500 hover:bg-rose-600 border-rose-500 text-white shadow-rose-500/30 min-w-[120px]"
                            >
                                {isUndoing === item.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </span>
                                ) : (
                                    isRTL ? 'تراجع الآن' : 'Undo Now'
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
