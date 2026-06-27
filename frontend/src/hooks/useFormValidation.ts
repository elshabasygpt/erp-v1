import { useState, useCallback } from 'react';

type FieldValue = string | number | boolean | null | undefined;

type ValidationRule<T = FieldValue> = {
    required?: boolean | string;
    minLength?: number | { value: number; message: string };
    maxLength?: number | { value: number; message: string };
    min?: number | { value: number; message: string };
    max?: number | { value: number; message: string };
    pattern?: RegExp | { value: RegExp; message: string };
    validate?: (val: T) => string | boolean;
};

type Rules<T extends Record<string, FieldValue>> = {
    [K in keyof T]?: ValidationRule<T[K]>;
};

type Errors<T> = Partial<Record<keyof T, string>>;
type Touched<T> = Partial<Record<keyof T, boolean>>;

function validateField(value: FieldValue, rules: ValidationRule<any>): string | null {
    if (rules.required) {
        const isEmpty = value === null || value === undefined || value === '' || value === false;
        if (isEmpty) {
            return typeof rules.required === 'string' ? rules.required : 'هذا الحقل مطلوب';
        }
    }

    const strVal = String(value ?? '');

    if (rules.minLength !== undefined) {
        const min = typeof rules.minLength === 'number' ? rules.minLength : rules.minLength.value;
        const msg = typeof rules.minLength === 'object' ? rules.minLength.message : `أقل طول مسموح: ${min} أحرف`;
        if (strVal.length < min) return msg;
    }

    if (rules.maxLength !== undefined) {
        const max = typeof rules.maxLength === 'number' ? rules.maxLength : rules.maxLength.value;
        const msg = typeof rules.maxLength === 'object' ? rules.maxLength.message : `أقصى طول مسموح: ${max} أحرف`;
        if (strVal.length > max) return msg;
    }

    if (rules.min !== undefined && value !== '' && value !== null && value !== undefined) {
        const min = typeof rules.min === 'number' ? rules.min : rules.min.value;
        const msg = typeof rules.min === 'object' ? rules.min.message : `أقل قيمة مسموحة: ${min}`;
        if (Number(value) < min) return msg;
    }

    if (rules.max !== undefined && value !== '' && value !== null && value !== undefined) {
        const max = typeof rules.max === 'number' ? rules.max : rules.max.value;
        const msg = typeof rules.max === 'object' ? rules.max.message : `أقصى قيمة مسموحة: ${max}`;
        if (Number(value) > max) return msg;
    }

    if (rules.pattern !== undefined) {
        const regex = rules.pattern instanceof RegExp ? rules.pattern : rules.pattern.value;
        const msg = rules.pattern instanceof RegExp ? 'صيغة غير صحيحة' : rules.pattern.message;
        if (strVal && !regex.test(strVal)) return msg;
    }

    if (rules.validate) {
        const result = rules.validate(value);
        if (typeof result === 'string') return result;
        if (result === false) return 'قيمة غير صالحة';
    }

    return null;
}

export function useFormValidation<T extends Record<string, FieldValue>>(
    initialValues: T,
    rules: Rules<T>
) {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Errors<T>>({});
    const [touched, setTouched] = useState<Touched<T>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setValues(prev => ({ ...prev, [field]: value }));
        if (touched[field] && rules[field]) {
            const err = validateField(value as FieldValue, rules[field]!);
            setErrors(prev => ({ ...prev, [field]: err ?? undefined }));
        }
    }, [touched, rules]);

    const handleBlur = useCallback(<K extends keyof T>(field: K) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        if (rules[field]) {
            const err = validateField(values[field] as FieldValue, rules[field]!);
            setErrors(prev => ({ ...prev, [field]: err ?? undefined }));
        }
    }, [values, rules]);

    const validateAll = useCallback((): boolean => {
        const newErrors: Errors<T> = {};
        let isValid = true;
        for (const field of Object.keys(rules) as (keyof T)[]) {
            if (rules[field]) {
                const err = validateField(values[field] as FieldValue, rules[field]!);
                if (err) {
                    newErrors[field] = err;
                    isValid = false;
                }
            }
        }
        setErrors(newErrors);
        setTouched(Object.keys(rules).reduce((acc, k) => ({ ...acc, [k]: true }), {} as Touched<T>));
        return isValid;
    }, [values, rules]);

    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
        setIsSubmitting(false);
    }, [initialValues]);

    const handleSubmit = useCallback(
        (onValid: (vals: T) => Promise<void> | void) =>
            async (e?: React.FormEvent) => {
                e?.preventDefault();
                if (!validateAll()) return;
                setIsSubmitting(true);
                try {
                    await onValid(values);
                } finally {
                    setIsSubmitting(false);
                }
            },
        [validateAll, values]
    );

    const fieldProps = useCallback(<K extends keyof T>(field: K) => ({
        value: values[field],
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const raw = e.target.type === 'checkbox'
                ? (e.target as HTMLInputElement).checked
                : e.target.value;
            setValue(field, raw as T[K]);
        },
        onBlur: () => handleBlur(field),
        'aria-invalid': !!errors[field],
        'aria-describedby': errors[field] ? `${String(field)}-error` : undefined,
    }), [values, errors, setValue, handleBlur]);

    const errorProps = useCallback(<K extends keyof T>(field: K) => ({
        id: `${String(field)}-error`,
        role: 'alert' as const,
    }), []);

    return {
        values,
        errors,
        touched,
        isSubmitting,
        setValue,
        handleBlur,
        validateAll,
        reset,
        handleSubmit,
        fieldProps,
        errorProps,
        isValid: Object.keys(errors).length === 0,
    };
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[+\d\s\-()]{7,15}$/,
    positiveNumber: /^[+]?\d+(\.\d+)?$/,
    arabicText: /^[؀-ۿ\s]+$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
};
