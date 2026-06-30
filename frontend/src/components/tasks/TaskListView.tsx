'use client';
import React from 'react';
import { tasksApi } from '@/lib/api';

const priorityConfig = {
    urgent: { label: 'عاجل',   icon: '🔴', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    high:   { label: 'عالي',   icon: '🟠', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    medium: { label: 'متوسط',  icon: '🟡', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    low:    { label: 'منخفض',  icon: '🟢', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const statusConfig = {
    todo: { label: 'للتنفيذ', color: 'text-gray-600 bg-gray-100' },
    in_progress: { label: 'جاري', color: 'text-blue-600 bg-blue-100' },
    done: { label: 'منجز', color: 'text-green-600 bg-green-100' },
    cancelled: { label: 'ملغي', color: 'text-red-600 bg-red-100' }
};

export default function TaskListView({ tasks, isRTL, onRefresh, setDetailTask, setEditingTask }: any) {

    const handleToggleStatus = async (task: any) => {
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        try {
            await tasksApi.updateStatus(task.id, newStatus);
            onRefresh();
        } catch (error) {

        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(isRTL ? 'هل أنت متأكد من حذف المهمة؟' : 'Are you sure you want to delete this task?')) return;
        try {
            await tasksApi.deleteTask(id);
            onRefresh();
        } catch (error) {

        }
    };

    const getDueDateStyle = (task: any) => {
        if (!task.due_date) return 'text-gray-400';
        if (task.is_overdue) return 'text-red-600 font-bold';
        if (task.is_due_today) return 'text-orange-600 font-bold';
        if (task.days_until_due <= 3) return 'text-yellow-600';
        return 'text-gray-600 dark:text-gray-300';
    };

    const getDueDateLabel = (task: any) => {
        if (!task.due_date) return '—';
        if (task.is_overdue) return `${isRTL ? 'متأخر' : 'Overdue'} ${Math.abs(task.days_until_due)} ${isRTL ? 'يوم' : 'days'}`;
        if (task.is_due_today) return isRTL ? 'اليوم ⚡' : 'Today ⚡';
        if (task.days_until_due === 1) return isRTL ? 'غداً' : 'Tomorrow';
        if (task.days_until_due <= 7) return isRTL ? `بعد ${task.days_until_due} أيام` : `In ${task.days_until_due} days`;
        return new Date(task.due_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US');
    };

    if (tasks.length === 0) {
        return <div className="text-center py-20 text-gray-400">{isRTL ? 'لا توجد مهام تطابق البحث' : 'No tasks match criteria'}</div>;
    }

    return (
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="data-table text-sm w-full">
                    <thead>
                        <tr>
                            <th className="w-12 text-center">✓</th>
                            <th className="w-24">{isRTL ? 'الأولوية' : 'Priority'}</th>
                            <th>{isRTL ? 'العنوان' : 'Title'}</th>
                            <th>{isRTL ? 'المُعيَّن لـ' : 'Assignee'}</th>
                            <th>{isRTL ? 'الفئة' : 'Category'}</th>
                            <th>{isRTL ? 'الاستحقاق' : 'Due'}</th>
                            <th>{isRTL ? 'الحالة' : 'Status'}</th>
                            <th className="w-24 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map((task: any) => (
                            <tr key={task.id} className="group hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                                <td className="text-center">
                                    <button
                                        onClick={() => handleToggleStatus(task)}
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all mx-auto
                                            ${task.status === 'done'
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                                            }`}
                                    >
                                        {task.status === 'done' && '✓'}
                                    </button>
                                </td>
                                <td>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${(priorityConfig as any)[task.priority]?.className}`}>
                                        {(priorityConfig as any)[task.priority]?.icon} {(priorityConfig as any)[task.priority]?.label || task.priority}
                                    </span>
                                </td>
                                <td>
                                    <div className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {task.title}
                                    </div>
                                    {task.related_label && (
                                        <div className="text-[10px] text-gray-400 mt-0.5">🔗 {task.related_label}</div>
                                    )}
                                </td>
                                <td>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                        <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[9px] font-bold">
                                            {task.assignee?.name?.[0] || task.creator?.name?.[0]}
                                        </div>
                                        {task.assignee?.name || task.creator?.name}
                                    </div>
                                </td>
                                <td>
                                    {task.category && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                                            style={{ background: `${task.color || '#10b981'}20`, color: task.color || '#10b981' }}>
                                            {task.category}
                                        </span>
                                    )}
                                </td>
                                <td className={`text-xs ${getDueDateStyle(task)}`}>
                                    {task.due_date ? `📅 ${getDueDateLabel(task)}` : '—'}
                                </td>
                                <td>
                                    <span className={`text-[10px] px-2 py-1 rounded-md font-bold whitespace-nowrap ${(statusConfig as any)[task.status]?.color}`}>
                                        {(statusConfig as any)[task.status]?.label || task.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="opacity-0 group-hover:opacity-100 flex justify-center gap-1.5 transition-opacity">
                                        <button onClick={() => setDetailTask(task)} title={isRTL ? 'تفاصيل' : 'Details'} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500">👁️</button>
                                        <button onClick={() => setEditingTask(task)} title={isRTL ? 'تعديل' : 'Edit'} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-500">✏️</button>
                                        <button onClick={() => handleDelete(task.id)} title={isRTL ? 'حذف' : 'Delete'} className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
