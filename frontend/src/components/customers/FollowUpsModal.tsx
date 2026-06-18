'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/lib/api';

interface Props {
    locale: string;
    onClose: () => void;
}

export function FollowUpsModal({ locale, onClose }: Props) {
    const isRTL = locale === 'ar';
    const queryClient = useQueryClient();

    const { data: followUps = [], isLoading } = useQuery({
        queryKey: ['global-follow-ups'],
        queryFn: async () => {
            const res = await crmApi.getFollowUps({ status: 'pending' });
            return res.data?.data || res.data || [];
        }
    });

    const completeMutation = useMutation({
        mutationFn: async (id: string) => crmApi.markFollowUpCompleted(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-follow-ups'] });
        }
    });

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-3xl">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📋</span>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                            {isRTL ? 'مهام المتابعة الخاصة بي' : 'My Follow-Ups'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="p-5">
                    {isLoading ? (
                        <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                            {isRTL ? 'جاري التحميل...' : 'Loading...'}
                        </div>
                    ) : followUps.length === 0 ? (
                        <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                            <span className="text-4xl mb-4 block">🎉</span>
                            {isRTL ? 'لا توجد مهام معلقة! أحسنت العمل.' : 'No pending tasks! Great job.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                            {followUps.map((task: any) => (
                                <div key={task.id} className="glass-card p-4 rounded-xl border border-primary-500/30 flex flex-col hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{task.title}</h5>
                                        <span className="badge badge-warning text-[10px] whitespace-nowrap">
                                            {task.due_date || (isRTL ? 'بدون موعد' : 'No Date')}
                                        </span>
                                    </div>
                                    <p className="text-xs flex-1 mb-3" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
                                    
                                    {task.customer && (
                                        <div className="flex items-center gap-2 mb-4 p-2 bg-primary-50 dark:bg-primary-900/10 rounded-lg">
                                            <span className="w-6 h-6 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center text-xs">👤</span>
                                            <div>
                                                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? task.customer.name_ar || task.customer.name : task.customer.name}</p>
                                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{task.customer.phone}</p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-end mt-auto pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
                                        <button 
                                            onClick={() => completeMutation.mutate(task.id)}
                                            disabled={completeMutation.isPending}
                                            className="text-xs bg-green-500 hover:bg-green-600 text-white py-1.5 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                        >
                                            {completeMutation.isPending ? '...' : (isRTL ? '✔ إنجاز المهمة' : '✔ Complete Task')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
