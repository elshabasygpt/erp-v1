"use client";

import React, { useEffect, useState } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useLanguage } from '@/i18n/LanguageContext';
import { automationApi } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

export default function AutomationListPage() {
    const { isRTL } = useLanguage();
    const confirm = useConfirm();
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const res = await automationApi.getWorkflows();
            setWorkflows(res.data?.data || res.data || []);
        } catch (err) {
            setLoadError(true);
            toast.error('Failed to load workflows');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm('Are you sure?')) return;
        try {
            await automationApi.deleteWorkflow(id);
            setWorkflows(prev => prev.filter(w => w.id !== id));
            toast.success('Workflow deleted');
        } catch (err) {
            toast.error('Failed to delete workflow');
        }
    };

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">
                        {isRTL ? 'أتمتة سير العمل' : 'Workflow Automation'}
                    </h1>
                    <p className="text-surface-500">
                        {isRTL ? 'إدارة القواعد التلقائية الخاصة بك' : 'Manage your automated rules and triggers.'}
                    </p>
                </div>
                <Link href="./automation/builder" className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 transition shadow-sm">
                    + {isRTL ? 'قاعدة جديدة' : 'New Rule'}
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
                ) : loadError ? (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-surface-200 dark:border-surface-800 rounded-2xl">
                        <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                            {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                        </p>
                        <button onClick={() => loadWorkflows()} className="btn-secondary py-1.5 px-4 text-xs">
                            🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                        </button>
                    </div>
                ) : (
                  <>
                {workflows.map(wf => (
                    <div key={wf.id} className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-6 rounded-2xl shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${wf.is_active ? 'bg-emerald-500' : 'bg-surface-300'}`}></div>
                                <h3 className="font-bold text-lg">{wf.name}</h3>
                            </div>
                            <button onClick={() => handleDelete(wf.id)} className="text-red-500 hover:text-red-700 text-sm">
                                {isRTL ? 'حذف' : 'Delete'}
                            </button>
                        </div>
                        <p className="text-surface-500 text-sm mb-6">
                            Trigger: <span className="font-medium text-violet-600">{wf.trigger_type}</span>
                        </p>
                        <Link href={`./automation/builder?id=${wf.id}`} className="block text-center w-full py-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg text-sm font-medium transition">
                            {isRTL ? 'تعديل' : 'Edit Workflow'}
                        </Link>
                    </div>
                ))}
                
                {workflows.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState
                            icon="⚙️"
                            title={isRTL ? 'لا توجد قواعد أتمتة بعد' : 'No automation rules yet'}
                            description={isRTL ? 'انقر على "قاعدة جديدة" لإنشاء أول قاعدة أتمتة.' : 'Click "New Rule" to create your first automation.'}
                            isRTL={isRTL}
                        />
                    </div>
                )}
                  </>
                )}
            </div>
        </div>
    );
}
