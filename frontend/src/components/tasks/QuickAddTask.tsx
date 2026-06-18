'use client';
import React, { useState } from 'react';
import { tasksApi } from '@/lib/api';

export default function QuickAddTask({ columnStatus, isRTL, onRefresh }: { columnStatus: string, isRTL: boolean, onRefresh: () => void }) {
    const [loading, setLoading] = useState(false);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim() && !loading) {
            const title = e.currentTarget.value.trim();
            setLoading(true);
            try {
                await tasksApi.createTask({
                    title,
                    status: columnStatus,
                });
                e.currentTarget.value = '';
                onRefresh();
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                disabled={loading}
                placeholder={isRTL ? 'اكتب المهمة واضغط Enter...' : 'Type task and press Enter...'}
                onKeyDown={handleKeyDown}
                className="w-full text-sm p-2 rounded-lg border border-dashed border-gray-300 dark:border-surface-600 bg-white dark:bg-surface-800 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none placeholder-gray-400 dark:placeholder-gray-500 transition-all text-gray-900 dark:text-gray-100"
            />
            {loading && (
                <div className={`absolute top-2.5 ${isRTL ? 'left-3' : 'right-3'}`}>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                </div>
            )}
        </div>
    );
}
