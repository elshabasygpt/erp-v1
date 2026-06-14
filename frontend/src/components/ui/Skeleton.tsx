import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    animation?: 'pulse' | 'wave' | 'none';
}

export default function Skeleton({ 
    className = '', 
    variant = 'text',
    animation = 'pulse'
}: SkeletonProps) {
    
    const baseClass = 'bg-surface-200 dark:bg-surface-800';
    
    // Animation
    const animClass = 
        animation === 'pulse' ? 'animate-pulse' : 
        animation === 'wave' ? 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/10 before:to-transparent' : '';
    
    // Variant styles
    const variantClass = 
        variant === 'text' ? 'h-4 rounded' :
        variant === 'circular' ? 'rounded-full' :
        variant === 'rectangular' ? '' :
        'rounded-xl';

    return (
        <div 
            className={`${baseClass} ${animClass} ${variantClass} ${className}`}
        />
    );
}

// ── Common Skeleton Layouts ──

export function CardSkeleton() {
    return (
        <div className="glass-card p-5 w-full">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton variant="circular" className="w-12 h-12" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="w-3/4" />
                    <Skeleton className="w-1/2" />
                </div>
            </div>
            <Skeleton variant="rounded" className="w-full h-24 mb-4" />
            <div className="flex gap-2">
                <Skeleton className="w-1/3" />
                <Skeleton className="w-1/4" />
            </div>
        </div>
    );
}

export function TableRowSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4 border-b border-default w-full">
            <Skeleton className="w-1/4 h-5" />
            <Skeleton className="w-1/4 h-5" />
            <Skeleton className="w-1/6 h-5" />
            <Skeleton className="w-1/6 h-5" />
            <Skeleton variant="circular" className="w-8 h-8 rounded-lg ms-auto" />
        </div>
    );
}
