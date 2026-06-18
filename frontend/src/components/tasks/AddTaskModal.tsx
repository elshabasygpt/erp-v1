'use client';
import React, { useState } from 'react';
import { tasksApi } from '@/lib/api';

interface AddTaskModalProps {
    task?: any;
    users: any[];
    categories: any[];
    isRTL: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddTaskModal({ task, users, categories, isRTL, onClose, onSuccess }: AddTaskModalProps) {
    const [form, setForm] = useState({
        title: task?.title || '',
        description: task?.description || '',
        priority: task?.priority || 'medium',
        status: task?.status || 'todo',
        category: task?.category || '',
        due_date: task?.due_date || '',
        due_time: task?.due_time || '',
        assigned_to: task?.assigned_to || '',
        reminder_at: task?.reminder_at ? task.reminder_at.substring(0, 16) : '',
        related_type: task?.related_type || '',
        related_label: task?.related_label || '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (task) {
                await tasksApi.updateTask(task.id, form);
            } else {
                await tasksApi.createTask(form as any);
            }
            onSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-2xl bg-white dark:bg-surface-900 text-gray-900 dark:text-gray-100">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-surface-700">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {task ? (isRTL ? '✏️ تعديل المهمة' : '✏️ Edit Task') : (isRTL ? '✅ مهمة جديدة' : '✅ New Task')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{isRTL ? 'عنوان المهمة (مطلوب)' : 'Task Title (Required)'}</label>
                        <input
                            type="text"
                            required
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder={isRTL ? 'مثال: مراجعة عروض الموردين...' : 'e.g. Review supplier offers...'}
                            className="input-field"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'الأولوية' : 'Priority'}</label>
                            <div className="flex gap-1">
                                {[
                                    { id: 'low', label: '🟢', text: isRTL ? 'منخفض' : 'Low' },
                                    { id: 'medium', label: '🟡', text: isRTL ? 'متوسط' : 'Medium' },
                                    { id: 'high', label: '🟠', text: isRTL ? 'عالي' : 'High' },
                                    { id: 'urgent', label: '🔴', text: isRTL ? 'عاجل' : 'Urgent' },
                                ].map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setForm({ ...form, priority: p.id })}
                                        className={`flex-1 py-1.5 text-xs font-bold border rounded flex flex-col items-center justify-center transition-all
                                            ${form.priority === p.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-transparent border-gray-200 dark:border-surface-600 hover:bg-gray-50 dark:hover:bg-surface-800'}`}
                                    >
                                        <span className="text-lg">{p.label}</span>
                                        {p.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'الحالة' : 'Status'}</label>
                            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-field h-full py-0">
                                <option value="todo">{isRTL ? 'للتنفيذ' : 'To Do'}</option>
                                <option value="in_progress">{isRTL ? 'جاري' : 'In Progress'}</option>
                                <option value="done">{isRTL ? 'منجز' : 'Done'}</option>
                                <option value="cancelled">{isRTL ? 'ملغي' : 'Cancelled'}</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'وقت الاستحقاق' : 'Due Time'}</label>
                            <input type="time" value={form.due_time} onChange={e => setForm({ ...form, due_time: e.target.value })} className="input-field" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'تعيين لـ' : 'Assign To'}</label>
                            <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="input-field">
                                <option value="">{isRTL ? 'لنفسي' : 'Myself'}</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'الفئة' : 'Category'}</label>
                            <datalist id="categories-list">
                                {categories.map(c => <option key={c.category} value={c.category} />)}
                            </datalist>
                            <input
                                list="categories-list"
                                type="text"
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                placeholder={isRTL ? 'اختر أو اكتب فئة جديدة...' : 'Select or type...'}
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'تذكير في' : 'Reminder At'}</label>
                            <input type="datetime-local" value={form.reminder_at} onChange={e => setForm({ ...form, reminder_at: e.target.value })} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{isRTL ? 'ربط بكيان (نص للعرض)' : 'Related Entity (Text)'}</label>
                            <input
                                type="text"
                                value={form.related_label}
                                onChange={e => setForm({ ...form, related_label: e.target.value })}
                                placeholder={isRTL ? 'مثال: فاتورة INV-0045' : 'e.g. Invoice INV-0045'}
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{isRTL ? 'الوصف (اختياري)' : 'Description (Optional)'}</label>
                        <textarea
                            rows={3}
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="input-field resize-none"
                        ></textarea>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-surface-700">
                        <button type="submit" disabled={loading} className="btn-primary flex-1">
                            {loading ? '...' : (isRTL ? 'حفظ المهمة ✓' : 'Save Task ✓')}
                        </button>
                        <button type="button" onClick={onClose} className="btn-secondary">
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
