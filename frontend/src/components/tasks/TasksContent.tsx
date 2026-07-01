'use client';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api';
import TaskListView from './TaskListView';
import KanbanView from './KanbanView';
import AddTaskModal from './AddTaskModal';
import TaskDetailModal from './TaskDetailModal';
import { CardSkeleton } from '@/components/ui/Skeleton';

export default function TasksContent({ dict, locale }: { dict: any, locale: string }) {
    const isRTL = locale === 'ar';
    const queryClient = useQueryClient();
    const [view, setView] = useState<'list' | 'kanban'>('list');
    const [filters, setFilters] = useState({
        view: 'mine' as 'mine' | 'assigned' | 'created' | 'all',
        status: '',
        priority: '',
        due: '' as '' | 'today' | 'overdue' | 'week' | 'upcoming',
        category: '',
        search: '',
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [detailTask, setDetailTask] = useState<any>(null);

    const { data: tasks = [], isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useQuery({
        queryKey: ['tasks', 'list', filters],
        queryFn: async () => {
            const res = await tasksApi.getTasks({ ...filters, due: filters.due || undefined, per_page: 100 });
            return res.data?.data || res.data || [];
        },
    });

    const { data: dashboard } = useQuery({
        queryKey: ['tasks', 'dashboard'],
        queryFn: async () => {
            const res = await tasksApi.getDashboard();
            return res.data?.data || res.data;
        },
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['tasks', 'categories'],
        queryFn: async () => {
            const res = await tasksApi.getCategories();
            return res.data?.data || res.data || [];
        },
    });

    const { data: users = [] } = useQuery({
        queryKey: ['tasks', 'users'],
        queryFn: async () => {
            const json = await fetch('/api/users', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
                .then(res => res.json())
                .catch(() => ({ data: [] }));
            return json.data || [];
        },
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                        ✅ {isRTL ? 'المهام' : 'Tasks'}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white dark:bg-surface-800 rounded-lg p-1 border border-gray-200 dark:border-surface-700 flex shadow-sm">
                        <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${view === 'list' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 font-bold' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-surface-700'}`}>🔲 {isRTL ? 'قائمة' : 'List'}</button>
                        <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${view === 'kanban' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 font-bold' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-surface-700'}`}>📋 {isRTL ? 'كانبان' : 'Kanban'}</button>
                    </div>
                    <button onClick={() => { setEditingTask(null); setShowAddModal(true); }} className="btn-primary flex items-center gap-2">
                        ➕ {isRTL ? 'مهمة جديدة' : 'New Task'}
                    </button>
                </div>
            </div>

            {/* KPIs */}
            {dashboard && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: isRTL ? 'للتنفيذ' : 'Todo', value: dashboard?.counts?.todo || 0, color: 'text-blue-500' },
                        { label: isRTL ? 'جاري' : 'In Progress', value: dashboard?.counts?.in_progress || 0, color: 'text-yellow-500' },
                        { label: isRTL ? 'مستحقة اليوم' : 'Due Today', value: dashboard?.counts?.due_today || 0, color: 'text-orange-500' },
                        { label: isRTL ? 'متأخرة' : 'Overdue', value: dashboard?.counts?.overdue || 0, color: 'text-red-500' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card p-4 text-center">
                            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap gap-3 items-center bg-white dark:bg-surface-800 rounded-xl border border-gray-100 dark:border-surface-700">
                <select value={filters.view} onChange={e => setFilters({ ...filters, view: e.target.value as any })} className="input-field py-1.5 text-sm w-auto">
                    <option value="mine">{isRTL ? 'مهامي (مُنشأة أو مُسندة لي)' : 'My Tasks'}</option>
                    <option value="assigned">{isRTL ? 'مُسندة لي' : 'Assigned to me'}</option>
                    <option value="created">{isRTL ? 'أنشأتها' : 'Created by me'}</option>
                    <option value="all">{isRTL ? 'الكل (للمديرين)' : 'All (Admins)'}</option>
                </select>
                <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="input-field py-1.5 text-sm w-auto">
                    <option value="">{isRTL ? 'كل الحالات' : 'All Statuses'}</option>
                    <option value="todo">{isRTL ? 'للتنفيذ' : 'Todo'}</option>
                    <option value="in_progress">{isRTL ? 'جاري' : 'In Progress'}</option>
                    <option value="done">{isRTL ? 'منجز' : 'Done'}</option>
                </select>
                <select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} className="input-field py-1.5 text-sm w-auto">
                    <option value="">{isRTL ? 'كل الأولويات' : 'All Priorities'}</option>
                    <option value="urgent">{isRTL ? 'عاجل 🔴' : 'Urgent'}</option>
                    <option value="high">{isRTL ? 'عالي 🟠' : 'High'}</option>
                    <option value="medium">{isRTL ? 'متوسط 🟡' : 'Medium'}</option>
                    <option value="low">{isRTL ? 'منخفض 🟢' : 'Low'}</option>
                </select>
                <select value={filters.due} onChange={e => setFilters({ ...filters, due: e.target.value as any })} className="input-field py-1.5 text-sm w-auto">
                    <option value="">{isRTL ? 'كل التواريخ' : 'All Dates'}</option>
                    <option value="today">{isRTL ? 'اليوم' : 'Today'}</option>
                    <option value="overdue">{isRTL ? 'متأخرة' : 'Overdue'}</option>
                    <option value="week">{isRTL ? 'هذا الأسبوع' : 'This Week'}</option>
                    <option value="upcoming">{isRTL ? 'قادم' : 'Upcoming'}</option>
                </select>
                <div className="flex-1 relative min-w-[200px]">
                    <span className="absolute left-3 top-2 text-gray-400">🔍</span>
                    <input type="text" placeholder={isRTL ? 'بحث في المهام...' : 'Search tasks...'} value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="input-field py-1.5 pl-8 text-sm w-full" />
                </div>
            </div>

            {/* Content */}
            {tasksLoading && tasks.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
            ) : tasksError ? (
                <div className="text-center p-8">
                    <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                        {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                    </p>
                    <button onClick={() => refetchTasks()} className="btn-secondary py-1.5 px-4 text-xs">
                        🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            ) : view === 'list' ? (
                <TaskListView tasks={tasks} isRTL={isRTL} onRefresh={refresh} setDetailTask={setDetailTask} setEditingTask={setEditingTask} />
            ) : (
                <KanbanView tasks={tasks} isRTL={isRTL} onRefresh={refresh} setDetailTask={setDetailTask} setEditingTask={setEditingTask} />
            )}

            {/* Modals */}
            {(showAddModal || editingTask) && (
                <AddTaskModal
                    task={editingTask}
                    users={users}
                    categories={categories}
                    isRTL={isRTL}
                    onClose={() => { setShowAddModal(false); setEditingTask(null); }}
                    onSuccess={() => { setShowAddModal(false); setEditingTask(null); refresh(); }}
                />
            )}

            {detailTask && (
                <TaskDetailModal
                    task={detailTask}
                    isRTL={isRTL}
                    onClose={() => setDetailTask(null)}
                    onRefresh={refresh}
                    onEdit={() => { setDetailTask(null); setEditingTask(detailTask); }}
                />
            )}
        </div>
    );
}
