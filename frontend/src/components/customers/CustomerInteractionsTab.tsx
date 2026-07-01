'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/lib/api';
import Skeleton from '@/components/ui/Skeleton';

interface Props {
    locale: string;
    customerId: string;
    insightsData: any;
    onRefresh: () => void;
}

export default function CustomerInteractionsTab({ locale, customerId, insightsData, onRefresh }: Props) {
    const isRTL = locale === 'ar';
    const queryClient = useQueryClient();

    const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'followups'>('timeline');

    // Forms state
    const [noteContent, setNoteContent] = useState('');
    const [interactionType, setInteractionType] = useState('call');
    const [interactionDesc, setInteractionDesc] = useState('');
    
    const [showFollowUpForm, setShowFollowUpForm] = useState(false);
    const [followUpTitle, setFollowUpTitle] = useState('');
    const [followUpDesc, setFollowUpDesc] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');

    // Mutations
    const addNoteMutation = useMutation({
        mutationFn: async (content: string) => crmApi.addCustomerNote(customerId, { content }),
        onSuccess: () => {
            setNoteContent('');
            onRefresh();
        }
    });

    const addInteractionMutation = useMutation({
        mutationFn: async (data: any) => crmApi.addCustomerInteraction(customerId, data),
        onSuccess: () => {
            setInteractionDesc('');
            onRefresh();
        }
    });

    const addFollowUpMutation = useMutation({
        mutationFn: async (data: any) => crmApi.createFollowUp(data),
        onSuccess: () => {
            setFollowUpTitle('');
            setFollowUpDesc('');
            setFollowUpDate('');
            setShowFollowUpForm(false);
            onRefresh();
        }
    });

    const completeFollowUpMutation = useMutation({
        mutationFn: async (id: string) => crmApi.markFollowUpCompleted(id),
        onSuccess: () => {
            onRefresh();
        }
    });

    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim()) return;
        addNoteMutation.mutate(noteContent);
    };

    const handleAddInteraction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!interactionDesc.trim()) return;
        addInteractionMutation.mutate({
            type: interactionType,
            description: interactionDesc,
            interaction_date: new Date().toISOString().split('T')[0]
        });
    };

    const handleAddFollowUp = (e: React.FormEvent) => {
        e.preventDefault();
        if (!followUpTitle.trim()) return;
        addFollowUpMutation.mutate({
            customer_id: customerId,
            title: followUpTitle,
            description: followUpDesc,
            due_date: followUpDate
        });
    };

    if (!insightsData) {
        return (
            <div className="p-5 space-y-3 min-h-[400px]">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        );
    }

    const { recent_notes = [], communication_history = [], active_follow_ups = [] } = insightsData;

    // Combine notes and interactions into a single timeline, sorted by date desc
    const timeline = [
        ...recent_notes.map((n: any) => ({ ...n, _isNote: true, _date: n.created_at })),
        ...communication_history.map((i: any) => ({ ...i, _isInteraction: true, _date: i.interaction_date || i.created_at }))
    ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime());

    return (
        <div className="animate-fade-in flex flex-col h-full min-h-[400px]">
            {/* Sub-tabs header */}
            <div className="flex gap-4 border-b px-5 pt-2 mb-4" style={{ borderColor: 'var(--border-default)' }}>
                <button
                    onClick={() => setActiveSubTab('timeline')}
                    className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeSubTab === 'timeline' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}
                >
                    {isRTL ? 'السجل الزمني والملاحظات' : 'Timeline & Notes'}
                </button>
                <button
                    onClick={() => setActiveSubTab('followups')}
                    className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeSubTab === 'followups' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}
                >
                    {isRTL ? 'مهام المتابعة' : 'Follow-ups'}
                    {active_follow_ups.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{active_follow_ups.length}</span>
                    )}
                </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
                {activeSubTab === 'timeline' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Forms Column */}
                        <div className="lg:col-span-1 space-y-4">
                            {/* Add Note */}
                            <div className="glass-card p-4 rounded-xl">
                                <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>📝 {isRTL ? 'إضافة ملاحظة' : 'Add Note'}</h4>
                                <form onSubmit={handleAddNote} className="space-y-3">
                                    <textarea 
                                        className="input-field py-2 text-sm w-full min-h-[80px]" 
                                        placeholder={isRTL ? 'اكتب ملاحظتك هنا...' : 'Type note here...'}
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                    ></textarea>
                                    <button type="submit" disabled={addNoteMutation.isPending || !noteContent.trim()} className="btn-primary w-full py-1.5 text-sm">
                                        {addNoteMutation.isPending ? '...' : (isRTL ? 'حفظ الملاحظة' : 'Save Note')}
                                    </button>
                                </form>
                            </div>

                            {/* Add Interaction */}
                            <div className="glass-card p-4 rounded-xl">
                                <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>📞 {isRTL ? 'تسجيل تفاعل' : 'Log Interaction'}</h4>
                                <form onSubmit={handleAddInteraction} className="space-y-3">
                                    <select className="select-field py-2 text-sm w-full" value={interactionType} onChange={e => setInteractionType(e.target.value)}>
                                        <option value="call">{isRTL ? 'مكالمة هاتفية' : 'Phone Call'}</option>
                                        <option value="email">{isRTL ? 'بريد إلكتروني' : 'Email'}</option>
                                        <option value="meeting">{isRTL ? 'اجتماع' : 'Meeting'}</option>
                                        <option value="message">{isRTL ? 'رسالة' : 'Message'}</option>
                                    </select>
                                    <textarea 
                                        className="input-field py-2 text-sm w-full min-h-[80px]" 
                                        placeholder={isRTL ? 'تفاصيل التفاعل...' : 'Interaction details...'}
                                        value={interactionDesc}
                                        onChange={e => setInteractionDesc(e.target.value)}
                                    ></textarea>
                                    <button type="submit" disabled={addInteractionMutation.isPending || !interactionDesc.trim()} className="btn-primary w-full py-1.5 text-sm">
                                        {addInteractionMutation.isPending ? '...' : (isRTL ? 'تسجيل' : 'Log it')}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Timeline Column */}
                        <div className="lg:col-span-2">
                            <h4 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>⏱️ {isRTL ? 'السجل الزمني' : 'Timeline'}</h4>
                            <div className="space-y-4">
                                {timeline.length === 0 ? (
                                    <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'لا يوجد سجلات سابقة.' : 'No previous records.'}
                                    </div>
                                ) : (
                                    timeline.map((item: any, idx: number) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${item._isNote ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {item._isNote ? '📝' : (item.type === 'call' ? '📞' : item.type === 'meeting' ? '🤝' : '✉️')}
                                                </div>
                                                {idx < timeline.length - 1 && <div className="w-px h-full bg-gray-200 dark:bg-gray-700 my-1"></div>}
                                            </div>
                                            <div className="glass-card p-3 rounded-lg flex-1 mb-2">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                                        {item._isNote ? (isRTL ? 'ملاحظة' : 'Note') : (item.type?.toUpperCase() || 'Interaction')}
                                                    </span>
                                                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                                        {new Date(item._date).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                                                    </span>
                                                </div>
                                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    {item.content || item.description}
                                                </p>
                                                {item.user && (
                                                    <p className="text-[10px] mt-2 text-primary-500 font-medium">
                                                        {isRTL ? 'بواسطة:' : 'By:'} {item.user.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'followups' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>📌 {isRTL ? 'المهام المعلقة' : 'Pending Tasks'}</h4>
                            <button onClick={() => setShowFollowUpForm(!showFollowUpForm)} className="btn-secondary text-xs py-1.5 px-3">
                                {showFollowUpForm ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? '+ إضافة مهمة' : '+ Add Task')}
                            </button>
                        </div>

                        {showFollowUpForm && (
                            <form onSubmit={handleAddFollowUp} className="glass-card p-4 rounded-xl space-y-3 animate-fade-in border-l-4 border-l-primary-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'عنوان المهمة' : 'Task Title'}</label>
                                        <input type="text" className="input-field py-2 text-sm w-full" value={followUpTitle} onChange={e => setFollowUpTitle(e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                                        <input type="date" className="input-field py-2 text-sm w-full" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'التفاصيل' : 'Details'}</label>
                                        <textarea className="input-field py-2 text-sm w-full" value={followUpDesc} onChange={e => setFollowUpDesc(e.target.value)}></textarea>
                                    </div>
                                </div>
                                <button type="submit" disabled={addFollowUpMutation.isPending || !followUpTitle} className="btn-primary py-2 px-6 text-sm">
                                    {addFollowUpMutation.isPending ? '...' : (isRTL ? 'حفظ المهمة' : 'Save Task')}
                                </button>
                            </form>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {active_follow_ups.length === 0 ? (
                                <div className="md:col-span-2 text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? 'لا توجد مهام معلقة لهذا العميل.' : 'No pending tasks for this customer.'}
                                </div>
                            ) : (
                                active_follow_ups.map((task: any) => (
                                    <div key={task.id} className="glass-card p-4 rounded-xl border border-red-200 dark:border-red-900/30 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{task.title}</h5>
                                            <span className="badge badge-warning text-[10px]">{task.due_date || (isRTL ? 'بدون موعد' : 'No Date')}</span>
                                        </div>
                                        <p className="text-xs flex-1 mb-4" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
                                        <div className="flex justify-between items-center mt-auto pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
                                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                                {task.assignee ? task.assignee.name : ''}
                                            </span>
                                            <button 
                                                onClick={() => completeFollowUpMutation.mutate(task.id)}
                                                disabled={completeFollowUpMutation.isPending}
                                                className="text-xs bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded shadow-sm transition-colors"
                                            >
                                                {isRTL ? '✔ إنجاز' : '✔ Complete'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
