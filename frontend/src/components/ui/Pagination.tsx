'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    /** Total item count — when provided with pageSize, renders a range summary */
    totalItems?: number;
    pageSize?: number;
    isRTL?: boolean;
    className?: string;
    /** How many sibling pages to show around the current page */
    siblingCount?: number;
}

const DOTS = '…';

function range(start: number, end: number): number[] {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Builds a compact page list: 1 … 4 5 [6] 7 8 … 20 */
function usePageRange(page: number, pageCount: number, siblingCount: number): (number | string)[] {
    return React.useMemo(() => {
        const totalNumbers = siblingCount * 2 + 5; // first, last, current, 2 dots
        if (pageCount <= totalNumbers) return range(1, pageCount);

        const leftSibling = Math.max(page - siblingCount, 1);
        const rightSibling = Math.min(page + siblingCount, pageCount);
        const showLeftDots = leftSibling > 2;
        const showRightDots = rightSibling < pageCount - 1;

        if (!showLeftDots && showRightDots) {
            return [...range(1, siblingCount * 2 + 3), DOTS, pageCount];
        }
        if (showLeftDots && !showRightDots) {
            return [1, DOTS, ...range(pageCount - (siblingCount * 2 + 2), pageCount)];
        }
        return [1, DOTS, ...range(leftSibling, rightSibling), DOTS, pageCount];
    }, [page, pageCount, siblingCount]);
}

/**
 * Pagination — token-driven, RTL-aware page control.
 * Prev/Next chevrons flip automatically; arrow icons swap sides in RTL.
 */
export default function Pagination({
    page,
    pageCount,
    onPageChange,
    totalItems,
    pageSize,
    isRTL = false,
    className,
    siblingCount = 1,
}: PaginationProps) {
    const pages = usePageRange(page, pageCount, siblingCount);
    if (pageCount <= 1) return null;

    const Prev = isRTL ? ChevronRight : ChevronLeft;
    const Next = isRTL ? ChevronLeft : ChevronRight;

    const go = (p: number) => {
        const clamped = Math.min(Math.max(p, 1), pageCount);
        if (clamped !== page) onPageChange(clamped);
    };

    const navBtn =
        'min-w-9 h-9 px-2 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none';

    return (
        <nav
            className={cn('flex items-center justify-between gap-3 flex-wrap', className)}
            aria-label={isRTL ? 'تنقل الصفحات' : 'Pagination'}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {totalItems != null && pageSize != null && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {isRTL
                        ? `عرض ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)} من ${totalItems}`
                        : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)} of ${totalItems}`}
                </p>
            )}

            <ul className="flex items-center gap-1 ms-auto">
                <li>
                    <button
                        type="button"
                        className={navBtn}
                        style={{ color: 'var(--text-secondary)' }}
                        onClick={() => go(page - 1)}
                        disabled={page <= 1}
                        aria-label={isRTL ? 'الصفحة السابقة' : 'Previous page'}
                    >
                        <Prev className="w-4 h-4" />
                    </button>
                </li>

                {pages.map((p, i) =>
                    typeof p === 'string' ? (
                        <li key={`dots-${i}`} className="px-1 select-none" style={{ color: 'var(--text-muted)' }}>
                            {DOTS}
                        </li>
                    ) : (
                        <li key={p}>
                            <button
                                type="button"
                                onClick={() => go(p)}
                                aria-current={p === page ? 'page' : undefined}
                                className={navBtn}
                                style={
                                    p === page
                                        ? { background: 'var(--color-primary)', color: '#fff' }
                                        : { color: 'var(--text-secondary)' }
                                }
                            >
                                {p}
                            </button>
                        </li>
                    )
                )}

                <li>
                    <button
                        type="button"
                        className={navBtn}
                        style={{ color: 'var(--text-secondary)' }}
                        onClick={() => go(page + 1)}
                        disabled={page >= pageCount}
                        aria-label={isRTL ? 'الصفحة التالية' : 'Next page'}
                    >
                        <Next className="w-4 h-4" />
                    </button>
                </li>
            </ul>
        </nav>
    );
}
