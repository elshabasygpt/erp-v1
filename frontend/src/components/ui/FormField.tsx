'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
    label?: React.ReactNode;
    /** Field id — auto-generated if omitted; wired to label + control */
    htmlFor?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    className?: string;
    /**
     * Render-prop receiving the wiring props to spread onto the control:
     * id, aria-invalid, aria-describedby. Keeps a11y correct without guessing.
     */
    children: (controlProps: {
        id: string;
        'aria-invalid'?: boolean;
        'aria-describedby'?: string;
    }) => React.ReactNode;
}

/**
 * FormField — consistent label + control + error/hint wrapper that wires up
 * `htmlFor`, `aria-invalid`, and `aria-describedby` so every form is accessible
 * and visually uniform. Replaces the bespoke label/error markup per page.
 */
export default function FormField({
    label,
    htmlFor,
    error,
    hint,
    required,
    className,
    children,
}: FormFieldProps) {
    const auto = React.useId();
    const id = htmlFor ?? auto;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            {label && (
                <label htmlFor={id} className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                    {required && <span className="text-red-500 ms-1" aria-hidden="true">*</span>}
                </label>
            )}

            {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}

            {hint && !error && (
                <p id={hintId} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} className="field-error-msg" role="alert">
                    <span aria-hidden="true">⚠</span> {error}
                </p>
            )}
        </div>
    );
}
