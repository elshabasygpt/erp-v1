'use client';

import React, { useState, useEffect, useRef } from 'react';
import { backupsApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    running: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    pruned: 'bg-slate-100 text-slate-500',
};

const TYPE_LABELS_AR: Record<string, string> = {
    scheduled: 'مجدولة',
    manual: 'يدوية',
    pre_restore_safety: 'أمان قبل الاستعادة',
    restore: 'استعادة',
};

export default function BackupsSettingsSection({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const [backups, setBackups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);
    const [restoreTarget, setRestoreTarget] = useState<any | null>(null);
    const [confirmText, setConfirmText] = useState('');
    const [restoring, setRestoring] = useState(false);
    const pollRef = useRef<any>(null);

    const loadBackups = async () => {
        try {
            const res = await backupsApi.list();
            setBackups(res.data?.data?.data || res.data?.data || []);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBackups();
        return () => clearInterval(pollRef.current);
    }, []);

    const startPolling = () => {
        clearInterval(pollRef.current);
        pollRef.current = setInterval(loadBackups, 5000);
        setTimeout(() => clearInterval(pollRef.current), 5 * 60 * 1000);
    };

    const handleTriggerBackup = async () => {
        setTriggering(true);
        try {
            await backupsApi.triggerBackup();
            toast.success(isRTL ? 'بدأت عملية النسخ الاحتياطي' : 'Backup started');
            loadBackups();
            startPolling();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || (isRTL ? 'حدث خطأ' : 'Error starting backup'));
        } finally {
            setTriggering(false);
        }
    };

    const handleRestore = async () => {
        if (!restoreTarget) return;
        setRestoring(true);
        try {
            await backupsApi.restoreBackup(restoreTarget.id, confirmText);
            toast.success(isRTL ? 'بدأت عملية الاستعادة — لا تغلق هذه الصفحة' : 'Restore started — do not close this page');
            setRestoreTarget(null);
            setConfirmText('');
            loadBackups();
            startPolling();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || (isRTL ? 'فشلت الاستعادة' : 'Restore failed'));
        } finally {
            setRestoring(false);
        }
    };

    const handleDownload = async (id: string, type: 'db' | 'files') => {
        try {
            toast.loading(isRTL ? 'جاري تحضير الملف...' : 'Preparing download...', { id: 'download' });
            const res = await backupsApi.download(id, type);
            
            // Create a blob from the response
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Get filename from Content-Disposition if available, or generate one
            const contentDisposition = res.headers['content-disposition'];
            let fileName = `backup-${type}-${new Date().getTime()}.${type === 'db' ? 'sql.gz' : 'tar.gz'}`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2) fileName = fileNameMatch[1];
            }
            
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success(isRTL ? 'تم بدء التحميل' : 'Download started', { id: 'download' });
        } catch (error: any) {
            toast.error(isRTL ? 'فشل تحميل النسخة الاحتياطية' : 'Download failed', { id: 'download' });
        }
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '-';
        const mb = bytes / (1024 * 1024);
        return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                        {isRTL ? 'النسخ الاحتياطي والاستعادة' : 'Backups & Restore'}
                    </h3>
                    <p className="text-slate-500 mt-1 text-sm">
                        {isRTL
                            ? 'نسخة احتياطية تلقائية يومية لقاعدة البيانات والملفات. يمكنك أيضًا أخذ نسخة فورية أو الاستعادة من نسخة سابقة.'
                            : 'Your data and files are backed up automatically every day. You can also trigger a backup now or restore from a previous snapshot.'}
                    </p>
                </div>
                <button
                    onClick={handleTriggerBackup}
                    disabled={triggering}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 whitespace-nowrap"
                >
                    {triggering ? (isRTL ? 'جاري البدء...' : 'Starting...') : (isRTL ? 'نسخة احتياطية الآن' : 'Backup Now')}
                </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            {[
                                isRTL ? 'التاريخ' : 'Date',
                                isRTL ? 'النوع' : 'Type',
                                isRTL ? 'الحالة' : 'Status',
                                isRTL ? 'الحجم' : 'Size',
                                '',
                            ].map(h => (
                                <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading...</td></tr>
                        ) : backups.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">{isRTL ? 'لا توجد نسخ احتياطية بعد' : 'No backups yet'}</td></tr>
                        ) : backups.map(b => (
                            <tr key={b.id} className="border-b border-slate-100 dark:border-slate-700">
                                <td className={`px-4 py-3 text-slate-600 dark:text-slate-300 ${isRTL ? 'text-right' : ''}`}>
                                    {new Date(b.created_at).toLocaleString(isRTL ? 'ar' : 'en')}
                                </td>
                                <td className={`px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                                    {isRTL ? (TYPE_LABELS_AR[b.type] || b.type) : b.type}
                                </td>
                                <td className={`px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[b.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {b.status}
                                    </span>
                                </td>
                                <td className={`px-4 py-3 text-slate-500 ${isRTL ? 'text-right' : ''}`}>{formatSize(b.size_bytes)}</td>
                                <td className="px-4 py-3 text-right space-x-2 space-x-reverse">
                                    {b.status === 'completed' && b.type !== 'pre_restore_safety' && b.type !== 'restore' && (
                                        <>
                                            <button
                                                onClick={() => handleDownload(b.id, 'db')}
                                                className="text-xs font-medium text-primary-600 hover:underline mx-1"
                                                title={isRTL ? 'تحميل قاعدة البيانات' : 'Download DB'}
                                            >
                                                {isRTL ? 'تحميل DB' : 'Download DB'}
                                            </button>
                                            <button
                                                onClick={() => handleDownload(b.id, 'files')}
                                                className="text-xs font-medium text-primary-600 hover:underline mx-1"
                                                title={isRTL ? 'تحميل الملفات' : 'Download Files'}
                                            >
                                                {isRTL ? 'تحميل الملفات' : 'Download Files'}
                                            </button>
                                            <button
                                                onClick={() => { setRestoreTarget(b); setConfirmText(''); }}
                                                className="text-xs font-medium text-red-600 hover:underline mx-1"
                                            >
                                                {isRTL ? 'استعادة' : 'Restore'}
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {restoreTarget && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                        <h3 className="font-bold text-lg text-red-600">{isRTL ? 'تحذير: استعادة نسخة احتياطية' : 'Warning: Restore Backup'}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            {isRTL
                                ? 'هذه العملية ستستبدل كل بياناتك الحالية ببيانات النسخة الاحتياطية المحددة. سيتم أخذ نسخة أمان من بياناتك الحالية تلقائيًا قبل الاستعادة. للتأكيد، اكتب اسم شركتك بالضبط:'
                                : 'This will replace all your current data with the selected backup. A safety backup of your current data will be taken automatically first. To confirm, type your company name exactly:'}
                        </p>
                        <input
                            autoFocus
                            value={confirmText}
                            onChange={e => setConfirmText(e.target.value)}
                            className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"
                        />
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => { setRestoreTarget(null); setConfirmText(''); }}
                                className="px-4 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200"
                            >
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleRestore}
                                disabled={restoring || !confirmText}
                                className="px-5 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                            >
                                {restoring ? (isRTL ? 'جاري الاستعادة...' : 'Restoring...') : (isRTL ? 'تأكيد الاستعادة' : 'Confirm Restore')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
