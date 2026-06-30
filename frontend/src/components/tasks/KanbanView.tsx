'use client';
import React, { useState } from 'react';
import { tasksApi } from '@/lib/api';
import QuickAddTask from './QuickAddTask';

const priorityConfig = {
    urgent: { label: 'عاجل',   icon: '🔴', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    high:   { label: 'عالي',   icon: '🟠', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    medium: { label: 'متوسط',  icon: '🟡', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    low:    { label: 'منخفض',  icon: '🟢', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const columns = [
    { id: 'todo', labelAr: '📋 للتنفيذ', labelEn: '📋 To Do' },
    { id: 'in_progress', labelAr: '⚡ جاري', labelEn: '⚡ In Progress' },
    { id: 'done', labelAr: '✅ منجز', labelEn: '✅ Done' },
    { id: 'cancelled', labelAr: '❌ ملغي', labelEn: '❌ Cancelled' },
];

export default function KanbanView({ tasks, isRTL, onRefresh, setDetailTask, setEditingTask }: any) {
    const [draggedTask, setDraggedTask] = useState<any>(null);

    const getDueDateStyle = (task: any) => {
        if (!task.due_date) return 'text-gray-400';
        if (task.is_overdue) return 'text-red-600 font-bold';
        if (task.is_due_today) return 'text-orange-600 font-bold';
        if (task.days_until_due <= 3) return 'text-yellow-600';
        return 'text-gray-600 dark:text-gray-400';
    };

    const getDueDateLabel = (task: any) => {
        if (!task.due_date) return '—';
        if (task.is_overdue) return `متأخر ${Math.abs(task.days_until_due)} يوم`;
        if (task.is_due_today) return 'اليوم ⚡';
        if (task.days_until_due === 1) return 'غداً';
        if (task.days_until_due <= 7) return `بعد ${task.days_until_due} أيام`;
        return new Date(task.due_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US');
    };

    const handleDragStart = (e: React.DragEvent, task: any) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
        // e.dataTransfer.setDragImage(e.target as Element, 0, 0);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        if (!draggedTask || draggedTask.status === targetStatus) {
            setDraggedTask(null);
            return;
        }

        try {
            await tasksApi.updateStatus(draggedTask.id, targetStatus);
            onRefresh();
        } catch (error) {

        } finally {
            setDraggedTask(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {columns.map(col => {
                const colTasks = tasks.filter((t: any) => t.status === col.id);
                return (
                    <div
                        key={col.id}
                        className="bg-surface-50 dark:bg-surface-900 rounded-xl p-3 border border-gray-100 dark:border-surface-700 min-h-[500px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">
                                {isRTL ? col.labelAr : col.labelEn}
                            </h3>
                            <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-bold">
                                {colTasks.length}
                            </span>
                        </div>

                        <div className="mb-3">
                            <QuickAddTask columnStatus={col.id} isRTL={isRTL} onRefresh={onRefresh} />
                        </div>

                        <div className="space-y-3">
                            {colTasks.map((task: any) => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task)}
                                    className={`bg-white dark:bg-surface-800 rounded-xl p-3 shadow-sm border
                                        cursor-pointer hover:shadow-md transition-all group
                                        ${task.is_overdue ? 'border-red-200 dark:border-red-800/50' : 'border-gray-100 dark:border-surface-700'}
                                        ${task.priority === 'urgent' ? (isRTL ? 'border-r-4 border-r-red-500' : 'border-l-4 border-l-red-500') : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${(priorityConfig as any)[task.priority]?.className}`}>
                                            {(priorityConfig as any)[task.priority]?.icon} {(priorityConfig as any)[task.priority]?.label || task.priority}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingTask(task)} className="text-gray-400 hover:text-blue-500 text-xs">✏️</button>
                                            <button onClick={() => setDetailTask(task)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs">👁️</button>
                                        </div>
                                    </div>

                                    <div onClick={() => setDetailTask(task)}>
                                        <p className={`text-sm font-medium mb-2 ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {task.title}
                                        </p>

                                        {task.category && (
                                            <span className="inline-block text-[10px] px-2 py-0.5 rounded-md mb-2"
                                                style={{ background: `${task.color || '#10b981'}20`, color: task.color || '#10b981' }}>
                                                {task.category}
                                            </span>
                                        )}

                                        {task.due_date && (
                                            <p className={`text-xs mb-2 ${getDueDateStyle(task)}`}>
                                                📅 {getDueDateLabel(task)}
                                            </p>
                                        )}

                                        {task.related_label && (
                                            <p className="text-[10px] text-gray-400 mb-2 truncate">🔗 {task.related_label}</p>
                                        )}

                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-surface-700">
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[9px] font-bold">
                                                    {task.assignee?.name?.[0] || task.creator?.name?.[0]}
                                                </div>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[80px]">
                                                    {task.assignee?.name || task.creator?.name}
                                                </span>
                                            </div>
                                            {task.comments_count > 0 && (
                                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                                    💬 {task.comments_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
