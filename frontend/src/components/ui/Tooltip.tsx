'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    side?: 'top' | 'bottom' | 'start' | 'end';
    className?: string;
    /** Delay before showing, ms */
    delay?: number;
}

const sideClasses: Record<NonNullable<TooltipProps['side']>, string> = {
    top: 'bottom-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mb-2',
    bottom: 'top-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mt-2',
    start: 'end-full top-1/2 -translate-y-1/2 me-2',
    end: 'start-full top-1/2 -translate-y-1/2 ms-2',
};

/**
 * Tooltip — lightweight, dependency-free. Shows on hover AND focus (keyboard
 * accessible), hides on Escape. Wraps a single focusable child.
 */
export default function Tooltip({ content, children, side = 'top', className, delay = 150 }: TooltipProps) {
    const [open, setOpen] = React.useState(false);
    const timer = React.useRef<ReturnType<typeof setTimeout>>();
    const id = React.useId();

    const show = () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setOpen(true), delay);
    };
    const hide = () => {
        clearTimeout(timer.current);
        setOpen(false);
    };

    React.useEffect(() => () => clearTimeout(timer.current), []);

    const child = React.cloneElement(children, {
        'aria-describedby': open ? id : undefined,
        onMouseEnter: show,
        onMouseLeave: hide,
        onFocus: show,
        onBlur: hide,
        onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') hide();
            children.props.onKeyDown?.(e);
        },
    });

    return (
        <span className="relative inline-flex">
            {child}
            {content != null && content !== '' && (
                <span
                    role="tooltip"
                    id={id}
                    hidden={!open}
                    className={cn(
                        'absolute z-[300] px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none shadow-lg',
                        open ? 'animate-fade-in' : '',
                        sideClasses[side],
                        className
                    )}
                    style={{
                        background: 'var(--text-heading)',
                        color: 'var(--bg-surface)',
                    }}
                >
                    {content}
                </span>
            )}
        </span>
    );
}
