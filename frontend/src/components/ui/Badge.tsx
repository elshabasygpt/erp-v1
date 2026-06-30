import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge — token-driven status pill.
 * Mirrors the `.badge-*` classes from globals.css as a typed component so pages
 * stop hand-writing `<span className="badge badge-success">`.
 */
const badgeVariants = cva(
    'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
    {
        variants: {
            variant: {
                neutral: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
                success: 'bg-green-500/15 text-green-600 dark:text-green-400',
                warning: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
                danger: 'bg-red-500/15 text-red-600 dark:text-red-400',
                info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                primary: 'bg-primary/15 text-primary',
            },
        },
        defaultVariants: { variant: 'neutral' },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {
    /** Optional leading dot indicator */
    dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant, dot, children, ...props }, ref) => (
        <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
            {children}
        </span>
    )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
export default Badge;
