'use client';
import React, { useState } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { tasksApi } from '@/lib/api';

const priorityConfig = {
    urgent: { label: 'عاجل',   icon: '🔴', className: 'bg-red-100 text-red-700' },
    high:   { label: 'عالي',   icon: '🟠', className: 'bg-orange-100 text-orange-700' },
    medium: { label: 'متوسط',  icon: '🟡', className: 'bg-yellow-100 text-yellow-700' },
    low:    { label: 'منخفض',  icon: '🟢', className: 'bg-green-100 text-green-700' },
};

export default function TaskDetailModal({ task, isRTL, onClose, onRefresh, onEdit }: any) {
    const [comment, setComment] = useState('');
    const confirm = useConfirm();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(task.status);
    const [comments, setComments] = useState<any[]>(task.comments || []);

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setStatus(newStatus);
        try {
            await tasksApi.updateStatus(task.id, newStatus);
            onRefresh();
        } catch (error) {

        }
    };

    const handleDelete = async () => {
        if (!await confirm(isRTL ? 'هل أنت متأكد من حذف المهمة؟' : 'Are you sure you want to delete this task?')) return;
        try {
            await tasksApi.deleteTask(task.id);
            onRefresh();
            onClose();
        } catch (error) {

        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        setLoading(true);
        try {
            const res = await tasksApi.addComment(task.id, comment);
            setComments([res.data?.data || res.data, ...comments]);
            setComment('');
            onRefresh();
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-3xl flex flex-col h-[85vh] bg-white dark:bg-surface-900 text-gray-900 dark:text-gray-100">
                {/* Header */}
                <div className="flex justify-between items-start p-5 border-b border-gray-200 dark:border-surface-700">
                    <div className="pr-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                            {(priorityConfig as any)[task.priority]?.icon} {task.title}
                        </h2>
                        <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>📅 {task.due_date ? new Date(task.due_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '—'}</span>
                            <span>👤 {task.assignee?.name || task.creator?.name}</span>
                            {task.related_label && <span>🔗 {task.related_label}</span>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onEdit} className="btn-secondary px-3 py-1.5 text-sm" title="تعديل">✏️</button>
                        <button onClick={handleDelete} className="btn-secondary px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900" title="حذف">🗑️</button>
                        <button onClick={onClose} className="btn-secondary px-3 py-1.5 text-sm" aria-label={isRTL ? 'إغلاق' : 'Close'}>✕</button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Right / Left Col: Details */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex gap-4 p-4 bg-gray-50 dark:bg-surface-800 rounded-lg">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">{isRTL ? 'الحالة' : 'Status'}</label>
                                <select value={status} onChange={handleStatusChange} className="input-field py-1">
                                    <option value="todo">{isRTL ? 'للتنفيذ' : 'To Do'}</option>
                                    <option value="in_progress">{isRTL ? 'جاري' : 'In Progress'}</option>
                                    <option value="done">{isRTL ? 'منجز' : 'Done'}</option>
                                    <option value="cancelled">{isRTL ? 'ملغي' : 'Cancelled'}</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">{isRTL ? 'الفئة' : 'Category'}</label>
                                <div className="font-bold p-1">{task.category || '—'}</div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg mb-2">{isRTL ? 'الوصف:' : 'Description:'}</h3>
                            <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                                {task.description || <span className="text-gray-400 italic">{isRTL ? 'لا يوجد وصف' : 'No description provided'}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Left / Right Col: Comments */}
                    <div className="flex flex-col bg-gray-50 dark:bg-surface-800 rounded-xl p-4 border border-gray-100 dark:border-surface-700">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            💬 {isRTL ? `التعليقات (${comments.length})` : `Comments (${comments.length})`}
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
                            {comments.map((c: any) => (
                                <div key={c.id} className="bg-white dark:bg-surface-900 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-surface-700">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">{c.user?.name}</span>
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(c.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <div className="text-center text-gray-400 text-sm py-8">
                                    {isRTL ? 'لا توجد تعليقات بعد' : 'No comments yet'}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleAddComment} className="mt-auto">
                            <textarea
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder={isRTL ? 'اكتب تعليقاً...' : 'Write a comment...'}
                                className="w-full text-sm p-2 rounded-lg border border-gray-300 dark:border-surface-600 bg-white dark:bg-surface-900 focus:border-indigo-400 outline-none resize-none mb-2"
                                rows={2}
                            />
                            <button type="submit" disabled={loading || !comment.trim()} className="btn-primary w-full text-sm py-1.5">
                                {loading ? '...' : (isRTL ? 'إرسال' : 'Send')}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
