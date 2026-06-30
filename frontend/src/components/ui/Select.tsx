'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
    options?: SelectOption[];
    /** Optional leading placeholder rendered as a disabled option */
    placeholder?: string;
    error?: boolean;
    children?: React.ReactNode;
}

/**
 * Select — styled wrapper around a native <select> (the `.select-field` class
 * already handles the chevron + RTL chevron position). Native = accessible and
 * mobile-friendly by default; the custom chevron keeps it on-brand.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ options, placeholder, error, className, children, ...props }, ref) => (
        <select
            ref={ref}
            className={cn('select-field', error && 'field-error', className)}
            aria-invalid={error || undefined}
            {...props}
        >
            {placeholder && (
                <option value="" disabled>
                    {placeholder}
                </option>
            )}
            {options
                ? options.map((o) => (
                      <option key={o.value} value={o.value} disabled={o.disabled}>
                          {o.label}
                      </option>
                  ))
                : children}
        </select>
    )
);
Select.displayName = 'Select';

export { Select };
export default Select;
