'use client';

import React from 'react';
import Skeleton, { CardSkeleton, TableRowSkeleton } from './Skeleton';
import EmptyState from './EmptyState';

type SkeletonKind = 'table' | 'cards' | 'lines' | 'none';

interface DataStateProps<T> {
    isLoading: boolean;
    isError?: boolean;
    error?: unknown;
    /** Treated as empty when null/undefined or an empty array */
    data?: T;
    /** Pass refetch from useQuery to enable the retry button */
    onRetry?: () => void;
    isRTL?: boolean;
    skeleton?: SkeletonKind;
    skeletonCount?: number;
    empty?: {
        icon?: string;
        title: string;
        description?: string;
        action?: { label: string; onClick: () => void };
    };
    children: (data: NonNullable<T>) => React.ReactNode;
}

function isEmpty(data: unknown): boolean {
    if (data == null) return true;
    if (Array.isArray(data)) return data.length === 0;
    return false;
}

export default function DataState<T>({
    isLoading,
    isError = false,
    error,
    data,
    onRetry,
    isRTL = false,
    skeleton = 'cards',
    skeletonCount = 3,
    empty,
    children,
}: DataStateProps<T>) {
    // 1) Loading
    if (isLoading) {
        if (skeleton === 'none') return null;

        if (skeleton === 'table') {
            return (
                <div className="w-full">
                    {Array.from({ length: skeletonCount }).map((_, i) => (
                        <TableRowSkeleton key={i} />
                    ))}
                </div>
            );
        }

        if (skeleton === 'cards') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                    {Array.from({ length: skeletonCount }).map((_, i) => (
                        <CardSkeleton key={i} />
                    ))}
                </div>
            );
        }

        // lines
        return (
            <div className="space-y-3 w-full">
                {Array.from({ length: skeletonCount }).map((_, i) => (
                    <Skeleton key={i} className={i % 2 === 0 ? 'w-full h-4' : 'w-3/4 h-4'} />
                ))}
            </div>
        );
    }

    // 2) Error + retry
    if (isError) {
        const message =
            (error as any)?.response?.data?.message ||
            (error as any)?.message ||
            (isRTL ? 'حدث خطأ أثناء تحميل البيانات' : 'Failed to load data');

        return (
            <div className="flex flex-col items-center justify-center p-10 text-center w-full min-h-[240px] animate-fade-in">
                <div
                    className="w-16 h-16 mb-4 rounded-full flex items-center justify-center text-3xl"
                    style={{ background: 'var(--bg-danger, #FCEBEB)' }}
                >
                    ⚠️
                </div>
                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {isRTL ? 'تعذّر التحميل' : 'Something went wrong'}
                </h3>
                <p className="max-w-md text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {message}
                </p>
                {onRetry && (
                    <button onClick={onRetry} className="btn-secondary px-6 py-2.5 flex items-center gap-2">
                        🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                )}
            </div>
        );
    }

    // 3) Empty
    if (isEmpty(data)) {
        if (!empty) return null;
        return (
            <EmptyState
                icon={empty.icon ?? '📭'}
                title={empty.title}
                description={empty.description ?? ''}
                action={empty.action}
                isRTL={isRTL}
            />
        );
    }

    // 4) Content
    return <>{children(data as NonNullable<T>)}</>;
}
