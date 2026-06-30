import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';

interface Props {
    locale: string;
}

export default function ImportHistoryTab({ locale }: Props) {
    const isRTL = locale === 'ar';
    const [page, setPage] = useState(1);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['imports-history', page],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant/products/imports/history?page=${page}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return res.data.data;
        }
    });

    const handleDownloadErrors = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/tenant/products/imports/${id}/errors/export`;
            const response = await axios.get(apiUrl, { headers: { 'Authorization': `Bearer ${token}` }, responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `import_errors_${id}.xlsx`;
            link.click();
        } catch (error) {
            toast.error(isRTL ? 'فشل تحميل ملف الأخطاء' : 'Failed to download error log');
        }
    };

    const items = data?.items || [];

    const getStatusBadge = (status: string) => {
        const badges: any = {
            completed: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', label: isRTL ? 'مكتمل' : 'Completed' },
            failed: { color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400', label: isRTL ? 'فشل' : 'Failed' },
            processing: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', label: isRTL ? 'قيد المعالجة' : 'Processing' },
            cancelled: { color: 'bg-surface-100 text-surface-700 dark:bg-surface-500/20 dark:text-surface-400', label: isRTL ? 'ملغى' : 'Cancelled' }
        };
        const b = badges[status] || badges['processing'];
        return <span className={`px-2 py-1 rounded-lg text-xs font-bold ${b.color}`}>{b.label}</span>;
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                        <span>📜</span> {isRTL ? 'سجل عمليات الاستيراد' : 'Import History'}
                    </h2>
                    <p className="text-sm text-surface-500">
                        {isRTL ? 'متابعة كافة عمليات الاستيراد مع تفاصيل الأخطاء والإحصائيات' : 'Track all import operations with error details and statistics'}
                    </p>
                </div>
                <button onClick={() => refetch()} className="btn-secondary px-3 py-1 text-sm">
                    {isRTL ? 'تحديث' : 'Refresh'}
                </button>
            </div>

            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden flex-1">
                <div className="overflow-x-auto h-full">
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="text-xs text-surface-500 bg-surface-50 dark:bg-surface-800/50 uppercase border-b border-surface-200 dark:border-surface-700">
                            <tr>
                                <th className="px-6 py-4">{isRTL ? 'الملف والتاريخ' : 'File & Date'}</th>
                                <th className="px-6 py-4">{isRTL ? 'الحالة' : 'Status'}</th>
                                <th className="px-6 py-4">{isRTL ? 'الإحصائيات' : 'Statistics'}</th>
                                <th className="px-6 py-4 text-center">{isRTL ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={`sk-${i}`} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                                        {Array.from({ length: 4 }).map((__, j) => (
                                            <td key={j} className="p-3"><Skeleton className="w-3/4 h-4" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : isError ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center">
                                        <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                                            {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                                        </p>
                                        <button onClick={() => refetch()} className="btn-secondary py-1.5 px-4 text-xs">
                                            🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                                        </button>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-surface-500">
                                        {isRTL ? 'لا توجد عمليات استيراد سابقة' : 'No previous imports found'}
                                    </td>
                                </tr>
                            ) : items.map((item: any) => (
                                <tr key={item.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                            <span>📄</span> {item.file_name}
                                        </div>
                                        <div className="text-xs text-surface-500 mt-1 flex gap-2">
                                            <span>{new Date(item.created_at).toLocaleString()}</span>
                                            <span className="text-surface-300">•</span>
                                            <span>⏱️ {item.duration_seconds}s</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(item.status)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-3 text-xs font-medium">
                                            <div className="flex flex-col items-center p-1 px-2 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                                <span>{item.imported_rows}</span>
                                                <span className="text-[10px] uppercase opacity-70">New</span>
                                            </div>
                                            <div className="flex flex-col items-center p-1 px-2 rounded bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                                                <span>{item.updated_rows}</span>
                                                <span className="text-[10px] uppercase opacity-70">Update</span>
                                            </div>
                                            <div className="flex flex-col items-center p-1 px-2 rounded bg-surface-100 text-surface-600 dark:bg-surface-500/20 dark:text-surface-400">
                                                <span>{item.skipped_rows}</span>
                                                <span className="text-[10px] uppercase opacity-70">Skip</span>
                                            </div>
                                            <div className="flex flex-col items-center p-1 px-2 rounded bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                                                <span>{item.failed_row_count}</span>
                                                <span className="text-[10px] uppercase opacity-70">Error</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {item.failed_row_count > 0 && (
                                                <button
                                                    onClick={() => handleDownloadErrors(item.id)}
                                                    className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors"
                                                    title={isRTL ? 'تحميل تقرير الأخطاء' : 'Download Error Report'}
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination controls */}
            {data?.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-surface-200 dark:border-surface-700 pt-4">
                    <span className="text-sm text-surface-500">
                        {isRTL ? `صفحة ${data.current_page} من ${data.last_page}` : `Page ${data.current_page} of ${data.last_page}`}
                    </span>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(p => p - 1)} 
                            className="btn-secondary px-3 py-1 disabled:opacity-50"
                        >
                            {isRTL ? 'السابق' : 'Previous'}
                        </button>
                        <button 
                            disabled={page === data.last_page} 
                            onClick={() => setPage(p => p + 1)} 
                            className="btn-secondary px-3 py-1 disabled:opacity-50"
                        >
                            {isRTL ? 'التالي' : 'Next'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
