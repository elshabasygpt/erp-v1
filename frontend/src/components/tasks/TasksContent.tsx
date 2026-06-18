'use client';
import React, { useState, useEffect } from 'react';
import { tasksApi } from '@/lib/api';
import TaskListView from './TaskListView';
import KanbanView from './KanbanView';
import AddTaskModal from './AddTaskModal';
import TaskDetailModal from './TaskDetailModal';

export default function TasksContent({ dict, locale }: { dict: any, locale: string }) {
    const isRTL = locale === 'ar';
    const [view, setView] = useState<'list' | 'kanban'>('list');
    const [tasks, setTasks] = useState<any[]>([]);
    const [dashboard, setDashboard] = useState<any>(null);
    const [filters, setFilters] = useState({
        view: 'mine' as 'mine' | 'assigned' | 'created' | 'all',
        status: '',
        priority: '',
        due: '',
        category: '',
        search: '',
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [detailTask, setDetailTask] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tasksRes, dashRes, catsRes, usersRes] = await Promise.all([
                tasksApi.getTasks({ ...filters, per_page: 100 }),
                tasksApi.getDashboard(),
                tasksApi.getCategories(),
                // In a real app we might fetch from usersApi, but assuming a generic endpoint:
                fetch('/api/users', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).catch(() => ({ data: [] }))
            ]);
            setTasks(tasksRes.data?.data || tasksRes.data || []);
            setDashboard(dashRes.data?.data || dashRes.data);
            setCategories(catsRes.data?.data || catsRes.data || []);
            setUsers(usersRes.data || []);
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

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
                <div className="grid grid-cols-4 gap-4">
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
                <select value={filters.due} onChange={e => setFilters({ ...filters, due: e.target.value })} className="input-field py-1.5 text-sm w-auto">
                    <option value="">{isRTL ? 'كل التواريخ' : 'All Dates'}</option>
                    <option value="today">{isRTL ? 'اليوم' : 'Today'}</option>
                    <option value="overdue">{isRTL ? 'متأخرة' : 'Overdue'}</option>
                    <option value="week">{isRTL ? 'هذا الأسبوع' : 'This Week'}</option>
                </select>
                <div className="flex-1 relative min-w-[200px]">
                    <span className="absolute left-3 top-2 text-gray-400">🔍</span>
                    <input type="text" placeholder={isRTL ? 'بحث في المهام...' : 'Search tasks...'} value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="input-field py-1.5 pl-8 text-sm w-full" />
                </div>
            </div>

            {/* Content */}
            {loading && tasks.length === 0 ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
            ) : view === 'list' ? (
                <TaskListView tasks={tasks} isRTL={isRTL} onRefresh={fetchData} setDetailTask={setDetailTask} setEditingTask={setEditingTask} />
            ) : (
                <KanbanView tasks={tasks} isRTL={isRTL} onRefresh={fetchData} setDetailTask={setDetailTask} setEditingTask={setEditingTask} />
            )}

            {/* Modals */}
            {(showAddModal || editingTask) && (
                <AddTaskModal
                    task={editingTask}
                    users={users}
                    categories={categories}
                    isRTL={isRTL}
                    onClose={() => { setShowAddModal(false); setEditingTask(null); }}
                    onSuccess={() => { setShowAddModal(false); setEditingTask(null); fetchData(); }}
                />
            )}

            {detailTask && (
                <TaskDetailModal
                    task={detailTask}
                    isRTL={isRTL}
                    onClose={() => setDetailTask(null)}
                    onRefresh={fetchData}
                    onEdit={() => { setDetailTask(null); setEditingTask(detailTask); }}
                />
            )}
        </div>
    );
}
