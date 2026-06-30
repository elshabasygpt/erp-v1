'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownItem {
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    onSelect?: () => void;
    danger?: boolean;
    disabled?: boolean;
    /** Render a divider above this item */
    separated?: boolean;
}

interface DropdownProps {
    /** The clickable trigger (button/icon). Cloned with aria + onClick. */
    trigger: React.ReactElement;
    items: DropdownItem[];
    align?: 'start' | 'end';
    isRTL?: boolean;
    className?: string;
}

/**
 * Dropdown — accessible menu, dependency-free. Closes on outside-click and
 * Escape; arrow keys move between items. Replaces the scattered hand-rolled
 * "actions" popovers in list rows.
 */
export default function Dropdown({ trigger, items, align = 'end', isRTL = false, className }: DropdownProps) {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
    const menuId = React.useId();

    React.useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        // focus first enabled item
        const first = items.findIndex((i) => !i.disabled);
        if (first >= 0) requestAnimationFrame(() => itemRefs.current[first]?.focus());
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, items]);

    const onItemKey = (e: React.KeyboardEvent, index: number) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        let next = index;
        do {
            next = (next + dir + items.length) % items.length;
        } while (items[next].disabled && next !== index);
        itemRefs.current[next]?.focus();
    };

    const triggerEl = React.cloneElement(trigger, {
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
        onClick: (e: React.MouseEvent) => {
            trigger.props.onClick?.(e);
            setOpen((o) => !o);
        },
    });

    return (
        <div ref={rootRef} className="relative inline-flex">
            {triggerEl}
            {open && (
                <div
                    id={menuId}
                    role="menu"
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className={cn(
                        'absolute top-full mt-1 min-w-[10rem] z-[120] py-1 rounded-xl shadow-lg animate-scale-in',
                        align === 'end' ? 'end-0' : 'start-0',
                        className
                    )}
                    style={{
                        background: 'var(--bg-modal)',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-modal)',
                    }}
                >
                    {items.map((item, i) => (
                        <React.Fragment key={item.key}>
                            {item.separated && (
                                <div className="my-1 h-px" style={{ background: 'var(--border-light)' }} />
                            )}
                            <button
                                ref={(el) => { itemRefs.current[i] = el; }}
                                role="menuitem"
                                type="button"
                                disabled={item.disabled}
                                onClick={() => {
                                    item.onSelect?.();
                                    setOpen(false);
                                }}
                                onKeyDown={(e) => onItemKey(e, i)}
                                className={cn(
                                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-start transition-colors disabled:opacity-40 disabled:pointer-events-none hover:bg-[var(--bg-surface-hover)]'
                                )}
                                style={{ color: item.danger ? '#ef4444' : 'var(--text-primary)' }}
                            >
                                {item.icon && <span className="shrink-0">{item.icon}</span>}
                                {item.label}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
}
