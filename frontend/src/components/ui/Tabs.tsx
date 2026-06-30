'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    /** Optional count badge shown after the label */
    count?: number;
    disabled?: boolean;
}

interface TabsProps {
    items: TabItem[];
    value: string;
    onValueChange: (key: string) => void;
    isRTL?: boolean;
    className?: string;
    /** 'line' (underline) or 'pill' (segmented) */
    variant?: 'line' | 'pill';
    'aria-label'?: string;
}

/**
 * Tabs — accessible, token-driven tab list with roving arrow-key navigation.
 * Used to replace the ad-hoc tab strips scattered across analytics/accounting pages.
 */
export default function Tabs({
    items,
    value,
    onValueChange,
    isRTL = false,
    className,
    variant = 'line',
    'aria-label': ariaLabel,
}: TabsProps) {
    const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

    const onKeyDown = (e: React.KeyboardEvent, index: number) => {
        const forward = isRTL ? 'ArrowLeft' : 'ArrowRight';
        const backward = isRTL ? 'ArrowRight' : 'ArrowLeft';
        let next = index;
        if (e.key === forward) next = (index + 1) % items.length;
        else if (e.key === backward) next = (index - 1 + items.length) % items.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = items.length - 1;
        else return;
        e.preventDefault();
        // Skip disabled tabs
        while (items[next].disabled && next !== index) next = (next + 1) % items.length;
        refs.current[next]?.focus();
        if (!items[next].disabled) onValueChange(items[next].key);
    };

    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            aria-orientation="horizontal"
            dir={isRTL ? 'rtl' : 'ltr'}
            className={cn(
                'flex items-center gap-1 overflow-x-auto',
                variant === 'line' && 'border-b',
                variant === 'pill' && 'p-1 rounded-xl',
                className
            )}
            style={
                variant === 'line'
                    ? { borderColor: 'var(--border-default)' }
                    : { background: 'var(--bg-surface-secondary)' }
            }
        >
            {items.map((item, i) => {
                const active = item.key === value;
                return (
                    <button
                        key={item.key}
                        ref={(el) => { refs.current[i] = el; }}
                        role="tab"
                        type="button"
                        aria-selected={active}
                        tabIndex={active ? 0 : -1}
                        disabled={item.disabled}
                        onClick={() => onValueChange(item.key)}
                        onKeyDown={(e) => onKeyDown(e, i)}
                        className={cn(
                            'inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none',
                            variant === 'line' && 'px-4 py-2.5 border-b-2 -mb-px',
                            variant === 'pill' && 'px-4 py-2 rounded-lg'
                        )}
                        style={
                            variant === 'line'
                                ? {
                                      borderColor: active ? 'var(--color-primary)' : 'transparent',
                                      color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
                                  }
                                : {
                                      background: active ? 'var(--bg-surface)' : 'transparent',
                                      color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
                                      boxShadow: active ? 'var(--shadow-card)' : 'none',
                                  }
                        }
                    >
                        {item.icon}
                        {item.label}
                        {item.count != null && (
                            <span
                                className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{ background: 'var(--primary-tint)', color: 'var(--color-primary)' }}
                            >
                                {item.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
